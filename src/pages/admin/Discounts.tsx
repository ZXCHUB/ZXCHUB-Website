import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BadgePercent, HandCoins, Save, Star } from 'lucide-react';
import { db } from '../../firebase';
import SEO from '../../components/SEO';

const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

export default function AdminDiscounts() {
  const [reviewDiscountPercent, setReviewDiscountPercent] = useState(5);
  const [affiliateCommissionPercent, setAffiliateCommissionPercent] = useState(20);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'discounts'));
        if (snap.exists()) {
          const data = snap.data() as any;
          setReviewDiscountPercent(clampPercent(Number(data.reviewDiscountPercent ?? 5)));
          setAffiliateCommissionPercent(clampPercent(Number(data.affiliateCommissionPercent ?? 20)));
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchDiscounts();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'discounts'), {
        reviewDiscountPercent: clampPercent(reviewDiscountPercent),
        affiliateCommissionPercent: clampPercent(affiliateCommissionPercent),
        updatedAt: Date.now()
      }, { merge: true });
      showToast('Discount settings saved.');
    } catch (error) {
      console.error(error);
      showToast('Failed to save discount settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <SEO title="Discount Settings | Rumble Hub Admin" description="Configure review rewards and affiliate commission settings." />
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-3">
            <BadgePercent className="w-3.5 h-3.5" />
            Settings
          </div>
          <h2 className="text-2xl font-bold text-white">Discounts</h2>
          <p className="text-sm text-slate-400 mt-1">Control reward discounts and affiliate payouts from one place.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSaving ? <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
          Save Discounts
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[#1e293b] border border-slate-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-white font-bold">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                Review Reward
              </div>
              <p className="text-sm text-slate-400 mt-2">Customers with a 4+ star review get this discount on their next order.</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xl font-bold text-emerald-300">
              {reviewDiscountPercent}%
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="50"
            value={reviewDiscountPercent}
            onChange={e => setReviewDiscountPercent(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-400 mb-1">Review discount percent</label>
            <input
              type="number"
              min="0"
              max="100"
              value={reviewDiscountPercent}
              onChange={e => setReviewDiscountPercent(clampPercent(Number(e.target.value)))}
              className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="mt-5 rounded-lg border border-slate-800 bg-[#0f172a] p-4 text-sm text-slate-300">
            Store text will say: <span className="text-white">Leave feedback with at least 4 stars to unlock {reviewDiscountPercent}% off your next purchase.</span>
          </div>
        </section>

        <section className="bg-[#1e293b] border border-slate-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-white font-bold">
                <HandCoins className="w-5 h-5 text-indigo-400" />
                Affiliate Promocode
              </div>
              <p className="text-sm text-slate-400 mt-2">When an affiliate promocode is used, the owner receives this percent from the paid order amount.</p>
            </div>
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xl font-bold text-indigo-300">
              {affiliateCommissionPercent}%
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="50"
            value={affiliateCommissionPercent}
            onChange={e => setAffiliateCommissionPercent(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-400 mb-1">Affiliate commission percent</label>
            <input
              type="number"
              min="0"
              max="100"
              value={affiliateCommissionPercent}
              onChange={e => setAffiliateCommissionPercent(clampPercent(Number(e.target.value)))}
              className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="mt-5 rounded-lg border border-slate-800 bg-[#0f172a] p-4 text-sm text-slate-300">
            Example: from a $10 paid order, affiliate receives <span className="text-white">${(10 * affiliateCommissionPercent / 100).toFixed(2)}</span>.
          </div>
        </section>
      </div>
    </div>
  );
}
