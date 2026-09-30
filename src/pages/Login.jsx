import { useState } from 'react'
import { Activity, CalendarDays, KanbanSquare, BarChart3 } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { LOCATIONS } from '../lib/firebase'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('in'), [f, setF] = useState({ name: '', email: '', pw: '', loc: 'Nepal' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const submit = async e => { e.preventDefault(); setErr(''); setBusy(true)
    try { mode === 'in' ? await signIn(f.email, f.pw) : await signUp(f.name, f.email, f.pw, f.loc) } catch (x) { setErr(x.message.replace('Firebase: ', '')) }
    setBusy(false) }
  const inp = 'w-full border rounded-xl px-4 py-2.5 bg-white'
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:flex flex-col justify-center p-14 text-white overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600">
        <div className="blob absolute -top-20 -left-20 size-80 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="blob absolute bottom-0 right-0 size-96 rounded-full bg-cyan-300/30 blur-3xl" style={{ animationDelay: '-4s' }} />
        <div className="relative space-y-6" style={{ animation: 'rise .7s both' }}>
          <div className="grid place-items-center size-14 rounded-2xl bg-white/20 backdrop-blur"><Activity size={28} /></div>
          <h1 className="text-4xl font-bold leading-tight">IT Service Operations<br />& Task Intelligence</h1>
          <p className="text-blue-100 max-w-md">One place for your daily work log, team projects, and utilisation insight across USA, Nepal, India and beyond.</p>
          <ul className="space-y-3 text-blue-50">
            {[[CalendarDays, 'Calendar-based work logging'], [KanbanSquare, 'Drag-and-drop team board'], [BarChart3, 'Person-wise utilisation analytics']].map(([I, t]) =>
              <li key={t} className="flex items-center gap-3"><span className="grid place-items-center size-8 rounded-lg bg-white/15"><I size={16} /></span>{t}</li>)}
          </ul>
        </div>
      </div>
      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-3" style={{ animation: 'pop .4s both' }}>
          <h2 className="text-2xl font-bold">{mode === 'in' ? 'Welcome back' : 'Request access'}</h2>
          <p className="text-sm text-slate-500 pb-2">{mode === 'in' ? 'Sign in with your @kapower.us email.' : 'An admin will approve your account.'}</p>
          {mode === 'up' && <><input className={inp} placeholder="Full name" required value={f.name} onChange={set('name')} />
            <select className={inp} value={f.loc} onChange={set('loc')}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></>}
          <input className={inp} type="email" placeholder="you@kapower.us" required value={f.email} onChange={set('email')} />
          <input className={inp} type="password" placeholder="Password (min 6)" required minLength={6} value={f.pw} onChange={set('pw')} />
          {err && <p className="text-red-600 text-sm bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">{err}</p>}
          <button disabled={busy} className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-medium shadow-lg shadow-indigo-500/30 disabled:opacity-60">{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
          <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr('') }} className="text-sm text-blue-600 w-full">{mode === 'in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}</button>
        </form>
      </div>
    </div>)
}
