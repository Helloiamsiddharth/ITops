import { useEffect, useState } from 'react'
import { X, Plus, Save, Trash2 } from 'lucide-react'
import { useConfig, saveConfig } from '../ConfigContext'

const LISTS = [['channels', 'Resolution channels'], ['categories', 'Task categories'], ['locations', 'Work locations']]
const TYPES = ['text', 'number', 'select', 'date', 'checkbox']
const keyOf = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const inp = 'border rounded-xl px-3 py-2 bg-white'

function ListEditor({ title, items, onChange }) {
  const [v, setV] = useState('')
  const add = () => { const t = v.trim(); if (t && !items.includes(t)) onChange([...items, t]); setV('') }
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2 mb-3">{items.map(i => (
        <span key={i} className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 rounded-full pl-3 pr-1.5 py-1 text-sm">{i}
          <button onClick={() => onChange(items.filter(x => x !== i))} className="rounded-full p-0.5 hover:bg-indigo-200/60"><X size={14} /></button></span>))}</div>
      <div className="flex gap-2">
        <input className={inp + ' flex-1'} placeholder="Add new option…" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button onClick={add} className="bg-blue-600 text-white rounded-xl px-4 flex items-center gap-1"><Plus size={14} />Add</button></div>
    </div>)
}

export default function Settings() {
  const cfg = useConfig()
  const [d, setD] = useState(cfg), [msg, setMsg] = useState('')
  useEffect(() => { setD(cfg) }, [cfg])
  const setF = (i, p) => setD({ ...d, fields: d.fields.map((f, j) => j === i ? { ...f, ...p } : f) })
  const save = async () => {
    if (LISTS.some(([k]) => !d[k].length)) return setMsg('Each list needs at least one option')
    try {
      await saveConfig({ channels: d.channels, categories: d.categories, locations: d.locations, targetHours: +d.targetHours || 8,
        fields: d.fields.filter(f => f.label.trim()).map(({ optText, ...f }) => ({ ...f, key: f.key || keyOf(f.label), options: f.type === 'select' ? f.options : [] })) })
      setMsg('Saved ✓')
    } catch (e) { setMsg(e.message) }
    setTimeout(() => setMsg(''), 3000)
  }
  return (
    <div className="space-y-4 max-w-4xl">
      <p className="text-sm text-slate-500">Changes apply to everyone. Removing or renaming an option never changes old entries — they keep their original value.</p>
      <div className="grid md:grid-cols-2 gap-4">
        {LISTS.map(([k, t]) => <ListEditor key={k} title={t} items={d[k]} onChange={v => setD({ ...d, [k]: v })} />)}
        <div className="bg-white rounded-xl shadow p-4"><h3 className="font-semibold mb-3">Daily utilisation target</h3>
          <div className="flex items-center gap-2"><input type="number" min="1" max="24" className={inp + ' w-24'} value={d.targetHours} onChange={e => setD({ ...d, targetHours: e.target.value })} /><span className="text-sm text-slate-500">hours / day</span></div></div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex justify-between items-center"><h3 className="font-semibold">Extra fields on the Work Log form</h3>
          <button onClick={() => setD({ ...d, fields: [...d.fields, { key: '', label: '', type: 'text', options: [], required: false }] })} className="bg-blue-600 text-white rounded-xl px-4 py-1.5 text-sm flex items-center gap-1"><Plus size={14} />Add field</button></div>
        {d.fields.length === 0 && <p className="text-sm text-slate-400">No extra fields yet. Add one (e.g. "Vendor", "Device type", "Customer").</p>}
        {d.fields.map((f, i) => (
          <div key={i} className="grid md:grid-cols-[1.2fr_120px_1.5fr_auto_auto] gap-2 items-center border rounded-xl p-3">
            <input className={inp} placeholder="Field label" value={f.label} onChange={e => setF(i, { label: e.target.value })} />
            <select className={inp} value={f.type} onChange={e => setF(i, { type: e.target.value })}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
            {f.type === 'select'
              ? <input className={inp} placeholder="Options, comma separated" value={f.optText ?? f.options.join(', ')} onChange={e => setF(i, { optText: e.target.value, options: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />
              : <span className="text-xs text-slate-400">no options needed</span>}
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.required} onChange={e => setF(i, { required: e.target.checked })} />Required</label>
            <button onClick={() => setD({ ...d, fields: d.fields.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
          </div>))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="bg-blue-600 text-white rounded-xl px-6 py-2.5 flex items-center gap-2"><Save size={16} />Save settings</button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </div>)
}
