import { useEffect, useMemo, useState } from 'react'
import { addDoc, updateDoc, deleteDoc, doc, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Palmtree } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../AuthContext'
import { useConfig } from '../ConfigContext'
import { leaveOf } from '../lib/export'

const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const sum = a => (a || []).reduce((s, l) => s + l.hoursSpent, 0)
const leaveSum = a => (a || []).reduce((s, l) => s + leaveOf(l), 0)
const fmt = h => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`
const withCur = (list, cur) => cur && !list.includes(cur) ? [...list, cur] : list
const inp = 'border rounded-xl px-3 py-2 w-full bg-white'
const TYPES = [['work', 'Work'], ['half_leave', 'Half-day leave'], ['full_leave', 'Full-day leave']]
const Field = ({ label, span, children }) => (
  <label className={`block ${span ? 'col-span-2' : ''}`}><span className="text-xs font-medium text-slate-500 mb-1 block">{label}</span>{children}</label>)

export default function Logger() {
  const { user, profile } = useAuth()
  const cfg = useConfig(), TARGET = cfg.targetHours || 8
  const heat = (h, cap) => !h ? 'bg-white hover:bg-slate-50' : h < cap / 2 ? 'bg-blue-100 hover:bg-blue-200' : h < cap ? 'bg-blue-300 hover:bg-blue-400' : 'bg-blue-600 text-white hover:bg-blue-700'
  const [logs, setLogs] = useState([]), [toast, setToast] = useState(''), [form, setForm] = useState(null)
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [sel, setSel] = useState(ymd(new Date()))
  const flash = t => { setToast(t); setTimeout(() => setToast(''), 2500) }

  useEffect(() => onSnapshot(query(collection(db, 'work_logs'), where('userId', '==', user.uid)),
    s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => flash(e.message)), [user.uid])

  const byDate = useMemo(() => logs.reduce((m, l) => ((m[l.date] ||= []).push(l), m), {}), [logs])
  const prefix = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`
  const monthLogs = logs.filter(l => l.date?.startsWith(prefix))
  const monthHrs = sum(monthLogs), leaveDays = leaveSum(monthLogs)
  const daysLogged = new Set(monthLogs.filter(l => !leaveOf(l)).map(l => l.date)).size
  const ticketHrs = sum(monthLogs.filter(l => l.ticketId))
  const dayLogs = [...(byDate[sel] || [])].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
  const dayHrs = sum(dayLogs), dayLeave = leaveSum(dayLogs)
  const cap = Math.max(0, TARGET * (1 - dayLeave))

  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => `${prefix}-${pad(i + 1)}`)]
  const shift = n => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  const blank = date => ({ entryType: 'work', title: '', description: '', hasTicket: false, ticketId: '', extra: {},
    channel: cfg.channels.includes('Ticket System') ? 'Ticket System' : cfg.channels[0],
    category: cfg.categories[0], location: cfg.locations.includes(profile.location) ? profile.location : cfg.locations[0], h: 0, m: 30, date })
  const edit = l => setForm({ ...l, entryType: l.entryType || 'work', hasTicket: !!l.ticketId, extra: l.extra || {}, h: Math.floor(l.hoursSpent), m: Math.round((l.hoursSpent % 1) * 60) })
  const ex = form?.extra || {}
  const setEx = (k, v) => setForm({ ...form, extra: { ...ex, [k]: v } })
  const isLeaveForm = form && form.entryType !== 'work'

  const save = async e => {
    e.preventDefault()
    const { id, h, m, createdAt, updatedAt, userId, userEmail, ...data } = form
    const desc = (data.description || '').trim()
    let payload
    if (data.entryType !== 'work') {
      if ((byDate[data.date] || []).some(l => leaveOf(l) && l.id !== id)) return flash('A leave entry already exists for this day')
      const full = data.entryType === 'full_leave'
      payload = { entryType: data.entryType, date: data.date, title: full ? 'Full Day Leave' : 'Half Day Leave', description: desc,
        hasTicket: false, ticketId: '', channel: '—', category: 'Leave', location: data.location, extra: {}, hoursSpent: 0, leaveDays: full ? 1 : 0.5 }
    } else {
      const hoursSpent = +h + +m / 60
      if (!data.title.trim() || !hoursSpent) return flash('Title and time spent are required')
      if (!desc) return flash('Description is required')
      if (data.hasTicket && !(data.ticketId || '').trim()) return flash('Ticket ID is required when there was a ticket')
      const miss = cfg.fields.find(f => f.required && f.type !== 'checkbox' && (ex[f.key] === undefined || ex[f.key] === ''))
      if (miss) return flash(`"${miss.label}" is required`)
      const extra = Object.fromEntries(Object.entries(ex).filter(([, v]) => v !== '' && v !== undefined)
        .map(([k, v]) => [k, cfg.fields.find(f => f.key === k)?.type === 'number' ? +v : v]))
      payload = { ...data, entryType: 'work', title: data.title.trim(), description: desc, hasTicket: !!data.hasTicket,
        ticketId: data.hasTicket ? data.ticketId.trim() : '', extra, hoursSpent, leaveDays: 0 }
    }
    try {
      if (id) await updateDoc(doc(db, 'work_logs', id), { ...payload, updatedAt: serverTimestamp() })
      else await addDoc(collection(db, 'work_logs'), { ...payload, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() })
      setSel(payload.date); setMonth(new Date(+payload.date.slice(0, 4), +payload.date.slice(5, 7) - 1, 1))
      setForm(null); flash(id ? 'Entry updated' : 'Entry added')
    } catch (x) { flash(x.message) }
  }
  const remove = async l => { if (confirm(`Delete "${l.title}"?`)) { await deleteDoc(doc(db, 'work_logs', l.id)); flash('Entry deleted') } }
  const set = k => e => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['This month', fmt(monthHrs)], ['Days logged', daysLogged], ['Ticket-linked', fmt(ticketHrs)], ['Leave days', leaveDays]].map(([t, v]) =>
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
            {cells.map((d, i) => d ? (() => {
              const h = sum(byDate[d]), lv = leaveSum(byDate[d])
              const cls = lv >= 1 ? 'bg-amber-100 hover:bg-amber-200' : heat(h, TARGET * (1 - lv))
              return (
                <button key={d} onClick={() => setSel(d)}
                  className={`h-16 rounded-lg border text-left p-1.5 transition ${cls} ${d === sel ? 'ring-2 ring-offset-1 ring-indigo-500' : ''} ${d === ymd(new Date()) ? 'border-indigo-500' : 'border-slate-200'}`}>
                  <div className="text-xs font-medium">{+d.slice(8)}</div>
                  {lv >= 1 ? <div className="text-[11px] mt-1 text-amber-700">Leave</div> : <>
                    {lv > 0 && <div className="text-[10px] text-amber-600 font-medium leading-none mt-0.5">½ leave</div>}
                    {h > 0 && <div className="text-[11px] mt-0.5">{h.toFixed(1)}h · {byDate[d].filter(l => !leaveOf(l)).length}</div>}</>}
                </button>) })() : <div key={i} />)}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-3 items-center">Utilisation:
            <span className="px-2 rounded bg-blue-100">&lt;50%</span><span className="px-2 rounded bg-blue-300">50–100%</span><span className="px-2 rounded bg-blue-600 text-white">{TARGET}h+</span>
            <span className="px-2 rounded bg-amber-100 text-amber-700">Leave</span></div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{new Date(sel + 'T00:00').toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
            <button onClick={() => setForm(blank(sel))} className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm"><Plus size={14} />Add</button>
          </div>
          {dayLeave >= 1
            ? <div className="flex items-center gap-2 text-sm rounded-lg bg-amber-100 text-amber-700 px-3 py-2"><Palmtree size={16} />On full-day leave</div>
            : <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Utilisation{dayLeave > 0 ? ' (half-day leave)' : ''}</span><span>{fmt(dayHrs)} / {cap}h ({Math.round(dayHrs / cap * 100)}%)</span></div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all ${dayHrs >= cap ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, dayHrs / cap * 100)}%` }} /></div>
              </div>}
          {dayLogs.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No entries. Click Add to log work or leave for this day.</p>}
          {dayLogs.map(l => leaveOf(l) ? (
            <div key={l.id} className="border border-amber-300 bg-amber-100/60 rounded-lg p-3 text-sm">
              <div className="flex justify-between"><b className="flex items-center gap-1.5"><Palmtree size={14} />{l.entryType === 'full_leave' ? 'Full-day leave' : 'Half-day leave'}</b></div>
              {l.description && <p className="text-slate-600 mt-1">{l.description}</p>}
              <div className="flex gap-3 mt-2 text-xs">
                <button onClick={() => edit(l)} className="flex items-center gap-1 text-blue-600"><Pencil size={12} />Edit</button>
                <button onClick={() => remove(l)} className="flex items-center gap-1 text-red-600"><Trash2 size={12} />Delete</button></div>
            </div>) : (
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

            <div className="col-span-2 grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100">
              {TYPES.map(([k, l]) => (
                <button type="button" key={k} onClick={() => setForm({ ...form, entryType: k })}
                  className={`py-1.5 rounded-lg text-sm transition ${form.entryType === k ? (k === 'work' ? 'bg-white shadow font-medium' : 'bg-amber-400 text-white font-medium shadow') : 'text-slate-500'}`}>{l}</button>))}
            </div>

            {isLeaveForm ? <>
              <Field label="Date"><input className={inp} type="date" value={form.date} onChange={set('date')} /></Field>
              <Field label="Work location"><select className={inp} value={form.location} onChange={set('location')}>{withCur(cfg.locations, form.location).map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Note (optional)" span><textarea className={inp} rows={2} placeholder="Reason / cover arrangements" value={form.description} onChange={set('description')} /></Field>
              <p className="col-span-2 text-xs text-slate-500">Leave adds no work hours. {form.entryType === 'half_leave' ? `Your expected work for the day drops to ${TARGET / 2}h.` : 'The day is marked as on leave.'}</p>
            </> : <>
              <Field label="Task title *" span><input className={inp} autoFocus value={form.title} onChange={set('title')} /></Field>
              <Field label="Description *" span><textarea className={inp} rows={3} value={form.description} onChange={set('description')} /></Field>
              <Field label="Was there a ticket?">
                <label className="flex items-center gap-2 h-[42px] cursor-pointer"><input type="checkbox" className="size-5" checked={!!form.hasTicket} onChange={e => setForm({ ...form, hasTicket: e.target.checked })} />Yes</label></Field>
              {form.hasTicket ? <Field label="Ticket ID *"><input className={inp} placeholder="INC-8921" value={form.ticketId} onChange={set('ticketId')} /></Field> : <div />}
              <Field label="Date"><input className={inp} type="date" value={form.date} onChange={set('date')} /></Field>
              <Field label="Work location"><select className={inp} value={form.location} onChange={set('location')}>{withCur(cfg.locations, form.location).map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Resolution channel"><select className={inp} value={form.channel} onChange={set('channel')}>{withCur(cfg.channels, form.channel).map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Category"><select className={inp} value={form.category} onChange={set('category')}>{withCur(cfg.categories, form.category).map(c => <option key={c}>{c}</option>)}</select></Field>
              {cfg.fields.map(f => (
                <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
                  {f.type === 'select'
                    ? <select className={inp} value={ex[f.key] ?? ''} onChange={e => setEx(f.key, e.target.value)}><option value="">—</option>{withCur(f.options, ex[f.key]).map(o => <option key={o}>{o}</option>)}</select>
                    : f.type === 'checkbox'
                      ? <input type="checkbox" className="size-5 mt-2" checked={!!ex[f.key]} onChange={e => setEx(f.key, e.target.checked)} />
                      : <input className={inp} type={f.type} value={ex[f.key] ?? ''} onChange={e => setEx(f.key, e.target.value)} />}
                </Field>))}
              <div className="flex gap-2 items-end col-span-2">
                <Field label="Hours"><input className={inp} type="number" min="0" max="24" value={form.h} onChange={set('h')} /></Field>
                <Field label="Minutes"><input className={inp} type="number" min="0" max="59" value={form.m} onChange={set('m')} /></Field>
              </div>
            </>}
            <button className="col-span-2 bg-blue-600 text-white rounded-xl py-2.5">{form.id ? 'Save changes' : isLeaveForm ? 'Add leave' : 'Add entry'}</button>
          </form>
        </div>)}
    </div>)
}
