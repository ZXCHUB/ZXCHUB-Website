import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, Receipt, Download } from 'lucide-react';

export default function AdminInvoices() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'transactions'), (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      txs.sort((a, b) => b.createdAt - a.createdAt);
      setTransactions(txs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredTxs = transactions.filter(tx => 
    tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tx.productTitle || tx.productName || 'Top Up').toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['ID', 'User ID', 'Type', 'Product', 'Amount', 'Method', 'Promo Code', 'Promo Details', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredTxs.map(tx => [
        tx.id,
        tx.userId,
        tx.type || 'purchase',
        `"${(tx.productTitle || tx.productName || 'Top Up').replace(/"/g, '""')}"`,
        (tx.amount || 0).toFixed(2),
        tx.method || tx.paymentMethod || 'Stripe',
        tx.promoCode || '',
        `"${(tx.promoDetails || '').replace(/"/g, '""')}"`,
        new Date(tx.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-white pb-12">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-slate-400 mt-1">View all transactions across the platform.</p>
      </div>

      <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#222b3d] flex flex-col sm:flex-row gap-4 justify-between bg-[#1a2332]">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID, Product, User ID" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] border border-[#222b3d] rounded-lg text-sm font-medium hover:bg-[#273549] transition-colors"
          >
            <Download className="w-4 h-4" /> Export to CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 bg-[#1a2332] uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Invoice ID</th>
                <th className="px-6 py-4 font-medium">User ID</th>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Method</th>
                <th className="px-6 py-4 font-medium">Promo Code</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Loading invoices...</td>
                </tr>
              ) : filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-600" />
                      <p>No invoices found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTxs.map(tx => (
                  <tr key={tx.id} className="border-b border-[#222b3d] hover:bg-[#1e293b]/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium border border-emerald-500/20">
                        Completed
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{tx.id}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{tx.userId}</td>
                    <td className="px-6 py-4 font-medium">{tx.productTitle || tx.productName || 'Top Up'}</td>
                    <td className="px-6 py-4 text-emerald-400">+${(tx.amount || 0).toFixed(2)}</td>
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
          Showing {filteredTxs.length} results.
        </div>
      </div>
    </div>
  );
}
