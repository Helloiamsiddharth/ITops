import { useEffect, useState } from 'react'
import { addDoc, updateDoc, deleteDoc, doc, collection, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore'
import { Trash2, Eye } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../AuthContext'
import { useConfig } from '../ConfigContext'

const COLS = [['backlog', 'Backlog', 'bg-slate-400'], ['in_progress', 'In Progress', 'bg-blue-500'], ['review', 'In Review / Testing', 'bg-amber-500'], ['completed', 'Completed', 'bg-green-500']]
const PRI = ['Low', 'Medium', 'High', 'Urgent']
const PRI_CLS = { Low: 'bg-slate-100 text-slate-600', Medium: 'bg-blue-100 text-blue-700', High: 'bg-amber-100 text-amber-700', Urgent: 'bg-red-100 text-red-700' }
const ini = n => (n || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
const s = 'border rounded-xl px-3 py-2 bg-white'

export default function Kanban() {
  const { user, canWrite } = useAuth()
  const cfg = useConfig()
  const [tasks, setTasks] = useState([]), [members, setMembers] = useState([]), [over, setOver] = useState(null)
  const [flt, setFlt] = useState({ location: '', priority: '' })
  const [n, setN] = useState({ title: '', assigneeIds: [], priority: 'Medium', category: '', location: '' })
  useEffect(() => onSnapshot(collection(db, 'kanban_tasks'), x => setTasks(x.docs.map(d => ({ id: d.id, ...d.data() })))), [])
  useEffect(() => onSnapshot(query(collection(db, 'users'), where('status', '==', 'active')), x => setMembers(x.docs.map(d => d.data()))), [])
  const name = id => members.find(m => m.uid === id)?.fullName || '?'
  const toggle = id => setN({ ...n, assigneeIds: n.assigneeIds.includes(id) ? n.assigneeIds.filter(x => x !== id) : [...n.assigneeIds, id] })
  const add = async e => {
    e.preventDefault()
    await addDoc(collection(db, 'kanban_tasks'), { ...n, category: n.category || cfg.categories[0], location: n.location || cfg.locations[0],
      description: '', dueDate: null, status: 'backlog', createdBy: user.uid, createdAt: serverTimestamp() })
    setN({ ...n, title: '', assigneeIds: [] })
  }
  const move = (id, status) => id && updateDoc(doc(db, 'kanban_tasks', id), { status })
  const shown = tasks.filter(t => (!flt.location || t.location === flt.location) && (!flt.priority || t.priority === flt.priority))

  return (
    <div className="space-y-4">
      {!canWrite && <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-amber-100 text-amber-700"><Eye size={16} />You have view-only access to the team board.</div>}
      {canWrite && (
        <form onSubmit={add} className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input className={s + ' flex-1 min-w-[220px]'} placeholder="New task title…" required value={n.title} onChange={e => setN({ ...n, title: e.target.value })} />
            <select className={s} value={n.priority} onChange={e => setN({ ...n, priority: e.target.value })}>{PRI.map(p => <option key={p}>{p}</option>)}</select>
            <select className={s} value={n.location} onChange={e => setN({ ...n, location: e.target.value })}>{cfg.locations.map(p => <option key={p}>{p}</option>)}</select>
            <select className={s} value={n.category} onChange={e => setN({ ...n, category: e.target.value })}>{cfg.categories.map(p => <option key={p}>{p}</option>)}</select>
            <button className="bg-blue-600 text-white rounded-xl px-5">Add task</button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-slate-500">Assign to:</span>
            {members.map(m => <button type="button" key={m.uid} onClick={() => toggle(m.uid)}
              className={`px-3 py-1 rounded-full border ${n.assigneeIds.includes(m.uid) ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-slate-100'}`}>{m.fullName}</button>)}</div>
        </form>)}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Filter:</span>
        <select className={s} value={flt.location} onChange={e => setFlt({ ...flt, location: e.target.value })}><option value="">All locations</option>{cfg.locations.map(p => <option key={p}>{p}</option>)}</select>
        <select className={s} value={flt.priority} onChange={e => setFlt({ ...flt, priority: e.target.value })}><option value="">All priorities</option>{PRI.map(p => <option key={p}>{p}</option>)}</select>
      </div>

      <div className="overflow-x-auto pb-2"><div className="grid grid-cols-4 gap-3 min-w-[900px]">
        {COLS.map(([key, label, dot]) => {
          const list = shown.filter(t => t.status === key)
          return (
            <div key={key} onDragOver={e => { e.preventDefault(); setOver(key) }} onDrop={e => { if (canWrite) move(e.dataTransfer.getData('id'), key); setOver(null) }}
              className={`rounded-2xl p-3 min-h-[320px] transition bg-slate-100/70 dark:bg-white/5 ${over === key ? 'ring-2 ring-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><span className={`size-2.5 rounded-full ${dot}`} />{label}<span className="ml-auto text-xs font-normal text-slate-400">{list.length}</span></h3>
              {list.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Nothing here</p>}
              {list.map(t => (
                <div key={t.id} draggable={canWrite} onDragStart={e => e.dataTransfer.setData('id', t.id)} onDragEnd={() => setOver(null)} className="bg-white rounded-xl p-3 mb-2 shadow-sm text-sm">
                  <div className="flex justify-between gap-2"><span className="font-medium">{t.title}</span>
                    {canWrite && <button onClick={() => confirm(`Delete "${t.title}"?`) && deleteDoc(doc(db, 'kanban_tasks', t.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full ${PRI_CLS[t.priority]}`}>{t.priority}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100">{t.location}</span></div>
                  <div className="flex -space-x-1.5 mt-2">{(t.assigneeIds || []).map(id => (
                    <span key={id} title={name(id)} className="grid place-items-center size-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white text-[10px] font-bold ring-2 ring-white dark:ring-[#111b31]">{ini(name(id))}</span>))}</div>
                </div>))}
            </div>) })}
      </div></div>
    </div>)
}
