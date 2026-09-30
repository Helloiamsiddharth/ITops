import { useEffect, useMemo, useState } from 'react'
import { addDoc, updateDoc, deleteDoc, doc, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X } from 'lucide-react'
import { db, CHANNELS, CATEGORIES, LOCATIONS } from '../lib/firebase'
import { useAuth } from '../AuthContext'

const TARGET = 8 // daily utilisation target (hours)
const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const sum = a => (a || []).reduce((s, l) => s + l.hoursSpent, 0)
const fmt = h => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`
const heat = h => !h ? 'bg-white hover:bg-slate-50' : h < 4 ? 'bg-blue-100 hover:bg-blue-200' : h < TARGET ? 'bg-blue-300 hover:bg-blue-400' : 'bg-blue-600 text-white hover:bg-blue-700'

export default function Logger() {
  const { user, profile } = useAuth()
  const [logs, setLogs] = useState([]), [toast, setToast] = useState(''), [form, setForm] = useState(null)
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [sel, setSel] = useState(ymd(new Date()))
  const flash = t => { setToast(t); setTimeout(() => setToast(''), 2500) }

  useEffect(() => onSnapshot(query(collection(db, 'work_logs'), where('userId', '==', user.uid)),
    s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => flash(e.message)), [user.uid])

  const byDate = useMemo(() => logs.reduce((m, l) => ((m[l.date] ||= []).push(l), m), {}), [logs])
  const prefix = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`
  const monthLogs = logs.filter(l => l.date?.startsWith(prefix))
  const monthHrs = sum(monthLogs), daysLogged = new Set(monthLogs.map(l => l.date)).size
  const ticketHrs = sum(monthLogs.filter(l => l.ticketId))
  const dayLogs = (byDate[sel] || []).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
  const dayHrs = sum(dayLogs)

  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => `${prefix}-${pad(i + 1)}`)]
  const shift = n => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  const blank = date => ({ title: '', description: '', ticketId: '', channel: CHANNELS[3], category: CATEGORIES[0], location: profile.location || 'Nepal', h: 0, m: 30, date })
  const edit = l => setForm({ ...l, h: Math.floor(l.hoursSpent), m: Math.round((l.hoursSpent % 1) * 60) })

  const save = async e => {
    e.preventDefault()
    const { id, h, m, createdAt, updatedAt, userId, userEmail, ...data } = form
    const hoursSpent = +h + +m / 60
    if (!data.title.trim() || !hoursSpent) return flash('Title and time spent are required')
    try {
      if (id) await updateDoc(doc(db, 'work_logs', id), { ...data, hoursSpent, updatedAt: serverTimestamp() })
      else await addDoc(collection(db, 'work_logs'), { ...data, hoursSpent, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() })
      setSel(data.date); setMonth(new Date(+data.date.slice(0, 4), +data.date.slice(5, 7) - 1, 1))
      setForm(null); flash(id ? 'Entry updated' : 'Entry added')
    } catch (x) { flash(x.message) }
  }
  const remove = async l => { if (confirm(`Delete "${l.title}"?`)) { await deleteDoc(doc(db, 'work_logs', l.id)); flash('Entry deleted') } }
  const set = k => e => setForm({ ...form, [k]: e.target.value })
  const inp = 'border rounded-lg px-3 py-2 w-full bg-white focus:ring-2 focus:ring-blue-400 outline-none'

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}
      <div className="grid grid-cols-3 gap-3">
        {[['This month', fmt(monthHrs)], ['Days logged', daysLogged], ['Ticket-linked', fmt(ticketHrs)]].map(([t, v]) =>
          <div key={t} className="bg-white rounded-xl shadow p-4"><div className="text-xs text-slate-500">{t}</div><div className="text-2xl font-semibold">{v}</div></div>)}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Calendar */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">{month.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-1">
              <button onClick={() => shift(-1)} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} /></button>
              <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSel(ymd(d)) }} className="px-3 rounded-lg hover:bg-slate-100 text-sm">Today</button>
              <button onClick={() => shift(1)} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => d ? (() => { const h = sum(byDate[d]); return (
              <button key={d} onClick={() => setSel(d)}
                className={`h-16 rounded-lg border text-left p-1.5 transition ${heat(h)} ${d === sel ? 'ring-2 ring-offset-1 ring-indigo-500' : ''} ${d === ymd(new Date()) ? 'border-indigo-500' : 'border-slate-200'}`}>
                <div className="text-xs font-medium">{+d.slice(8)}</div>
                {h > 0 && <div className="text-[11px] mt-1">{h.toFixed(1)}h · {byDate[d].length}</div>}
              </button>) })() : <div key={i} />)}
          </div>
          <div className="flex gap-3 text-xs text-slate-500 mt-3 items-center">Utilisation:
            <span className="px-2 rounded bg-blue-100">&lt;4h</span><span className="px-2 rounded bg-blue-300">4–{TARGET}h</span><span className="px-2 rounded bg-blue-600 text-white">{TARGET}h+</span></div>
        </div>

        {/* Day panel */}
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{new Date(sel + 'T00:00').toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
            <button onClick={() => setForm(blank(sel))} className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-blue-700"><Plus size={14} />Add</button>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Utilisation</span><span>{fmt(dayHrs)} / {TARGET}h ({Math.round(dayHrs / TARGET * 100)}%)</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all ${dayHrs >= TARGET ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, dayHrs / TARGET * 100)}%` }} /></div>
          </div>
          {dayLogs.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No entries. Click Add to log work for this day.</p>}
          {dayLogs.map(l => (
            <div key={l.id} className="border rounded-lg p-3 text-sm hover:shadow-sm transition">
              <div className="flex justify-between gap-2"><b>{l.title}</b><span className="font-mono text-slate-600">{fmt(l.hoursSpent)}</span></div>
              {l.ticketId && <code className="bg-slate-100 px-1 rounded text-xs">{l.ticketId}</code>}
              {l.description && <p className="text-slate-600 mt-1">{l.description}</p>}
              <p className="text-xs text-slate-500 mt-1">{l.channel} · {l.category} · {l.location}</p>
              <div className="flex gap-3 mt-2 text-xs">
                <button onClick={() => edit(l)} className="flex items-center gap-1 text-blue-600"><Pencil size={12} />Edit</button>
                <button onClick={() => remove(l)} className="flex items-center gap-1 text-red-600"><Trash2 size={12} />Delete</button>
              </div>
            </div>))}
        </div>
      </div>

      {/* Add / Edit modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40" onClick={() => setForm(null)}>
          <form onSubmit={save} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-xl p-5 w-full max-w-xl grid grid-cols-2 gap-3 max-h-[90vh] overflow-y-auto">
            <div className="col-span-2 flex justify-between items-center"><h2 className="font-semibold">{form.id ? 'Edit entry' : 'New entry'}</h2>
              <button type="button" onClick={() => setForm(null)}><X size={18} /></button></div>
            <input className={inp + ' col-span-2'} placeholder="Task title" autoFocus value={form.title} onChange={set('title')} />
            <textarea className={inp + ' col-span-2'} rows={3} placeholder="Description" value={form.description} onChange={set('description')} />
            <input className={inp} placeholder="Ticket ID (INC-8921)" value={form.ticketId} onChange={set('ticketId')} />
            <input className={inp} type="date" value={form.date} onChange={set('date')} />
            <select className={inp} value={form.channel} onChange={set('channel')}>{CHANNELS.map(c => <option key={c}>{c}</option>)}</select>
            <select className={inp} value={form.location} onChange={set('location')}>{LOCATIONS.map(c => <option key={c}>{c}</option>)}</select>
            <select className={inp + ' col-span-2'} value={form.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            <div className="flex gap-2 items-center"><input className={inp} type="number" min="0" max="24" value={form.h} onChange={set('h')} />h
              <input className={inp} type="number" min="0" max="59" value={form.m} onChange={set('m')} />m</div>
            <button className="bg-blue-600 text-white rounded-lg hover:bg-blue-700">{form.id ? 'Save changes' : 'Add entry'}</button>
          </form>
        </div>)}
    </div>)
}
