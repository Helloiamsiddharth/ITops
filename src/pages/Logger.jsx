import { useEffect, useMemo, useState } from 'react'
import { addDoc, updateDoc, deleteDoc, doc, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../AuthContext'
import { useConfig } from '../ConfigContext'

const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const sum = a => (a || []).reduce((s, l) => s + l.hoursSpent, 0)
const fmt = h => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`
const withCur = (list, cur) => cur && !list.includes(cur) ? [...list, cur] : list
const inp = 'border rounded-xl px-3 py-2 w-full bg-white'
const Field = ({ label, span, children }) => (
  <label className={`block ${span ? 'col-span-2' : ''}`}><span className="text-xs font-medium text-slate-500 mb-1 block">{label}</span>{children}</label>)

export default function Logger() {
  const { user, profile } = useAuth()
  const cfg = useConfig(), TARGET = cfg.targetHours || 8
  const heat = h => !h ? 'bg-white hover:bg-slate-50' : h < TARGET / 2 ? 'bg-blue-100 hover:bg-blue-200' : h < TARGET ? 'bg-blue-300 hover:bg-blue-400' : 'bg-blue-600 text-white hover:bg-blue-700'
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
  const dayLogs = [...(byDate[sel] || [])].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
  const dayHrs = sum(dayLogs)

  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => `${prefix}-${pad(i + 1)}`)]
  const shift = n => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  const blank = date => ({ title: '', description: '', ticketId: '', extra: {},
    channel: cfg.channels.includes('Ticket System') ? 'Ticket System' : cfg.channels[0],
    category: cfg.categories[0], location: cfg.locations.includes(profile.location) ? profile.location : cfg.locations[0], h: 0, m: 30, date })
  const edit = l => setForm({ ...l, extra: l.extra || {}, h: Math.floor(l.hoursSpent), m: Math.round((l.hoursSpent % 1) * 60) })
  const ex = form?.extra || {}
  const setEx = (k, v) => setForm({ ...form, extra: { ...ex, [k]: v } })

  const save = async e => {
    e.preventDefault()
    const { id, h, m, createdAt, updatedAt, userId, userEmail, ...data } = form
    const hoursSpent = +h + +m / 60
    if (!data.title.trim() || !hoursSpent) return flash('Title and time spent are required')
    const miss = cfg.fields.find(f => f.required && f.type !== 'checkbox' && (ex[f.key] === undefined || ex[f.key] === ''))
    if (miss) return flash(`"${miss.label}" is required`)
    const extra = Object.fromEntries(Object.entries(ex).filter(([, v]) => v !== '' && v !== undefined)
      .map(([k, v]) => [k, cfg.fields.find(f => f.key === k)?.type === 'number' ? +v : v]))
    try {
      if (id) await updateDoc(doc(db, 'work_logs', id), { ...data, extra, hoursSpent, updatedAt: serverTimestamp() })
      else await addDoc(collection(db, 'work_logs'), { ...data, extra, hoursSpent, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() })
      setSel(data.date); setMonth(new Date(+data.date.slice(0, 4), +data.date.slice(5, 7) - 1, 1))
      setForm(null); flash(id ? 'Entry updated' : 'Entry added')
    } catch (x) { flash(x.message) }
  }
  const remove = async l => { if (confirm(`Delete "${l.title}"?`)) { await deleteDoc(doc(db, 'work_logs', l.id)); flash('Entry deleted') } }
  const set = k => e => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}
      <div className="grid grid-cols-3 gap-3">
        {[['This month', fmt(monthHrs)], ['Days logged', daysLogged], ['Ticket-linked', fmt(ticketHrs)]].map(([t, v]) =>
          <div key={t} className="bg-white rounded-xl shadow p-4"><div className="text-xs text-slate-500">{t}</div><div className="text-2xl font-semibold">{v}</div></div>)}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
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
            <span className="px-2 rounded bg-blue-100">&lt;{TARGET / 2}h</span><span className="px-2 rounded bg-blue-300">{TARGET / 2}–{TARGET}h</span><span className="px-2 rounded bg-blue-600 text-white">{TARGET}h+</span></div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{new Date(sel + 'T00:00').toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
            <button onClick={() => setForm(blank(sel))} className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm"><Plus size={14} />Add</button>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Utilisation</span><span>{fmt(dayHrs)} / {TARGET}h ({Math.round(dayHrs / TARGET * 100)}%)</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all ${dayHrs >= TARGET ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, dayHrs / TARGET * 100)}%` }} /></div>
          </div>
          {dayLogs.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No entries. Click Add to log work for this day.</p>}
          {dayLogs.map(l => (
            <div key={l.id} className="border rounded-lg p-3 text-sm hover:shadow-sm transition">
              <div className="flex justify-between gap-2"><b>{l.title}</b><span className="font-mono text-slate-600 whitespace-nowrap">{fmt(l.hoursSpent)}</span></div>
              {l.ticketId && <code className="bg-slate-100 px-1 rounded text-xs">{l.ticketId}</code>}
              {l.description && <p className="text-slate-600 mt-1">{l.description}</p>}
              <p className="text-xs text-slate-500 mt-1">{l.channel} · {l.category} · {l.location}</p>
              {Object.entries(l.extra || {}).length > 0 && <div className="flex flex-wrap gap-1 mt-1">{Object.entries(l.extra).map(([k, v]) =>
                <span key={k} className="text-[11px] bg-slate-100 rounded px-1.5 py-0.5">{cfg.fields.find(f => f.key === k)?.label || k}: {v === true ? 'Yes' : String(v)}</span>)}</div>}
              <div className="flex gap-3 mt-2 text-xs">
                <button onClick={() => edit(l)} className="flex items-center gap-1 text-blue-600"><Pencil size={12} />Edit</button>
                <button onClick={() => remove(l)} className="flex items-center gap-1 text-red-600"><Trash2 size={12} />Delete</button>
              </div>
            </div>))}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40" onClick={() => setForm(null)}>
          <form onSubmit={save} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-xl p-5 w-full max-w-xl grid grid-cols-2 gap-3 max-h-[90vh] overflow-y-auto">
            <div className="col-span-2 flex justify-between items-center"><h2 className="font-semibold">{form.id ? 'Edit entry' : 'New entry'}</h2>
              <button type="button" onClick={() => setForm(null)}><X size={18} /></button></div>
            <Field label="Task title *" span><input className={inp} autoFocus value={form.title} onChange={set('title')} /></Field>
            <Field label="Description" span><textarea className={inp} rows={3} value={form.description} onChange={set('description')} /></Field>
            <Field label="Ticket ID"><input className={inp} placeholder="INC-8921" value={form.ticketId} onChange={set('ticketId')} /></Field>
            <Field label="Date"><input className={inp} type="date" value={form.date} onChange={set('date')} /></Field>
            <Field label="Resolution channel"><select className={inp} value={form.channel} onChange={set('channel')}>{withCur(cfg.channels, form.channel).map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Work location"><select className={inp} value={form.location} onChange={set('location')}>{withCur(cfg.locations, form.location).map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Category" span><select className={inp} value={form.category} onChange={set('category')}>{withCur(cfg.categories, form.category).map(c => <option key={c}>{c}</option>)}</select></Field>
            {cfg.fields.map(f => (
              <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
                {f.type === 'select'
                  ? <select className={inp} value={ex[f.key] ?? ''} onChange={e => setEx(f.key, e.target.value)}><option value="">—</option>{withCur(f.options, ex[f.key]).map(o => <option key={o}>{o}</option>)}</select>
                  : f.type === 'checkbox'
                    ? <input type="checkbox" className="size-5 mt-2" checked={!!ex[f.key]} onChange={e => setEx(f.key, e.target.checked)} />
                    : <input className={inp} type={f.type} value={ex[f.key] ?? ''} onChange={e => setEx(f.key, e.target.value)} />}
              </Field>))}
            <div className="flex gap-2 items-end">
              <Field label="Hours"><input className={inp} type="number" min="0" max="24" value={form.h} onChange={set('h')} /></Field>
              <Field label="Minutes"><input className={inp} type="number" min="0" max="59" value={form.m} onChange={set('m')} /></Field>
            </div>
            <button className="bg-blue-600 text-white rounded-xl self-end py-2.5">{form.id ? 'Save changes' : 'Add entry'}</button>
          </form>
        </div>)}
    </div>)
}
