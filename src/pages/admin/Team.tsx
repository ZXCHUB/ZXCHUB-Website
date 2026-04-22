import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Shield, ShieldAlert, UserCog } from 'lucide-react';

export default function AdminTeam() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'support']));
      const snap = await getDocs(q);
      const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeam(members);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      showToast('Role updated successfully');
      fetchTeam();
    } catch (e) {
      console.error(e);
      showToast('Failed to update role', 'error');
    }
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
    const role = (e.currentTarget.elements.namedItem('role') as HTMLSelectElement).value;
    
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      if (snap.empty) {
        showToast('User not found. They must sign up first.', 'error');
        return;
      }
      
      const userDoc = snap.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), { role });
      showToast('Team member added successfully');
      (e.target as HTMLFormElement).reset();
      fetchTeam();
    } catch (err) {
      console.error(err);
      showToast('Failed to add team member', 'error');
    }
  };

  return (
    <div className="max-w-5xl space-y-6 text-white pb-12">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-sm text-slate-400 mt-1">Manage administrators and support staff.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#222b3d] bg-[#1a2332]">
            <h2 className="font-semibold">Current Team Members</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-[#1a2332] uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">Loading team...</td>
                  </tr>
                ) : team.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No team members found.</td>
                  </tr>
                ) : (
                  team.map(member => (
                    <tr key={member.id} className="border-b border-[#222b3d] hover:bg-[#1e293b]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{member.displayName || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{member.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {member.role === 'admin' ? (
                            <ShieldAlert className="w-4 h-4 text-red-400" />
                          ) : (
                            <UserCog className="w-4 h-4 text-indigo-400" />
                          )}
                          <span className={`capitalize font-medium ${member.role === 'admin' ? 'text-red-400' : 'text-indigo-400'}`}>
                            {member.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="bg-[#0f172a] border border-[#222b3d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="support">Support</option>
                          <option value="user">Remove from Team (Make User)</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6 h-fit">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Add Team Member
          </h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">User Email</label>
              <input 
                type="email" 
                name="email"
                required
                className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
              <select 
                name="role"
                className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="support">Support (Tickets & Feedback only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Member
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-[#222b3d] text-sm text-slate-400 space-y-2">
            <p><strong>Admin:</strong> Has full access to all settings, products, and orders.</p>
            <p><strong>Support:</strong> Can only access the Feedbacks and Tickets sections to help customers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
