import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Download, Search } from 'lucide-react';
import { db } from '../../firebase';
import SEO from '../../components/SEO';

export default function AdminInvoices() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      const snap = await getDocs(collection(db, 'transactions'));
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
    };
    fetchTransactions();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return transactions.filter(tx => (
      tx.id.toLowerCase().includes(needle) ||
      (tx.productTitle || '').toLowerCase().includes(needle) ||
      (tx.method || '').toLowerCase().includes(needle) ||
      (tx.userId || '').toLowerCase().includes(needle)
    ));
  }, [transactions, search]);

  const exportCsv = () => {
    const rows = [
      ['ID', 'User ID', 'Item', 'Plan', 'Amount', 'Method', 'Date'],
      ...filtered.map(tx => [
        tx.id,
        tx.userId || '',
        tx.productTitle || 'ZXCHUB Key',
        tx.planName || '',
        Number(tx.amount || 0).toFixed(2),
        tx.method || '',
        tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''
      ])
    ];
    const blob = new Blob([rows.map(row => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zxchub-invoices.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-white">
      <SEO title="Invoices | ZXCHUB Admin" description="View ZXCHUB key purchases." />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Invoices</h1>
          <p className="mt-1 text-sm text-slate-400">All completed key purchases.</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoices..." className="w-full border border-slate-800 bg-[#0f172a] py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500" />
      </label>

      <div className="overflow-x-auto border border-slate-800">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[#111827] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-4">Order ID</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Item</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Method</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(tx => (
              <tr key={tx.id}>
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{tx.id}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{tx.userId}</td>
                <td className="px-5 py-4 font-bold">{tx.productTitle || 'ZXCHUB Key'}</td>
                <td className="px-5 py-4 text-slate-400">{tx.planName || '-'}</td>
                <td className="px-5 py-4 text-emerald-400">${Number(tx.amount || 0).toFixed(2)}</td>
                <td className="px-5 py-4 text-slate-400">{tx.method || 'Credit Card'}</td>
                <td className="px-5 py-4 text-slate-400">{new Date(tx.createdAt || Date.now()).toLocaleString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-600">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
