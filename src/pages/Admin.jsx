import { useEffect, useState } from 'react'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../AuthContext'
export default function Admin() {
  const { profile } = useAuth(); const [users, setUsers] = useState([])
  useEffect(() => onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => d.data()))), [])
  const upd = (uid, patch) => updateDoc(doc(db, 'users', uid), patch)
  return (
    <table className="bg-white rounded-xl shadow w-full text-sm">
      <thead><tr className="text-left border-b"><th className="p-3">User</th><th>Location</th><th>Status</th><th>Role</th><th></th></tr></thead>
      <tbody>{[...users].sort((a, b) => (a.status === 'pending' ? -1 : 1)).map(u => (
        <tr key={u.uid} className="border-b"><td className="p-3">{u.fullName}<br /><span className="text-slate-500">{u.email}</span></td><td>{u.location}</td><td>{u.status}</td>
          <td><select disabled={profile.role !== 'super_admin'} value={u.role} onChange={e => upd(u.uid, { role: e.target.value })}>
            <option value="member">member</option><option value="admin">admin</option><option value="super_admin">super_admin</option></select></td>
          <td className="space-x-2">{u.status !== 'active' && <button className="text-green-600" onClick={() => upd(u.uid, { status: 'active' })}>Approve</button>}
            {u.status !== 'rejected' && <button className="text-red-600" onClick={() => upd(u.uid, { status: 'rejected' })}>Reject</button>}</td></tr>))}</tbody>
    </table>)
}
