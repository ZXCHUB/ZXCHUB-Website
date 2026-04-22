import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Box, Trash2, TrendingUp, DollarSign, Users } from 'lucide-react';

export default function AdminPromoCodes() {
  const [promos, setPromos] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [affiliateCommissionPercent, setAffiliateCommissionPercent] = useState(20);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'balance' | 'discount'>('balance');
  const [value, setValue] = useState(10);
  const [maxUses, setMaxUses] = useState(100);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(1);
  const [productScope, setProductScope] = useState<'all' | 'product'>('all');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateEmail, setAffiliateEmail] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      const [promosSnap, txSnap, productsSnap, discountsSnap] = await Promise.all([
        getDocs(collection(db, 'promocodes')),
        getDocs(collection(db, 'transactions')),
        getDocs(collection(db, 'products')),
        getDoc(doc(db, 'settings', 'discounts'))
      ]);
      setPromos(promosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const productList = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(productList);
      if (productList[0]) setSelectedProductId(productList[0].id);
      if (discountsSnap.exists()) {
        setAffiliateCommissionPercent(Number((discountsSnap.data() as any).affiliateCommissionPercent ?? 20));
      }
    };
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!code || value <= 0) return showToast("Invalid code or value", "error");
    if (isAffiliate && !affiliateEmail) return showToast("Enter affiliate email", "error");
    if (type === 'discount' && productScope === 'product' && !selectedProductId) {
      return showToast("Choose a product for this promo code", "error");
    }
    const scopedProduct = products.find(product => product.id === selectedProductId);
    try {
      const newPromo = {
        code: code.toUpperCase(),
        type,
        value,
        maxUses,
        maxUsesPerUser,
        productScope: type === 'discount' ? productScope : 'all',
        productId: type === 'discount' && productScope === 'product' ? selectedProductId : null,
        productTitle: type === 'discount' && productScope === 'product' ? scopedProduct?.title || 'Selected product' : null,
        uses: 0,
        usedBy: {}, // Map of uid -> count
        isAffiliate,
        affiliateEmail: isAffiliate ? affiliateEmail.toLowerCase() : null,
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'promocodes'), newPromo);
      setPromos([...promos, { id: docRef.id, ...newPromo }]);
      setCode('');
      setProductScope('all');
      setIsAffiliate(false);
      setAffiliateEmail('');
      showToast("Promo code created!");
    } catch (e) {
      console.error(e);
      showToast("Failed to create promo code", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'promocodes', id));
      setPromos(promos.filter(p => p.id !== id));
      showToast("Promo code deleted");
    } catch (e) {
      console.error(e);
      showToast("Failed to delete promo code", "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <h2 className="text-2xl font-bold text-white mb-6">Manage Promo Codes</h2>
      
      <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Create Promo Code</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">Code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white uppercase focus:outline-none focus:border-indigo-500" placeholder="SUMMER50" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500">
              <option value="balance">Balance ($)</option>
              <option value="discount">Discount (%)</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">Value</label>
            <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" min="1" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">Total Uses (0 = ∞)</label>
            <input type="number" value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" min="0" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">Uses/User (0 = ∞)</label>
            <input type="number" value={maxUsesPerUser} onChange={e => setMaxUsesPerUser(Number(e.target.value))} className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" min="0" />
          </div>
        </div>

        {type === 'discount' && (
          <div className="mb-4 rounded-xl border border-slate-800 bg-[#0f172a] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <Box className="w-4 h-4 text-indigo-400" />
              Product Scope
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Applies To</label>
                <select
                  value={productScope}
                  onChange={e => setProductScope(e.target.value as 'all' | 'product')}
                  className="w-full bg-[#111827] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Products</option>
                  <option value="product">One Product Only</option>
                </select>
              </div>
              {productScope === 'product' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Product</label>
                  <select
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.title}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">In cart checkout, the discount only affects this product.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox" 
              id="adminIsAffiliate"
              checked={isAffiliate}
              onChange={e => setIsAffiliate(e.target.checked)}
              className="rounded border-slate-800 bg-[#0f172a] text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="adminIsAffiliate" className="text-sm text-slate-400">Is Affiliate Promocode?</label>
          </div>
          {isAffiliate && (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-slate-400 mb-1">Affiliate Email</label>
              <input 
                type="email" 
                value={affiliateEmail}
                onChange={e => setAffiliateEmail(e.target.value)}
                placeholder="Enter affiliate's email"
                className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        <button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Create Code
        </button>
      </div>

      <div className="space-y-4">
        {promos.map(p => {
          const promoTx = transactions.filter(tx => tx.promoCode === p.code);
          let totalEarnings = 0;
          let totalSavings = 0;

          promoTx.forEach(tx => {
            totalEarnings += (tx.amount || 0);
            if (p.type === 'discount') {
              totalSavings += Number(tx.discountAmount || 0);
            } else if (p.type === 'balance') {
              totalSavings += p.value;
            }
          });

          return (
            <div key={p.id} className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xl">{p.code}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    {p.type === 'balance' ? `Adds $${p.value}` : `${p.value}% Discount`} &bull; 
                    Scope: {p.productScope === 'product' ? p.productTitle || 'One product' : 'All products'} &bull; 
                    Uses: {p.uses} / {p.maxUses === 0 ? '∞' : p.maxUses} &bull; 
                    Per User: {p.maxUsesPerUser === 0 ? '∞' : p.maxUsesPerUser}
                    {p.isAffiliate && <span className="ml-2 text-indigo-400">&bull; Affiliate: {p.affiliateEmail}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className={`grid grid-cols-1 ${p.isAffiliate ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 pt-4 border-t border-slate-800/50`}>
                <div className="bg-[#0f172a] rounded-lg p-4 flex items-center gap-3">
                  <div className="bg-indigo-500/10 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Total Uses</div>
                    <div className="text-lg font-bold text-white">{p.uses}</div>
                  </div>
                </div>
                <div className="bg-[#0f172a] rounded-lg p-4 flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-2 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Total Earnings</div>
                    <div className="text-lg font-bold text-white">${totalEarnings.toFixed(2)}</div>
                  </div>
                </div>
                <div className="bg-[#0f172a] rounded-lg p-4 flex items-center gap-3">
                  <div className="bg-amber-500/10 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Total Savings (Users)</div>
                    <div className="text-lg font-bold text-white">${totalSavings.toFixed(2)}</div>
                  </div>
                </div>
                {p.isAffiliate && (
                  <div className="bg-[#0f172a] rounded-lg p-4 flex items-center gap-3">
                    <div className="bg-purple-500/10 p-2 rounded-lg">
                      <DollarSign className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Affiliate Earned</div>
                      <div className="text-lg font-bold text-white">${(totalEarnings * (affiliateCommissionPercent / 100)).toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {promos.length === 0 && (
          <div className="text-slate-500 text-sm italic">No promo codes active.</div>
        )}
      </div>
    </div>
  );
}
