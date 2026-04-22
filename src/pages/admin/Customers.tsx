import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Search, Filter, Download, RefreshCw, User, Mail, 
  DollarSign, Calendar, Shield, Edit2, Check, X, ArrowLeft, Receipt, Gamepad2
} from 'lucide-react';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'has_orders' | 'no_orders'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editBalance, setEditBalance] = useState(0);
  const [editRole, setEditRole] = useState('user');
  const [editEmail, setEditEmail] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAffiliateCode, setEditAffiliateCode] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const txSnap = await getDocs(collection(db, 'transactions'));
      
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const allTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      setTransactions(allTx);

      // Enhance users with transaction data
      const enhancedUsers = allUsers.map(user => {
        const userTx = allTx.filter(tx => tx.userId === user.id);
        const totalSpent = userTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const lastOrder = userTx.length > 0 
          ? [...userTx].sort((a, b) => b.createdAt - a.createdAt)[0] 
          : null;

        return {
          ...user,
          totalSpent,
          ordersCount: userTx.length,
          lastOrderDate: lastOrder ? lastOrder.createdAt : null
        };
      });

      setCustomers(enhancedUsers);
    } catch (e) {
      console.error("Failed to fetch customers", e);
      showToast("Failed to load customers", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;
    try {
      await updateDoc(doc(db, 'users', selectedCustomer.id), {
        balance: editBalance,
        role: editRole,
        email: editEmail,
        displayName: editDisplayName,
        affiliateCode: editAffiliateCode
      });
      
      // Update local state
      const updatedCustomer = { 
        ...selectedCustomer, 
        balance: editBalance, 
        role: editRole,
        email: editEmail,
        displayName: editDisplayName,
        affiliateCode: editAffiliateCode
      };
      setSelectedCustomer(updatedCustomer);
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? updatedCustomer : c));
      
      setIsEditing(false);
      showToast("Customer updated successfully");
    } catch (e) {
      console.error("Failed to update customer", e);
      showToast("Failed to update customer", "error");
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterType === 'admin') return c.role === 'admin';
    if (filterType === 'has_orders') return c.ordersCount > 0;
    if (filterType === 'no_orders') return c.ordersCount === 0;
    
    return true;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'E-mail Address', 'Display Name', 'Balance', 'Total Spent', 'Orders Count', 'Last Order Date', 'Affiliate Code', 'Role'];
    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(c => [
        c.id,
        c.email || '',
        `"${(c.displayName || '').replace(/"/g, '""')}"`,
        (c.balance || 0).toFixed(2),
        (c.totalSpent || 0).toFixed(2),
        c.ordersCount || 0,
        c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '',
        c.affiliateCode || '',
        c.role || 'user'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (selectedCustomer) {
    const customerTx = transactions.filter(tx => tx.userId === selectedCustomer.id).sort((a, b) => b.createdAt - a.createdAt);

    return (
      <div className="max-w-7xl mx-auto space-y-6 text-white pb-12">
        {toast && (
          <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {toast.message}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setSelectedCustomer(null); setIsEditing(false); }}
            className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Customer Details</h1>
            <p className="text-sm text-slate-400 mt-1">View and manage the details of a customer.</p>
          </div>
        </div>

        {/* General Information */}
        <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#222b3d] flex items-center justify-between bg-[#1a2332]">
            <div className="flex items-center gap-2 font-medium">
              <User className="w-4 h-4 text-slate-400" /> General Information
            </div>
            {!isEditing ? (
              <button 
                onClick={() => {
                  setEditBalance(selectedCustomer.balance || 0);
                  setEditRole(selectedCustomer.role || 'user');
                  setEditEmail(selectedCustomer.email || '');
                  setEditDisplayName(selectedCustomer.displayName || '');
                  setEditAffiliateCode(selectedCustomer.affiliateCode || '');
                  setIsEditing(true);
                }}
                className="flex items-center gap-2 text-sm bg-[#1e293b] hover:bg-[#273549] px-3 py-1.5 rounded-lg transition-colors"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button 
                  onClick={handleSaveCustomer}
                  className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#222b3d]">
            <div className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-[#222b3d]">
                <span className="text-sm font-medium text-slate-400">ID</span>
                <span className="text-sm font-mono">{selectedCustomer.id}</span>
              </div>
              <div className="flex items-center justify-between p-4 border-b border-[#222b3d]">
                <span className="text-sm font-medium text-slate-400">E-mail Address</span>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-48 bg-[#0f172a] border border-[#222b3d] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <span className="text-sm">{selectedCustomer.email}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-4 border-b border-[#222b3d]">
                <span className="text-sm font-medium text-slate-400">Display Name</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editDisplayName} 
                    onChange={e => setEditDisplayName(e.target.value)}
                    className="w-48 bg-[#0f172a] border border-[#222b3d] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <span className="text-sm">{selectedCustomer.displayName}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-4 border-b border-[#222b3d]">
                <span className="text-sm font-medium text-slate-400">Customer Balance</span>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">$</span>
                    <input 
                      type="number" 
                      value={editBalance} 
                      onChange={e => setEditBalance(Number(e.target.value))}
                      className="w-24 bg-[#0f172a] border border-[#222b3d] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-medium text-emerald-400">${(selectedCustomer.balance || 0).toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm font-medium text-slate-400">Role</span>
                {isEditing ? (
                  <select 
                    value={editRole} 
                    onChange={e => setEditRole(e.target.value)}
                    className="bg-[#0f172a] border border-[#222b3d] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${selectedCustomer.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-300'}`}>
                    {selectedCustomer.role?.toUpperCase() || 'USER'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-[#222b3d]">
                <span className="text-sm font-medium text-slate-400">Registered At</span>
                <span className="text-sm">{selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between p-4 border-b border-[#222b3d]">
                <span className="text-sm font-medium text-slate-400">Affiliate Code</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editAffiliateCode} 
                    onChange={e => setEditAffiliateCode(e.target.value)}
                    className="w-48 bg-[#0f172a] border border-[#222b3d] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <span className="text-sm">{selectedCustomer.affiliateCode || selectedCustomer.displayName?.toLowerCase().replace(/[^a-z0-9]/g, '') || selectedCustomer.id}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-4 border-b border-[#222b3d]">
                <span className="text-sm font-medium text-slate-400">Last Known IP</span>
                <span className="text-sm font-mono text-slate-400">{selectedCustomer.lastIp || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-4 border-b border-[#222b3d]">
                <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" /> Discord
                </span>
                {selectedCustomer.discordId ? (
                  <div className="text-right">
                    <div className="text-sm text-white">{selectedCustomer.discordUsername || 'Linked Account'}</div>
                    <div className="text-xs font-mono text-slate-500">{selectedCustomer.discordId}</div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Not Linked Yet</span>
                )}
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm font-medium text-slate-400">Last Known Country</span>
                <span className="text-sm text-slate-400">{selectedCustomer.lastCountry || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-slate-400" />
              </div>
              <span className="font-medium">Invoices Completed</span>
            </div>
            <span className="text-2xl font-bold">{selectedCustomer.ordersCount}</span>
          </div>
          <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-slate-400" />
              </div>
              <span className="font-medium">Total Spent</span>
            </div>
            <span className="text-2xl font-bold">${selectedCustomer.totalSpent.toFixed(2)}</span>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#222b3d] flex items-center gap-2 font-medium bg-[#1a2332]">
            <Receipt className="w-4 h-4 text-slate-400" /> Invoices
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-[#1a2332] uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">Products</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Paid</th>
                  <th className="px-6 py-4 font-medium">Payment Method</th>
                  <th className="px-6 py-4 font-medium">Promo Code</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {customerTx.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No invoices found.</td>
                  </tr>
                ) : (
                  customerTx.map(tx => (
                    <tr key={tx.id} className="border-b border-[#222b3d] hover:bg-[#1e293b]/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium border border-emerald-500/20">
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{tx.id}</td>
                      <td className="px-6 py-4 font-medium">{tx.productTitle || tx.productName || 'Top Up'}</td>
                      <td className="px-6 py-4">${tx.amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-emerald-400">+${tx.amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 capitalize flex items-center gap-2">
                        <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center text-[10px] font-bold text-white">
                          {(tx.method || tx.paymentMethod || 'S')[0].toUpperCase()}
                        </div>
                        {tx.method || tx.paymentMethod || 'Stripe'}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {tx.promoCode ? (
                          <div>
                            <span className="font-medium text-white">{tx.promoCode}</span>
                            {tx.promoDetails && <span className="text-xs ml-1 text-indigo-400">({tx.promoDetails})</span>}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-[#222b3d] text-xs text-slate-500 bg-[#1a2332]">
            Showing 1 to {customerTx.length} of {customerTx.length} results.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-white pb-12">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-slate-400 mt-1">Browse and manage your customers.</p>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#222b3d] flex flex-col sm:flex-row gap-4 justify-end bg-[#1a2332]">
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] border border-[#222b3d] rounded-lg text-sm font-medium hover:bg-[#273549] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] border border-[#222b3d] rounded-lg text-sm font-medium hover:bg-[#273549] transition-colors"
            >
              <Download className="w-4 h-4" /> Export to CSV
            </button>
            <div className="relative">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="appearance-none flex items-center gap-2 pl-9 pr-8 py-2 bg-[#1e293b] border border-[#222b3d] rounded-lg text-sm font-medium hover:bg-[#273549] transition-colors focus:outline-none focus:border-indigo-500 text-white"
              >
                <option value="all">All Customers</option>
                <option value="admin">Admins Only</option>
                <option value="has_orders">Has Purchases</option>
                <option value="no_orders">No Purchases</option>
              </select>
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Quick Search by E-mail" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 bg-[#0f172a] border border-[#222b3d] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 bg-[#1a2332] uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">E-mail Address</th>
                <th className="px-6 py-4 font-medium">Display Name</th>
                <th className="px-6 py-4 font-medium">Balance</th>
                <th className="px-6 py-4 font-medium">Total Spent</th>
                <th className="px-6 py-4 font-medium">Last Order</th>
                <th className="px-6 py-4 font-medium">Affiliate Code</th>
                <th className="px-6 py-4 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Loading customers...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">No customers found.</td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr 
                    key={customer.id} 
                    onClick={() => setSelectedCustomer(customer)}
                    className="border-b border-[#222b3d] hover:bg-[#1e293b]/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{customer.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 font-medium">{customer.email}</td>
                    <td className="px-6 py-4">{customer.displayName}</td>
                    <td className="px-6 py-4 font-medium">${(customer.balance || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">${customer.totalSpent.toFixed(2)}</div>
                      <div className="text-xs text-slate-500">{customer.ordersCount} orders</div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{customer.affiliateCode || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${customer.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-300'}`}>
                        {customer.role?.toUpperCase() || 'USER'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
