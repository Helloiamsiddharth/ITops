import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { LOCATIONS } from '../lib/firebase'
export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('in'), [f, setF] = useState({ name: '', email: '', pw: '', loc: 'Nepal' }), [err, setErr] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const submit = async e => { e.preventDefault(); setErr('')
    try { mode === 'in' ? await signIn(f.email, f.pw) : await signUp(f.name, f.email, f.pw, f.loc) } catch (x) { setErr(x.message) } }
  const inp = 'w-full border rounded-lg px-3 py-2'
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-24 p-6 bg-white rounded-xl shadow space-y-3">
      <h1 className="text-xl font-semibold">{mode === 'in' ? 'Sign in' : 'Request access'}</h1>
      {mode === 'up' && <><input className={inp} placeholder="Full name" required value={f.name} onChange={set('name')} />
        <select className={inp} value={f.loc} onChange={set('loc')}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></>}
      <input className={inp} type="email" placeholder="you@kapower.us" required value={f.email} onChange={set('email')} />
      <input className={inp} type="password" placeholder="Password (min 6)" required minLength={6} value={f.pw} onChange={set('pw')} />
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button className="w-full bg-blue-600 text-white rounded-lg py-2">{mode === 'in' ? 'Sign in' : 'Sign up'}</button>
      <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="text-sm text-blue-600">{mode === 'in' ? 'Need an account?' : 'Have an account?'}</button>
    </form>)
}
