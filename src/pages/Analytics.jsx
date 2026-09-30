import { useEffect, useMemo, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { ChevronDown, ChevronRight, Download, Mail } from 'lucide-react'
import { db } from '../lib/firebase'
import { logsToCSV, download, emailSummary } from '../lib/export'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#64748b']
const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const off = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d) }
const monthStart = () => { const d = new Date(); d.setDate(1); return ymd(d) }
const fmt = h => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`
const group = (logs, k) => Object.entries(logs.reduce((m, l) => (m[l[k]] = (m[l[k]] || 0) + l.hoursSpent, m), {})).map(([name, hours]) => ({ name, hours: +hours.toFixed(2) }))
const Card = ({ t, v }) => <div className="bg-white p-4 rounded-xl shadow"><div className="text-xs text-slate-500">{t}</div><div className="text-2xl font-semibold">{v}</div></div>
const Bar1 = ({ title, data }) => <div className="bg-white p-4 rounded-xl shadow h-72"><h3 className="font-semibold mb-2">{title}</h3>
  <ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" fontSize={11} /><YAxis /><Tooltip /><Bar dataKey="hours" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>

export default function Analytics() {
  const [from, setFrom] = useState(off(-6)), [to, setTo] = useState(off(0))
  const [logs, setLogs] = useState([]), [loading, setLoading] = useState(true)
  const [who, setWho] = useState(''), [open, setOpen] = useState(null), [summary, setSummary] = useState('')

  useEffect(() => { (async () => {
    setLoading(true)
    const s = await getDocs(query(collection(db, 'work_logs'), where('date', '>=', from), where('date', '<=', to)))
    setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })() }, [from, to])

  const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 864e5) + 1)
  const view = who ? logs.filter(l => l.userEmail === who) : logs
  const total = view.reduce((s, l) => s + l.hoursSpent, 0)
  const ticketHrs = view.filter(l => l.ticketId).reduce((s, l) => s + l.hoursSpent, 0)
  const nMembers = new Set(view.map(l => l.userEmail)).size || 1
  const cats = group(view, 'category')

  const people = useMemo(() => Object.values(logs.reduce((m, l) => {
    const r = m[l.userEmail] ||= { email: l.userEmail, hours: 0, tasks: 0, ticket: 0, days: new Set(), cat: {} }
    r.hours += l.hoursSpent; r.tasks++; r.days.add(l.date); if (l.ticketId) r.ticket += l.hoursSpent
    r.cat[l.category] = (r.cat[l.category] || 0) + l.hoursSpent; return m }, {})).sort((a, b) => b.hours - a.hours), [logs])
  const maxH = people[0]?.hours || 1
  const perMember = people.map(p => ({ name: p.email.split('@')[0], hours: +p.hours.toFixed(1), tasks: p.tasks }))

  const presets = [['Today', 0, 0], ['7 days', -6, 0], ['30 days', -29, 0]]
  const btn = 'px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-100 text-sm transition'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {presets.map(([l, a, b]) => <button key={l} className={btn} onClick={() => { setFrom(off(a)); setTo(off(b)) }}>{l}</button>)}
        <button className={btn} onClick={() => { setFrom(monthStart()); setTo(off(0)) }}>This month</button>
        <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={btn} />
        <span className="text-slate-400">to</span>
        <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={btn} />
        <select value={who} onChange={e => setWho(e.target.value)} className={btn}>
          <option value="">Everyone</option>{people.map(p => <option key={p.email} value={p.email}>{p.email.split('@')[0]}</option>)}</select>
        <div className="ml-auto flex gap-2">
          <button className={btn + ' flex items-center gap-1'} onClick={() => download(`worklogs_${from}_to_${to}.csv`, logsToCSV(view))}><Download size={14} />CSV / Excel</button>
          <button className={btn + ' flex items-center gap-1'} onClick={() => setSummary(emailSummary(view, `${from} to ${to}`))}><Mail size={14} />Email summary</button>
        </div>
      </div>
      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card t="Total hours" v={total.toFixed(1)} /><Card t="Avg hrs / member" v={(total / nMembers).toFixed(1)} />
        <Card t="Avg hrs / member / day" v={(total / nMembers / days).toFixed(1)} /><Card t="Ticket : non-ticket" v={`${ticketHrs.toFixed(0)}h : ${(total - ticketHrs).toFixed(0)}h`} /></div>

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl shadow h-72"><h3 className="font-semibold mb-2">Category breakdown</h3>
          <ResponsiveContainer><PieChart><Pie data={cats} dataKey="hours" nameKey="name" innerRadius={50} outerRadius={90}>
            {cats.map((_, i) => <Cell key={i} fill={COLORS[i % 7]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
        <Bar1 title="Resolution channel" data={group(view, 'channel')} />
        <Bar1 title="Location spread" data={group(view, 'location')} />
        <div className="bg-white p-4 rounded-xl shadow h-72"><h3 className="font-semibold mb-2">Member productivity (hours + tasks)</h3>
          <ResponsiveContainer><BarChart data={perMember}><XAxis dataKey="name" fontSize={11} /><YAxis /><Tooltip /><Legend />
            <Bar dataKey="hours" stackId="a" fill="#2563eb" /><Bar dataKey="tasks" stackId="a" fill="#f59e0b" /></BarChart></ResponsiveContainer></div>
      </div>

      {/* Person-wise work logs */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold mb-3">People · work logs by person</h3>
        {people.length === 0 && <p className="text-sm text-slate-400">No entries in this range.</p>}
        {people.map(p => (
          <div key={p.email} className="border-b last:border-0">
            <button onClick={() => setOpen(open === p.email ? null : p.email)} className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 rounded-lg px-2 transition">
              {open === p.email ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <div className="w-40 truncate font-medium">{p.email.split('@')[0]}</div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${p.hours / maxH * 100}%` }} /></div>
              <div className="w-24 text-right font-mono text-sm">{fmt(p.hours)}</div>
              <div className="w-56 text-xs text-slate-500 hidden md:block">{p.tasks} entries · {p.days.size} days · {(p.hours / p.days.size).toFixed(1)}h/day · {Object.entries(p.cat).sort((a, b) => b[1] - a[1])[0][0].split(' ')[0]}</div>
            </button>
            {open === p.email && (
              <div className="pb-3 pl-9 overflow-x-auto">
                <table className="w-full text-sm"><thead><tr className="text-left text-slate-500 text-xs"><th className="py-1">Date</th><th>Task</th><th>Ticket</th><th>Channel</th><th>Category</th><th>Location</th><th className="text-right">Time</th></tr></thead>
                  <tbody>{logs.filter(l => l.userEmail === p.email).sort((a, b) => b.date.localeCompare(a.date)).map(l => (
                    <tr key={l.id} className="border-t"><td className="py-1.5 pr-3 whitespace-nowrap">{l.date}</td><td className="pr-3">{l.title}</td><td className="pr-3">{l.ticketId}</td>
                      <td className="pr-3">{l.channel}</td><td className="pr-3">{l.category}</td><td className="pr-3">{l.location}</td><td className="text-right font-mono">{fmt(l.hoursSpent)}</td></tr>))}</tbody></table>
              </div>)}
          </div>))}
      </div>

      {summary && <div className="bg-white p-4 rounded-xl shadow"><textarea readOnly className="w-full h-64 font-mono text-sm" value={summary} />
        <a className="text-blue-600" href={`mailto:?subject=${encodeURIComponent('IT Ops Summary')}&body=${encodeURIComponent(summary)}`}>Open in email client</a></div>}
    </div>)
}
