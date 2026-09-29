import { useEffect, useMemo, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { db } from '../lib/firebase'
import { logsToCSV, download, emailSummary } from '../lib/export'
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#64748b']
const iso = d => d.toISOString().slice(0, 10)
const group = (logs, k) => Object.entries(logs.reduce((m, l) => (m[l[k]] = (m[l[k]] || 0) + l.hoursSpent, m), {})).map(([name, hours]) => ({ name, hours: +hours.toFixed(2) }))
const Card = ({ t, v }) => <div className="bg-white p-4 rounded-xl shadow"><div className="text-xs text-slate-500">{t}</div><div className="text-2xl font-semibold">{v}</div></div>
const Bar1 = ({ title, data }) => <div className="bg-white p-4 rounded-xl shadow h-72"><h3 className="font-semibold mb-2">{title}</h3>
  <ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" fontSize={11} /><YAxis /><Tooltip /><Bar dataKey="hours" fill="#2563eb" /></BarChart></ResponsiveContainer></div>
export default function Analytics() {
  const [range, setRange] = useState(7), [logs, setLogs] = useState([]), [summary, setSummary] = useState('')
  useEffect(() => { (async () => {
    const from = iso(new Date(Date.now() - range * 864e5))
    const s = await getDocs(query(collection(db, 'work_logs'), where('date', '>=', from)))
    setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))) })() }, [range])
  const total = logs.reduce((s, l) => s + l.hoursSpent, 0)
  const ticketHrs = logs.filter(l => l.ticketId).reduce((s, l) => s + l.hoursSpent, 0)
  const members = useMemo(() => new Set(logs.map(l => l.userEmail)).size || 1, [logs])
  const perMember = useMemo(() => Object.values(logs.reduce((m, l) => { const r = m[l.userEmail] ||= { name: l.userEmail.split('@')[0], hours: 0, tasks: 0 }; r.hours += l.hoursSpent; r.tasks++; return m }, {})).map(r => ({ ...r, hours: +r.hours.toFixed(1) })), [logs])
  const cats = group(logs, 'category')
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select value={range} onChange={e => setRange(+e.target.value)} className="border rounded-lg px-2 py-1"><option value={1}>Daily</option><option value={7}>Weekly</option><option value={30}>Monthly</option></select>
        <button className="border rounded-lg px-3 py-1 bg-white" onClick={() => download(`worklogs_${iso(new Date())}.csv`, logsToCSV(logs))}>Export CSV/Excel</button>
        <button className="border rounded-lg px-3 py-1 bg-white" onClick={() => setSummary(emailSummary(logs, `last ${range} days`))}>Generate email summary</button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Card t="Total hours" v={total.toFixed(1)} /><Card t="Avg hrs / member" v={(total / members).toFixed(1)} />
        <Card t="Avg hrs / member / day" v={(total / members / range).toFixed(1)} /><Card t="Ticket : non-ticket" v={`${ticketHrs.toFixed(0)}h : ${(total - ticketHrs).toFixed(0)}h`} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl shadow h-72"><h3 className="font-semibold mb-2">Category breakdown</h3>
          <ResponsiveContainer><PieChart><Pie data={cats} dataKey="hours" innerRadius={50} outerRadius={90}>
            {cats.map((_, i) => <Cell key={i} fill={COLORS[i % 7]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
        <Bar1 title="Resolution channel" data={group(logs, 'channel')} />
        <Bar1 title="Location spread" data={group(logs, 'location')} />
        <div className="bg-white p-4 rounded-xl shadow h-72"><h3 className="font-semibold mb-2">Member productivity (hours + tasks)</h3>
          <ResponsiveContainer><BarChart data={perMember}><XAxis dataKey="name" fontSize={11} /><YAxis /><Tooltip /><Legend />
            <Bar dataKey="hours" stackId="a" fill="#2563eb" /><Bar dataKey="tasks" stackId="a" fill="#f59e0b" /></BarChart></ResponsiveContainer></div>
      </div>
      {summary && <div className="bg-white p-4 rounded-xl shadow"><textarea readOnly className="w-full h-64 font-mono text-sm" value={summary} />
        <a className="text-blue-600" href={`mailto:?subject=${encodeURIComponent('IT Ops Summary')}&body=${encodeURIComponent(summary)}`}>Open in email client</a></div>}
    </div>)
}
