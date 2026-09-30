import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, CHANNELS, CATEGORIES, LOCATIONS } from './lib/firebase'
import { useAuth } from './AuthContext'

export const DEFAULTS = { channels: CHANNELS, categories: CATEGORIES, locations: LOCATIONS, fields: [], targetHours: 8 }
const Ctx = createContext(DEFAULTS)
export const useConfig = () => useContext(Ctx)
export const saveConfig = cfg => setDoc(doc(db, 'config', 'options'), cfg)

export function ConfigProvider({ children }) {
  const { profile } = useAuth()
  const [cfg, setCfg] = useState(DEFAULTS)
  const active = profile?.status === 'active'
  useEffect(() => {
    if (!active) return
    return onSnapshot(doc(db, 'config', 'options'), s => setCfg({ ...DEFAULTS, ...(s.exists() ? s.data() : {}) }), () => {})
  }, [active])
  return <Ctx.Provider value={cfg}>{children}</Ctx.Provider>
}
