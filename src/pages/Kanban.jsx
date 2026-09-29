import { useEffect, useState } from 'react'
import { addDoc, updateDoc, deleteDoc, doc, collection, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore'
import { db, CATEGORIES, LOCATIONS } from '../lib/firebase'
import { useAuth } from '../AuthContext'
const COLS = [['backlog', 'Backlog'], ['in_progress', 'In Progress'], ['review', 'In Review / Testing'], ['completed', 'Completed']]
const PRI = ['Low', 'Medium', 'High', 'Urgent']
export default function Kanban() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([]), [members, setMembers] = useState([]), [flt, setFlt] = useState({ location: '', priority: '' })
  const [n, setN] = useState({ title: '', assigneeIds: [], priority: 'Medium', category: CATEGORIES[0], location: 'Nepal' })
  useEffect(() => onSnapshot(collection(db, 'kanban_tasks'), s => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })))), [])
  useEffect(() => onSnapshot(query(collection(db, 'users'), where('status', '==', 'active')), s => setMembers(s.docs.map(d => d.data()))), [])
  const name = id => members.find(m => m.uid === id)?.fullName || '?'
  const add = async e => { e.preventDefault(); await addDoc(collection(db, 'kanban_tasks'), { ...n, description: '', dueDate: null, status: 'backlog', createdBy: user.uid, createdAt: serverTimestamp() }); setN({ ...n, title: '' }) }
  const move = (id, status) => updateDoc(doc(db, 'kanban_tasks', id), { status })
  const shown = tasks.filter(t => (!flt.location || t.location === flt.location) && (!flt.priority || t.priority === flt.priority))
  const s = 'border rounded-lg px-2 py-1 bg-white'
  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex flex-wrap gap-2 items-center">
        <input className={s} placeholder="New task" required value={n.title} onChange={e => setN({ ...n, title: e.target.value })} />
        <select multiple className={s} value={n.assigneeIds} onChange={e => setN({ ...n, assigneeIds: [...e.target.selectedOptions].map(o => o.value) })}>
          {members.map(m => <option key={m.uid} value={m.uid}>{m.fullName}</option>)}</select>
        <select className={s} value={n.priority} onChange={e => setN({ ...n, priority: e.target.value })}>{PRI.map(p => <option key={p}>{p}</option>)}</select>
        <select className={s} value={n.location} onChange={e => setN({ ...n, location: e.target.value })}>{LOCATIONS.map(p => <option key={p}>{p}</option>)}</select>
        <button className="bg-blue-600 text-white rounded-lg px-3 py-1">Add</button>
        <span className="ml-auto text-sm">Filter:</span>
        <select className={s} value={flt.location} onChange={e => setFlt({ ...flt, location: e.target.value })}><option value="">All locations</option>{LOCATIONS.map(p => <option key={p}>{p}</option>)}</select>
        <select className={s} value={flt.priority} onChange={e => setFlt({ ...flt, priority: e.target.value })}><option value="">All priorities</option>{PRI.map(p => <option key={p}>{p}</option>)}</select>
      </form>
      <div className="grid grid-cols-4 gap-3 min-w-[900px]">
        {COLS.map(([key, label]) => (
          <div key={key} className="bg-slate-100 rounded-xl p-3 min-h-[300px]" onDragOver={e => e.preventDefault()} onDrop={e => move(e.dataTransfer.getData('id'), key)}>
            <h3 className="font-semibold mb-2">{label} <span className="text-slate-400">{shown.filter(t => t.status === key).length}</span></h3>
            {shown.filter(t => t.status === key).map(t => (
              <div key={t.id} draggable onDragStart={e => e.dataTransfer.setData('id', t.id)} className="bg-white rounded-lg p-3 mb-2 shadow-sm cursor-grab text-sm">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-slate-500">{t.priority} · {t.location}</div>
                <div className="text-xs mt-1">{(t.assigneeIds || []).map(name).join(', ')}</div>
                <button onClick={() => deleteDoc(doc(db, 'kanban_tasks', t.id))} className="text-xs text-red-500 mt-1">delete</button>
              </div>))}
          </div>))}
      </div>
    </div>)
}
