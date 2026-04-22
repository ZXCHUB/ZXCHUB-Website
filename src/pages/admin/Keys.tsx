import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { KeyRound, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { PAID_WEB_KEY_PLANS, ZXCHUB_KEY_PRODUCT_ID } from '../../keyPlans';

export default function AdminKeys() {
  const [selectedPlanId, setSelectedPlanId] = useState(PAID_WEB_KEY_PLANS[0].id);
  const [keysInput, setKeysInput] = useState('');
  const [keys, setKeys] = useState<any[]>([]);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const selectedPlan = PAID_WEB_KEY_PLANS.find(plan => plan.id === selectedPlanId) || PAID_WEB_KEY_PLANS[0];
  const visibleKeys = useMemo(() => keys.filter(key => key.variantId === selectedPlan.id && !key.deletedByAdmin), [keys, selectedPlan.id]);
  const availableCount = visibleKeys.filter(key => !key.isSold).length;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchKeys = async () => {
    const snap = await getDocs(query(collection(db, 'keys'), where('productId', '==', ZXCHUB_KEY_PRODUCT_ID)));
    setKeys(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKeys = async () => {
    const cleanKeys = keysInput.split('\n').map(key => key.trim()).filter(Boolean);
    if (cleanKeys.length === 0) return showToast('Enter at least one key.', 'error');

    try {
      await Promise.all(cleanKeys.map(keyString => addDoc(collection(db, 'keys'), {
        productId: ZXCHUB_KEY_PRODUCT_ID,
        variantId: selectedPlan.id,
        productName: 'ZXCHUB Key',
        variantName: selectedPlan.name,
        keyString,
        isSold: false,
        ownerId: null,
        ownerName: '',
        ownerPhoto: '',
        purchasedAt: null,
        price: selectedPlan.price,
        createdAt: Date.now()
      })));
      setKeysInput('');
      await fetchKeys();
      showToast(`Added ${cleanKeys.length} ${selectedPlan.name} keys.`);
    } catch (error) {
      console.error(error);
      showToast('Failed to add keys.', 'error');
    }
  };

  const confirmDeleteKey = async () => {
    if (!keyToDelete) return;
    const target = keys.find(key => key.id === keyToDelete);
    try {
      if (target?.isSold) {
        await updateDoc(doc(db, 'keys', keyToDelete), { deletedByAdmin: true });
      } else {
        await deleteDoc(doc(db, 'keys', keyToDelete));
      }
      setKeys(current => current.filter(key => key.id !== keyToDelete));
      showToast('Key removed from inventory.');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete key.', 'error');
    } finally {
      setKeyToDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl text-white">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}

      {keyToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md border border-white/10 bg-[#101016] p-6">
            <h3 className="text-xl font-black">Delete Key?</h3>
            <p className="mt-2 text-sm text-zinc-400">Sold keys are hidden from admin inventory, unsold keys are permanently deleted.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setKeyToDelete(null)} className="px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5">Cancel</button>
              <button onClick={confirmDeleteKey} className="bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-300">
          <KeyRound className="h-3.5 w-3.5" /> Key Inventory
        </div>
        <h1 className="text-3xl font-black">ZXCHUB Keys</h1>
        <p className="mt-1 text-sm text-zinc-400">Add unique keys for each plan. Once sold, a key is marked as sold and cannot be delivered to another customer.</p>
      </div>

      <div className="mb-8 grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
        {PAID_WEB_KEY_PLANS.map(plan => {
          const planKeys = keys.filter(key => key.variantId === plan.id && !key.deletedByAdmin);
          const free = planKeys.filter(key => !key.isSold).length;
          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`bg-[#08080b] p-5 text-left transition ${selectedPlanId === plan.id ? 'shadow-[inset_0_0_0_1px_rgba(239,68,68,.9)]' : 'hover:bg-[#101016]'}`}
            >
              <div className="text-lg font-black">{plan.name}</div>
              <div className="mt-2 text-sm text-zinc-500">${plan.price.toFixed(2)}</div>
              <div className="mt-4 text-2xl font-black text-red-400">{free}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-600">available / {planKeys.length} total</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
        <section className="border border-white/10 bg-[#08080b] p-6">
          <h2 className="text-xl font-black">Add {selectedPlan.name} Keys</h2>
          <p className="mt-2 text-sm text-zinc-500">Paste one key per line.</p>
          <textarea
            value={keysInput}
            onChange={event => setKeysInput(event.target.value)}
            className="mt-5 min-h-72 w-full resize-y border border-white/10 bg-black p-4 font-mono text-sm text-white outline-none focus:border-red-500"
            placeholder="ZXCHUB-XXXX-XXXX-XXXX&#10;ZXCHUB-YYYY-YYYY-YYYY"
          />
          <button onClick={handleAddKeys} className="mt-5 w-full bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-500">
            Add Keys
          </button>
        </section>

        <section className="border border-white/10 bg-[#08080b] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">{selectedPlan.name} Inventory</h2>
            <span className="text-sm font-bold text-zinc-500">{availableCount} available / {visibleKeys.length} total</span>
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
            {visibleKeys.map(key => (
              <div key={key.id} className="flex items-center justify-between gap-4 border border-white/10 bg-black p-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm text-zinc-200">{key.keyString}</div>
                  <div className={`mt-1 text-xs font-black uppercase ${key.isSold ? 'text-red-400' : 'text-emerald-400'}`}>
                    {key.isSold ? `Sold${key.ownerName ? ` to ${key.ownerName}` : ''}` : 'Available'}
                  </div>
                </div>
                <button onClick={() => setKeyToDelete(key.id)} className="p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {visibleKeys.length === 0 && <div className="py-12 text-center text-sm text-zinc-600">No keys in this category yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
