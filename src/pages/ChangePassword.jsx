import { useState } from 'react'
import { updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { KeyRound } from 'lucide-react'
import { auth, db } from '../lib/firebase'
import { useAuth } from '../AuthContext'

export default function ChangePassword() {
  const { user, logout } = useAuth()
  const [a, setA] = useState(''), [b, setB] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setErr('')
    if (a.length < 8) return setErr('Use at least 8 characters')
    if (a !== b) return setErr('Passwords do not match')
    setBusy(true)
    try {
      await updatePassword(auth.currentUser, a)
      await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false })
    } catch (x) {
      setErr(x.code === 'auth/requires-recent-login' ? 'Session expired. Sign out, then sign in again with your temporary password.' : x.message.replace('Firebase: ', ''))
    }
    setBusy(false)
  }
  const inp = 'w-full border rounded-xl px-4 py-2.5 bg-white'
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-3" style={{ animation: 'pop .4s both' }}>
        <div className="grid place-items-center size-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white"><KeyRound size={22} /></div>
        <h2 className="text-xl font-bold">Choose a new password</h2>
        <p className="text-sm text-slate-500">You signed in with a temporary password. Set your own to continue.</p>
        <input className={inp} type="password" placeholder="New password (8+ characters)" required value={a} onChange={e => setA(e.target.value)} />
        <input className={inp} type="password" placeholder="Confirm new password" required value={b} onChange={e => setB(e.target.value)} />
        {err && <p className="text-red-600 text-sm bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">{err}</p>}
        <button disabled={busy} className="w-full bg-blue-600 text-white rounded-xl py-2.5 disabled:opacity-60">{busy ? 'Saving…' : 'Save password'}</button>
        <button type="button" onClick={logout} className="text-sm text-slate-500 w-full">Sign out</button>
      </form>
    </div>)
}
