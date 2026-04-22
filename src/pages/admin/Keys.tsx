import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trash2 } from 'lucide-react';

export default function AdminKeys() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [keysInput, setKeysInput] = useState('');
  const [existingKeys, setExistingKeys] = useState<any[]>([]);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, 'products'));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchKeys = async () => {
      if (!selectedProductId || !selectedVariantId) {
        setExistingKeys([]);
        return;
      }
      const q = query(
        collection(db, 'keys'), 
        where('productId', '==', selectedProductId),
        where('variantId', '==', selectedVariantId)
      );
      const snap = await getDocs(q);
      const now = Date.now();
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      const keys = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const validKeys = [];
      
      for (const k of keys) {
        if (k.deletedByAdmin) continue;
        if (k.isSold && k.purchasedAt) {
          const purchaseTime = new Date(k.purchasedAt).getTime();
          if (now - purchaseTime > SEVEN_DAYS) {
            try {
              await updateDoc(doc(db, 'keys', k.id), { deletedByAdmin: true });
            } catch (e) {
              console.error("Failed to hide old key", e);
            }
            continue;
          }
        }
        validKeys.push(k);
      }
      setExistingKeys(validKeys);
    };
    fetchKeys();
  }, [selectedProductId, selectedVariantId]);

  const handleAddKeys = async () => {
    if (!selectedProductId || !selectedVariantId || !keysInput.trim()) return showToast("Select product, variant and enter keys.", "error");

    const product = products.find(p => p.id === selectedProductId);
    const variant = product?.variants?.find((v: any) => v.id === selectedVariantId);
    if (!product || !variant) return;

    const newKeys = keysInput.split('\n').map(k => k.trim()).filter(k => k);
    
    try {
      for (const k of newKeys) {
        await addDoc(collection(db, 'keys'), {
          productId: product.id,
          variantId: variant.id,
          productName: product.title,
          variantName: variant.name,
          keyString: k,
          isSold: false,
          ownerId: null,
          purchasedAt: null
        });
      }
      setKeysInput('');
      showToast(`Successfully added ${newKeys.length} keys!`);
      
      // Refresh keys list
      const q = query(collection(db, 'keys'), where('productId', '==', selectedProductId), where('variantId', '==', selectedVariantId));
      const snap = await getDocs(q);
      setExistingKeys(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((k: any) => !k.deletedByAdmin));
    } catch (e) {
      console.error(e);
      showToast("Failed to add keys.", "error");
    }
  };

  const confirmDeleteKey = async () => {
    if (!keyToDelete) return;
    try {
      const keyDoc = existingKeys.find(k => k.id === keyToDelete);
      if (keyDoc?.isSold) {
        await updateDoc(doc(db, 'keys', keyToDelete), { deletedByAdmin: true });
      } else {
        await deleteDoc(doc(db, 'keys', keyToDelete));
      }
      setExistingKeys(existingKeys.filter(k => k.id !== keyToDelete));
      showToast("Key deleted from inventory.");
    } catch (e) {
      console.error(e);
      showToast("Failed to delete key.", "error");
    }
    setKeyToDelete(null);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <h2 className="text-2xl font-bold text-white mb-6">Manage Keys (Inventory)</h2>

      {/* Delete Key Modal */}
      {keyToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-2">Delete Key?</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to delete this key? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setKeyToDelete(null)} className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={confirmDeleteKey} className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Select Product</label>
          <select 
            value={selectedProductId} 
            onChange={e => {
              setSelectedProductId(e.target.value);
              setSelectedVariantId('');
            }}
            className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Choose Product --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Select Variant</label>
          <select 
            value={selectedVariantId} 
            onChange={e => setSelectedVariantId(e.target.value)}
            disabled={!selectedProductId}
            className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="">-- Choose Variant --</option>
            {selectedProduct?.variants?.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name} (${v.price})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedProductId && selectedVariantId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Keys */}
          <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Add New Keys</h3>
            <p className="text-sm text-slate-400 mb-2">Enter one key per line.</p>
            <textarea 
              value={keysInput}
              onChange={e => setKeysInput(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white h-48 font-mono text-sm mb-4 focus:outline-none focus:border-indigo-500"
              placeholder="XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY"
            />
            <button 
              onClick={handleAddKeys}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add Keys
            </button>
          </div>

          {/* Existing Keys */}
          <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex justify-between items-center">
              Inventory
              <span className="text-sm font-normal text-slate-400">
                {existingKeys.filter(k => !k.isSold).length} Available / {existingKeys.length} Total
              </span>
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-2">
              {existingKeys.length === 0 ? (
                <div className="text-slate-500 text-sm italic">No keys found for this variant.</div>
              ) : (
                existingKeys.map(k => (
                  <div key={k.id} className="flex items-center justify-between bg-[#0f172a] border border-slate-800 rounded-lg p-3">
                    <div>
                      <div className="font-mono text-sm text-slate-300">{k.keyString}</div>
                      <div className={`text-xs mt-1 ${k.isSold ? 'text-red-400' : 'text-emerald-400'}`}>
                        {k.isSold ? 'Sold' : 'Available'}
                      </div>
                    </div>
                    <button 
                      onClick={() => setKeyToDelete(k.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
