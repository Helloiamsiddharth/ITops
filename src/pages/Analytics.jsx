import { useEffect, useMemo, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ChevronDown, ChevronRight, Download, Mail } from 'lucide-react'
import { db } from '../lib/firebase'
import { useConfig } from '../ConfigContext'
import { logsToCSV, download, emailSummary, leaveOf } from '../lib/export'

const COLORS = ['#6366f1', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b']
const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const off = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d) }
const monthStart = () => { const d = new Date(); d.setDate(1); return ymd(d) }
const fmt = h => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`
const short = s => s.length > 16 ? s.slice(0, 15) + '…' : s
const group = (logs, k) => Object.entries(logs.reduce((m, l) => (m[l[k]] = (m[l[k]] || 0) + l.hoursSpent, m), {})).map(([name, hours]) => ({ name, hours: +hours.toFixed(2) }))
const cursor = { fill: 'rgba(99,102,241,.08)' }
const Empty = () => <p className="text-sm text-slate-400 py-16 text-center">No data in this range</p>
const Card = ({ t, v, sub }) => <div className="bg-white p-4 rounded-xl shadow"><div className="text-xs text-slate-500">{t}</div><div className="text-2xl font-semibold">{v}</div>{sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}</div>
const Bar1 = ({ title, data }) => (
  <div className="bg-white p-4 rounded-xl shadow"><h3 className="font-semibold mb-2">{title}</h3>
    {data.length ? <div className="h-64"><ResponsiveContainer><BarChart data={data} margin={{ left: -18 }}>
      <CartesianGrid vertical={false} strokeOpacity={0.15} /><XAxis dataKey="name" fontSize={11} interval={0} tickFormatter={short} tickLine={false} />
      <YAxis fontSize={11} tickLine={false} axisLine={false} /><Tooltip cursor={cursor} formatter={v => [`${v}h`, 'Hours']} />
      <Bar dataKey="hours" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={56} /></BarChart></ResponsiveContainer></div> : <Empty />}</div>)

export default function Analytics() {
  const cfg = useConfig(), TARGET = cfg.targetHours || 8
  const [from, setFrom] = useState(off(-6)), [to, setTo] = useState(off(0))
  const [logs, setLogs] = useState([]), [loading, setLoading] = useState(true)
  const [who, setWho] = useState(''), [open, setOpen] = useState(null), [summary, setSummary] = useState(''), [showDesc, setShowDesc] = useState(false)

  useEffect(() => { (async () => {
    setLoading(true)
    const s = await getDocs(query(collection(db, 'work_logs'), where('date', '>=', from), where('date', '<=', to)))
    setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })() }, [from, to])

  const view = who ? logs.filter(l => l.userEmail === who) : logs
  const workView = view.filter(l => !leaveOf(l))
  const leaveTotal = view.reduce((s, l) => s + leaveOf(l), 0)
  const total = workView.reduce((s, l) => s + l.hoursSpent, 0)
  const ticketHrs = workView.filter(l => l.ticketId).reduce((s, l) => s + l.hoursSpent, 0)
  const cats = group(workView, 'category').sort((a, b) => b.hours - a.hours)

  const people = useMemo(() => Object.values(logs.reduce((m, l) => {
    const r = m[l.userEmail] ||= { email: l.userEmail, hours: 0, tasks: 0, leave: 0, credit: 0, days: new Set(), udays: new Set(), cat: {} }
    const lv = leaveOf(l)
      r.udays.add(l.date)
    if (lv) { r.leave += lv; r.credit += lv * TARGET; return m }
    r.hours += l.hoursSpent; r.tasks++; r.days.add(l.date)
    r.cat[l.category] = (r.cat[l.category] || 0) + l.hoursSpent; return m }, {})).sort((a, b) => b.hours - a.hours), [logs])
  const pv = who ? people.filter(p => p.email === who) : people
  const maxH = people[0]?.hours || 1
  const credit = pv.reduce((s, p) => s + p.credit, 0)
  const utilDays = pv.reduce((s, p) => s + p.udays.size, 0) || 1
  const utilPct = Math.round((total + credit) / (utilDays * TARGET) * 100)
  const perMember = pv.filter(p => p.hours > 0).map(p => ({ name: p.email.split('@')[0], ...Object.fromEntries(Object.entries(p.cat).map(([k, v]) => [k, +v.toFixed(2)])) }))
  const btn = 'px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-100 text-sm transition'
  const timeCell = l => leaveOf(l)
    ? <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{l.entryType === 'full_leave' ? 'Full leave' : 'Half leave'} · {leaveOf(l) * TARGET}h</span> : fmt(l.hoursSpent)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <button className={btn} onClick={() => { setFrom(off(0)); setTo(off(0)) }}>Today</button>
        <button className={btn} onClick={() => { setFrom(off(-6)); setTo(off(0)) }}>7 days</button>
        <button className={btn} onClick={() => { setFrom(off(-29)); setTo(off(0)) }}>30 days</button>
        <button className={btn} onClick={() => { setFrom(monthStart()); setTo(off(0)) }}>This month</button>
        <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={btn} />
        <span className="text-slate-400">to</span>
        <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={btn} />
        <select value={who} onChange={e => setWho(e.target.value)} className={btn}>
          <option value="">Everyone</option>{people.map(p => <option key={p.email} value={p.email}>{p.email.split('@')[0]}</option>)}</select>
        <label className={btn + ' flex items-center gap-2 cursor-pointer'}><input type="checkbox" checked={showDesc} onChange={e => setShowDesc(e.target.checked)} />Show descriptions</label>
        <div className="ml-auto flex gap-2">
          <button className={btn + ' flex items-center gap-1'} onClick={() => download(`worklogs_${from}_to_${to}.csv`, logsToCSV(view, cfg.fields))}><Download size={14} />CSV / Excel</button>
          <button className={btn + ' flex items-center gap-1'} onClick={() => setSummary(emailSummary(view, `${from} to ${to}`))}><Mail size={14} />Email summary</button>
        </div>
      </div>
      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card t="Total work hours" v={total.toFixed(1)} sub={`${workView.length} entries`} />
        <Card t="Avg hrs / member" v={(total / (pv.filter(p => p.hours > 0).length || 1)).toFixed(1)} sub={`${pv.length} ${pv.length === 1 ? 'person' : 'people'}`} />
        <Card t="Utilisation" v={`${utilPct}%`} sub={`${((total + credit) / utilDays).toFixed(1)}h/day incl. ${credit}h leave`} />
        <Card t="Ticket : non-ticket" v={`${ticketHrs.toFixed(0)}h : ${(total - ticketHrs).toFixed(0)}h`} sub={`${total ? Math.round(ticketHrs / total * 100) : 0}% ticket-linked`} />
        <Card t="Leave days" v={leaveTotal} sub="half = 0.5" />
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl shadow"><h3 className="font-semibold mb-2">Category breakdown</h3>
          {cats.length ? <div className="flex items-center gap-4 flex-wrap">
            <div className="h-52 w-52 shrink-0 mx-auto"><ResponsiveContainer><PieChart><Pie data={cats} dataKey="hours" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={2} stroke="none">
              {cats.map((_, i) => <Cell key={i} fill={COLORS[i % 7]} />)}</Pie><Tooltip formatter={(v, n) => [`${v}h`, n]} /></PieChart></ResponsiveContainer></div>
            <ul className="flex-1 min-w-[200px] space-y-2 text-sm">{cats.map((c, i) => (
              <li key={c.name} className="flex items-center gap-2"><span className="size-2.5 rounded-full shrink-0" style={{ background: COLORS[i % 7] }} />
                <span className="truncate flex-1" title={c.name}>{c.name}</span>
                <span className="font-mono text-xs text-slate-500 whitespace-nowrap">{c.hours.toFixed(1)}h · {Math.round(c.hours / total * 100)}%</span></li>))}</ul>
          </div> : <Empty />}</div>
        <Bar1 title="Resolution channel" data={group(workView, 'channel')} />
        <Bar1 title="Location spread" data={group(workView, 'location')} />
        <div className="bg-white p-4 rounded-xl shadow"><h3 className="font-semibold mb-2">Member hours by category <span className="text-xs font-normal text-slate-400">(colors match the donut)</span></h3>
          {perMember.length ? <div className="h-64"><ResponsiveContainer><BarChart data={perMember} margin={{ left: -18 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.15} /><XAxis dataKey="name" fontSize={11} interval={0} tickFormatter={short} tickLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} /><Tooltip cursor={cursor} formatter={(v, n) => [`${v}h`, n]} />
            {cats.map((c, i) => <Bar key={c.name} dataKey={d => d[c.name] || 0} name={c.name} stackId="a" fill={COLORS[i % 7]} maxBarSize={56} />)}
          </BarChart></ResponsiveContainer></div> : <Empty />}</div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold mb-3">People · work logs by person</h3>
        {people.length === 0 && <p className="text-sm text-slate-400">No entries in this range.</p>}
        {people.map(p => {
          const top = Object.entries(p.cat).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
          const perDay = p.days.size ? p.hours / p.days.size : 0
          return (
            <div key={p.email} className="border-b last:border-0">
              <button onClick={() => setOpen(open === p.email ? null : p.email)} className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 rounded-lg px-2 transition">
                {open === p.email ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div className="w-40 truncate font-medium">{p.email.split('@')[0]}</div>
                {p.leave > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 whitespace-nowrap">{p.leave} leave {p.leave === 1 ? 'day' : 'days'}</span>}
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${p.hours / maxH * 100}%` }} /></div>
                <div className="w-24 text-right font-mono text-sm">{fmt(p.hours)}</div>
                <div className="w-80 text-xs text-slate-500 hidden xl:block truncate">{p.tasks} {p.tasks === 1 ? 'entry' : 'entries'} · {p.days.size} {p.days.size === 1 ? 'day' : 'days'} · {perDay.toFixed(1)}h/day · {Math.round((p.hours + p.credit) / (p.udays.size * TARGET) * 100)}% util · {top}</div>
              </button>
              {open === p.email && (
                <div className="pb-3 pl-9 overflow-x-auto">
                  <table className="w-full text-sm"><thead><tr className="text-left text-slate-500 text-xs"><th className="py-1">Date</th><th>Task</th>{showDesc && <th>Description</th>}<th>Ticket</th><th>Channel</th><th>Category</th><th>Location</th><th className="text-right">Time</th></tr></thead>
                    <tbody>{logs.filter(l => l.userEmail === p.email).sort((a, b) => b.date.localeCompare(a.date)).map(l => (
                      <tr key={l.id} className="border-t align-top"><td className="py-1.5 pr-3 whitespace-nowrap">{l.date}</td><td className="pr-3">{l.title}</td>
                        {showDesc && <td className="pr-3 min-w-[240px] max-w-md whitespace-pre-wrap text-slate-600">{l.description}</td>}
                        <td className="pr-3">{l.ticketId}</td><td className="pr-3">{l.channel}</td><td className="pr-3">{l.category}</td><td className="pr-3">{l.location}</td>
                        <td className="text-right font-mono whitespace-nowrap">{timeCell(l)}</td></tr>))}</tbody></table>
                </div>)}
            </div>) })}
      </div>

      {summary && <div className="bg-white p-4 rounded-xl shadow"><textarea readOnly className="w-full h-64 font-mono text-sm border rounded-lg p-2" value={summary} />
        <a className="text-blue-600" href={`mailto:?subject=${encodeURIComponent('IT Ops Summary')}&body=${encodeURIComponent(summary)}`}>Open in email client</a></div>}
    </div>)
}
