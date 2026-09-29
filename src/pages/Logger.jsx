import { useEffect, useState } from 'react'
import { addDoc, collection, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db, CHANNELS, CATEGORIES, LOCATIONS } from '../lib/firebase'
import { useAuth } from '../AuthContext'
const today = () => new Date().toISOString().slice(0, 10)
export default function Logger() {
  const { user, profile } = useAuth()
  const blank = { title: '', description: '', ticketId: '', channel: CHANNELS[3], category: CATEGORIES[0], location: profile.location || 'Nepal', h: 0, m: 30, date: today() }
  const [f, setF] = useState(blank), [logs, setLogs] = useState([])
  const set = k => e => setF({ ...f, [k]: e.target.value })
  useEffect(() => onSnapshot(query(collection(db, 'work_logs'), where('userId', '==', user.uid), orderBy('date', 'desc'), limit(30)),
    s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error('Open the index link in this error to create it:', e)), [user.uid])
  const submit = async e => { e.preventDefault()
    const hoursSpent = +f.h + +f.m / 60; if (!hoursSpent) return
    const { h, m, ...rest } = f
    await addDoc(collection(db, 'work_logs'), { ...rest, hoursSpent, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() })
    setF({ ...blank, location: f.location }) }
  const inp = 'border rounded-lg px-3 py-2 w-full bg-white'
  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={submit} className="bg-white p-5 rounded-xl shadow grid grid-cols-2 gap-3">
        <h2 className="col-span-2 font-semibold">Log work</h2>
        <input className={inp + ' col-span-2'} placeholder="Task title" required value={f.title} onChange={set('title')} />
        <textarea className={inp + ' col-span-2'} placeholder="Description" value={f.description} onChange={set('description')} />
        <input className={inp} placeholder="Ticket ID (e.g. INC-8921)" value={f.ticketId} onChange={set('ticketId')} />
        <input className={inp} type="date" value={f.date} onChange={set('date')} />
        <select className={inp} value={f.channel} onChange={set('channel')}>{CHANNELS.map(c => <option key={c}>{c}</option>)}</select>
        <select className={inp} value={f.location} onChange={set('location')}>{LOCATIONS.map(c => <option key={c}>{c}</option>)}</select>
        <select className={inp + ' col-span-2'} value={f.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        <div className="flex gap-2 items-center"><input className={inp} type="number" min="0" max="24" value={f.h} onChange={set('h')} />h
          <input className={inp} type="number" min="0" max="59" value={f.m} onChange={set('m')} />m</div>
        <button className="bg-blue-600 text-white rounded-lg">Save entry</button>
      </form>
      <ul className="space-y-2">{logs.map(l => (
        <li key={l.id} className="bg-white p-3 rounded-lg shadow-sm text-sm flex justify-between">
          <span><b>{l.title}</b> {l.ticketId && <code className="bg-slate-100 px-1 rounded">{l.ticketId}</code>}<br />
            <span className="text-slate-500">{l.date} · {l.channel} · {l.category} · {l.location}</span></span>
          <span className="font-mono">{l.hoursSpent.toFixed(2)}h</span></li>))}</ul>
    </div>)
}
