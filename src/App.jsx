import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { ClipboardList, KanbanSquare, BarChart3, ShieldCheck, LogOut, Moon, Sun, Activity, Settings as SettingsIcon, Eye } from 'lucide-react'
import { useAuth } from './AuthContext'
import Login from './pages/Login'
import Logger from './pages/Logger'
import Kanban from './pages/Kanban'
import Analytics from './pages/Analytics'
import Admin from './pages/Admin'
import Settings from './pages/Settings'

const NAV = [
  { to: '/', label: 'Work Log', Icon: ClipboardList, show: a => a.canWrite },
  { to: '/board', label: 'Team Board', Icon: KanbanSquare, show: () => true },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3, show: a => a.canSeeAll },
  { to: '/admin', label: 'Users', Icon: ShieldCheck, show: a => a.isAdmin },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon, show: a => a.isSuper },
]

export default function App() {
  const auth = useAuth()
  const { user, profile, loading, logout, canWrite, canSeeAll, isAdmin, isSuper, isViewer } = auth
  const loc = useLocation()
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])

  if (loading) return <div className="min-h-screen grid place-items-center"><Activity className="animate-pulse text-indigo-500" size={36} /></div>
  if (!user || !profile) return <Login />
  if (profile.status !== 'active') return (
    <div className="max-w-md mx-auto mt-24 p-8 bg-white rounded-2xl shadow text-center">
      <h1 className="text-xl font-semibold mb-2">{profile.status === 'rejected' ? 'Access denied' : 'Awaiting approval'}</h1>
      <p className="text-slate-600 mb-4">{profile.status === 'rejected' ? 'Contact your administrator.' : 'An administrator must approve your account before you can view any data.'}</p>
      <button onClick={logout} className="text-blue-600">Sign out</button></div>)

  const items = NAV.filter(n => n.show(auth))
  const hour = new Date().getHours(), first = (profile.fullName || 'there').split(' ')[0]
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const title = items.find(n => n.to === loc.pathname)?.label || ''
  const initials = (profile.fullName || profile.email).split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
  const pill = ({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
    ? 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-lg shadow-indigo-500/30 translate-x-1'
    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'}`

  return (
    <div className="flex min-h-screen">
      <aside className="glass hidden md:flex flex-col w-64 p-4 gap-1 sticky top-0 h-screen border-r">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="grid place-items-center size-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/40"><Activity size={18} /></div>
          <div className="font-bold leading-tight">IT Ops<div className="text-[11px] font-normal text-slate-500">Service Intelligence</div></div>
        </div>
        {items.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={pill}><Icon size={18} />{label}</NavLink>)}
        <div className="mt-auto space-y-2">
          <button onClick={() => setDark(!dark)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10">
            {dark ? <Sun size={18} /> : <Moon size={18} />}{dark ? 'Light mode' : 'Dark mode'}</button>
          <div className="flex items-center gap-3 p-2 rounded-xl border">
            <div className="grid place-items-center size-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white text-xs font-bold">{initials}</div>
            <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{profile.fullName}</div><div className="text-[11px] text-slate-500 truncate">{profile.role.replace('_', ' ')}</div></div>
            <button onClick={logout} title="Sign out" className="p-1.5 rounded-lg text-slate-500 hover:text-red-500"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <main key={loc.pathname} className="page flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-8">
        <header className="mb-6 flex items-end justify-between gap-3" style={{ animation: 'rise .4s both' }}>
          <div><p className="text-sm text-slate-500">{greet}, {first} 👋</p><h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1></div>
          {isViewer && <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-100 text-amber-700"><Eye size={14} />View-only access</span>}
          <div className="md:hidden flex gap-1">
            <button onClick={() => setDark(!dark)} className="p-2 rounded-lg border">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={logout} className="p-2 rounded-lg border"><LogOut size={16} /></button></div>
          <div className="hidden md:block text-sm text-slate-500">{new Date().toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </header>
        <Routes>
          <Route path="/" element={canWrite ? <Logger /> : <Navigate to="/analytics" replace />} />
          <Route path="/board" element={<Kanban />} />
          <Route path="/analytics" element={canSeeAll ? <Analytics /> : <Navigate to="/" replace />} />
          <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="/settings" element={isSuper ? <Settings /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav className="glass md:hidden fixed bottom-0 inset-x-0 z-30 flex justify-around p-2 border-t">
        {items.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-500'}`}>
            <Icon size={20} />{label.split(' ')[0]}</NavLink>))}
      </nav>
    </div>)
}
