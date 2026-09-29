import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, DOMAIN, BOOTSTRAP } from './lib/firebase'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [profile, setProfile] = useState(null), [loading, setLoading] = useState(true)
  useEffect(() => {
    let unsub = () => {}
    const off = onAuthStateChanged(auth, u => {
      unsub(); setUser(u); setProfile(null)
      if (!u) return setLoading(false)
      unsub = onSnapshot(doc(db, 'users', u.uid), s => { setProfile(s.exists() ? s.data() : null); setLoading(false) })
    })
    return () => { off(); unsub() }
  }, [])
  const signUp = async (fullName, email, password, location) => {
    if (!email.toLowerCase().endsWith('@' + DOMAIN)) throw new Error(`Only @${DOMAIN} emails may register.`)
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    const boot = email.toLowerCase() === BOOTSTRAP // seeded admin; rules allow this exact email only
    await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email, fullName, location,
      role: boot ? 'admin' : 'member', status: boot ? 'active' : 'pending', createdAt: serverTimestamp() })
  }
  const value = { user, profile, loading, signUp, signIn: (e, p) => signInWithEmailAndPassword(auth, e, p), logout: () => signOut(auth),
    isAdmin: ['admin', 'super_admin'].includes(profile?.role) && profile?.status === 'active' }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
