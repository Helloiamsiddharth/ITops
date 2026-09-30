import { useEffect, useState } from 'react'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../AuthContext'
const BADGE = { active: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', rejected: 'bg-red-100 text-red-700' }
export default function Admin() {
  const { isSuper } = useAuth(); const [users, setUsers] = useState([])
  useEffect(() => onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => d.data()))), [])
  const upd = (uid, patch) => updateDoc(doc(db, 'users', uid), patch)
  const pending = users.filter(u => u.status === 'pending').length
  return (
    <div className="space-y-3">
      {pending > 0 && <div className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-700 text-sm">{pending} account{pending > 1 ? 's' : ''} waiting for approval</div>}
      {!isSuper && <p className="text-xs text-slate-500">Only a Super Admin can change roles.</p>}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b text-slate-500"><th className="p-3">User</th><th>Location</th><th>Status</th><th>Role</th><th></th></tr></thead>
          <tbody>{[...users].sort((a, b) => (b.status === 'pending') - (a.status === 'pending')).map(u => (
            <tr key={u.uid} className="border-b last:border-0">
              <td className="p-3"><div className="font-medium">{u.fullName}</div><div className="text-slate-500">{u.email}</div></td>
              <td>{u.location}</td>
              <td><span className={`px-2 py-0.5 rounded-full text-xs ${BADGE[u.status]}`}>{u.status}</span></td>
              <td><select disabled={!isSuper} value={u.role} onChange={e => upd(u.uid, { role: e.target.value })} className="border rounded-lg px-2 py-1 bg-white">
                <option value="member">member</option><option value="viewer">viewer (read-only)</option><option value="admin">admin</option><option value="super_admin">super_admin</option></select></td>
              <td className="space-x-3 pr-3 text-right">{u.status !== 'active' && <button className="text-green-600" onClick={() => upd(u.uid, { status: 'active' })}>Approve</button>}
                {u.status !== 'rejected' && <button className="text-red-600" onClick={() => upd(u.uid, { status: 'rejected' })}>Reject</button>}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>)
}
