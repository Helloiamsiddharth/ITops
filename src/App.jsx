import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { ClipboardList, KanbanSquare, BarChart3, ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from './AuthContext'
import Login from './pages/Login'
import Logger from './pages/Logger'
import Kanban from './pages/Kanban'
import Analytics from './pages/Analytics'
import Admin from './pages/Admin'
export default function App() {
  const { user, profile, loading, logout, isAdmin } = useAuth()
  if (loading) return <p className="p-10 text-center">Loading…</p>
  if (!user || !profile) return <Login />
  if (profile.status !== 'active') return (
    <div className="max-w-md mx-auto mt-24 p-6 bg-white rounded-xl shadow text-center">
      <h1 className="text-xl font-semibold mb-2">{profile.status === 'rejected' ? 'Access denied' : 'Awaiting approval'}</h1>
      <p className="text-slate-600 mb-4">{profile.status === 'rejected' ? 'Contact your administrator.' : 'An administrator must approve your account before you can view any data.'}</p>
      <button onClick={logout} className="text-blue-600">Sign out</button></div>)
  const link = ({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`
  return (
    <div className="flex min-h-screen">
      <nav className="w-56 p-3 space-y-1 bg-white border-r">
        <div className="font-bold px-3 py-2">IT Ops Platform</div>
        <NavLink to="/" end className={link}><ClipboardList size={16}/>Work Log</NavLink>
        <NavLink to="/board" className={link}><KanbanSquare size={16}/>Team Board</NavLink>
        {isAdmin && <NavLink to="/analytics" className={link}><BarChart3 size={16}/>Analytics</NavLink>}
        {isAdmin && <NavLink to="/admin" className={link}><ShieldCheck size={16}/>Users</NavLink>}
        <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-slate-500"><LogOut size={16}/>Sign out</button>
        <div className="px-3 text-xs text-slate-400">{profile.email} · {profile.role}</div>
      </nav>
      <main className="flex-1 p-6 overflow-x-auto">
        <Routes>
          <Route path="/" element={<Logger />} />
          <Route path="/board" element={<Kanban />} />
          <Route path="/analytics" element={isAdmin ? <Analytics /> : <Navigate to="/" />} />
          <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </div>)
}
