import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Check, Copy, Download, KeyRound, Mail, MapPin, Search, Shield, User, X } from 'lucide-react';
import { db } from '../../firebase';
import SEO from '../../components/SEO';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editRole, setEditRole] = useState('user');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    const [usersSnap, txSnap, keysSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'transactions')),
      getDocs(collection(db, 'keys'))
    ]);
    const allTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const allKeys = keysSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    setTransactions(allTx);
    setKeys(allKeys);
    setCustomers(usersSnap.docs.map(d => {
      const data = { id: d.id, ...d.data() } as any;
      const userTx = allTx.filter(tx => tx.userId === d.id);
      const userKeys = allKeys.filter(key => key.ownerId === d.id);
      return {
        ...data,
        totalSpent: userTx.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
        ordersCount: userTx.length,
        keysCount: userKeys.length,
        lastOrderDate: userTx.length ? Math.max(...userTx.map(tx => Number(tx.createdAt || 0))) : null
      };
    }));
  };

  useEffect(() => {
    fetchData().catch(error => {
      console.error(error);
      showToast('Failed to load customers.', 'error');
    });
  }, []);

  const filteredCustomers = useMemo(() => {
    const needle = search.toLowerCase();
    return customers.filter(customer => (
      customer.email?.toLowerCase().includes(needle) ||
      customer.displayName?.toLowerCase().includes(needle) ||
      customer.id.toLowerCase().includes(needle)
    ));
  }, [customers, search]);

  const openCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setEditRole(customer.role || 'user');
    setEditDisplayName(customer.displayName || '');
    setIsEditing(false);
  };

  const saveCustomer = async () => {
    if (!selectedCustomer) return;
    await updateDoc(doc(db, 'users', selectedCustomer.id), {
      role: editRole,
      displayName: editDisplayName
    });
    const updated = { ...selectedCustomer, role: editRole, displayName: editDisplayName };
    setSelectedCustomer(updated);
    setCustomers(current => current.map(customer => customer.id === updated.id ? updated : customer));
    setIsEditing(false);
    showToast('Customer updated.');
  };

  const exportCsv = () => {
    const rows = [
      ['ID', 'Email', 'Display Name', 'Discord', 'IP', 'Country', 'Total Spent', 'Orders Count', 'Keys Count', 'Created At', 'Last Order Date', 'Role'],
      ...filteredCustomers.map(customer => [
        customer.id,
        customer.email || '',
        `"${(customer.displayName || '').replace(/"/g, '""')}"`,
        customer.discordUsername || customer.discordId || '',
        customer.lastIp || '',
        customer.lastCountry || '',
        Number(customer.totalSpent || 0).toFixed(2),
        customer.ordersCount || 0,
        customer.keysCount || 0,
        customer.createdAt ? new Date(customer.createdAt).toLocaleString() : '',
        customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleString() : '',
        customer.role || 'user'
      ])
    ];
    const blob = new Blob([rows.map(row => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zxchub-customers.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const customerOrders = selectedCustomer ? transactions.filter(tx => tx.userId === selectedCustomer.id) : [];
  const customerKeys = selectedCustomer ? keys.filter(key => key.ownerId === selectedCustomer.id) : [];

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    showToast('Copied.');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-white">
      <SEO title="Customers | ZXCHUB Admin" description="Manage ZXCHUB customers." />
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 font-medium text-white shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Customers</h1>
          <p className="mt-1 text-sm text-slate-400">View users, roles, and key purchases.</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search customers..." className="w-full border border-slate-800 bg-[#0f172a] py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500" />
      </label>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="overflow-x-auto border border-slate-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#111827] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Orders</th>
                <th className="px-5 py-4">Keys</th>
                <th className="px-5 py-4">Total Spent</th>
                <th className="px-5 py-4">Last Order</th>
                <th className="px-5 py-4">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} onClick={() => openCustomer(customer)} className="cursor-pointer hover:bg-white/5">
                  <td className="px-5 py-4">
                    <div className="font-bold">{customer.displayName || 'User'}</div>
                    <div className="text-xs text-slate-500">{customer.email}</div>
                  </td>
                  <td className="px-5 py-4">{customer.ordersCount || 0}</td>
                  <td className="px-5 py-4">{customer.keysCount || 0}</td>
                  <td className="px-5 py-4 text-emerald-400">${Number(customer.totalSpent || 0).toFixed(2)}</td>
                  <td className="px-5 py-4 text-slate-400">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleString() : '-'}</td>
                  <td className="px-5 py-4">{customer.role || 'user'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="border border-slate-800 bg-[#0f172a] p-5">
          {!selectedCustomer ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center text-slate-500">
              <User className="mb-3 h-8 w-8" />
              Select a customer to view details.
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-black">{selectedCustomer.displayName || 'User'}</div>
                  <div className="text-sm text-slate-500">{selectedCustomer.email}</div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <input value={editDisplayName} onChange={event => setEditDisplayName(event.target.value)} className="w-full border border-slate-800 bg-black px-3 py-2 text-sm outline-none focus:border-red-500" />
                  <select value={editRole} onChange={event => setEditRole(event.target.value)} className="w-full border border-slate-800 bg-black px-3 py-2 text-sm outline-none focus:border-red-500">
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={saveCustomer} className="inline-flex items-center gap-2 bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500"><Check className="h-4 w-4" /> Save</button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="mb-5 border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5">Edit Customer</button>
              )}

              <div className="mt-5 border-t border-slate-800 pt-5">
                <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Customer Info</div>
                <div className="space-y-2 text-sm">
                  <InfoRow icon={User} label="UID" value={selectedCustomer.id} onCopy={() => copy(selectedCustomer.id)} />
                  <InfoRow icon={Mail} label="Email" value={selectedCustomer.email || '-'} onCopy={() => copy(selectedCustomer.email || '')} />
                  <InfoRow icon={Shield} label="Role" value={selectedCustomer.role || 'user'} />
                  <InfoRow icon={MapPin} label="IP / Country" value={`${selectedCustomer.lastIp || '-'} / ${selectedCustomer.lastCountry || '-'}`} />
                  <InfoRow icon={User} label="Created" value={selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleString() : '-'} />
                  <InfoRow icon={User} label="Discord" value={selectedCustomer.discordUsername || selectedCustomer.discordId || 'Not linked'} />
                </div>
              </div>

              <div className="mt-5 border-t border-slate-800 pt-5">
                <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Stats</div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="border border-slate-800 bg-black p-3"><div className="font-black">{customerOrders.length}</div><div className="text-xs text-slate-500">Orders</div></div>
                  <div className="border border-slate-800 bg-black p-3"><div className="font-black">{customerKeys.length}</div><div className="text-xs text-slate-500">Keys</div></div>
                  <div className="border border-slate-800 bg-black p-3"><div className="font-black">${Number(selectedCustomer.totalSpent || 0).toFixed(2)}</div><div className="text-xs text-slate-500">Spent</div></div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-800 pt-5">
                <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Keys</div>
                <div className="space-y-2">
                  {customerKeys.map(key => (
                    <div key={key.id} className="border border-slate-800 bg-black p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold">{key.variantName || 'ZXCHUB Key'}</div>
                        <button onClick={() => copy(key.keyString || '')} className="text-slate-500 hover:text-white"><Copy className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-1 break-all font-mono text-xs text-red-300">{key.keyString}</div>
                      <div className="mt-1 text-xs text-slate-500">{key.purchasedAt ? new Date(key.purchasedAt).toLocaleString() : '-'}</div>
                    </div>
                  ))}
                  {customerKeys.length === 0 && <div className="text-sm text-slate-600">No keys.</div>}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-800 pt-5">
                <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Orders</div>
                <div className="space-y-2">
                  {customerOrders.map(order => (
                    <div key={order.id} className="border border-slate-800 bg-black p-3 text-sm">
                      <div className="font-bold">{order.productTitle || 'ZXCHUB Key'}</div>
                      <div className="mt-1 text-xs text-slate-500">${Number(order.amount || 0).toFixed(2)} - {new Date(order.createdAt || Date.now()).toLocaleString()}</div>
                    </div>
                  ))}
                  {customerOrders.length === 0 && <div className="text-sm text-slate-600">No orders.</div>}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, onCopy }: { icon: React.ElementType; label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-start gap-3 border border-slate-800 bg-black p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-black uppercase tracking-wide text-slate-600">{label}</div>
        <div className="mt-1 break-words text-slate-300">{value}</div>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="text-slate-500 hover:text-white">
          <Copy className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
