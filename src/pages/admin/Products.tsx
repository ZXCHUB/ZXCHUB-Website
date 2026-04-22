import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trash2, Plus, Grip, Image as ImageIcon } from 'lucide-react';
import ImageCropper from '../../components/ImageCropper';
import SEO from '../../components/SEO';

type ProductImage = {
  id: string;
  url: string;
  width: number;
  x: number;
  y: number;
};

type ProductCustomTab = {
  id: string;
  title: string;
  content: string;
  images: ProductImage[];
};

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makeProductImage = (url = ''): ProductImage => ({
  id: makeId('image'),
  url,
  width: 45,
  x: 50,
  y: 140
});

const makeCustomTab = (): ProductCustomTab => ({
  id: makeId('tab'),
  title: '',
  content: '',
  images: []
});

const normalizeCustomTabs = (tabs: any[] = []): ProductCustomTab[] => (
  Array.isArray(tabs)
    ? tabs.slice(0, 5).map(tab => ({
      id: tab.id || makeId('tab'),
      title: tab.title || '',
      content: tab.content || '',
      images: Array.isArray(tab.images) ? tab.images : []
    }))
    : []
);

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [upsellProductIds, setUpsellProductIds] = useState<string[]>([]);
  const [customTabs, setCustomTabs] = useState<ProductCustomTab[]>([]);
  const [variants, setVariants] = useState<{id: string, name: string, price: number}[]>([
    { id: 'v1', name: 'Standard', price: 10 }
  ]);

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

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setImage('');
    setUpsellProductIds([]);
    setCustomTabs([]);
    setVariants([{ id: 'v1', name: 'Standard', price: 10 }]);
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description);
    setImage(p.image);
    setUpsellProductIds(p.upsellProductIds || []);
    setCustomTabs(normalizeCustomTabs(p.customTabs));
    setVariants(p.variants || []);
  };

  const updateCustomTab = (tabId: string, patch: Partial<ProductCustomTab>) => {
    setCustomTabs(tabs => tabs.map(tab => tab.id === tabId ? { ...tab, ...patch } : tab));
  };

  const updateCustomTabImage = (tabId: string, imageId: string, patch: Partial<ProductImage>) => {
    setCustomTabs(tabs => tabs.map(tab => (
      tab.id === tabId
        ? { ...tab, images: tab.images.map(image => image.id === imageId ? { ...image, ...patch } : image) }
        : tab
    )));
  };

  const addCustomTabImage = (tabId: string, url: string) => {
    setCustomTabs(tabs => tabs.map(tab => (
      tab.id === tabId
        ? { ...tab, images: [...tab.images, makeProductImage(url)] }
        : tab
    )));
  };

  const removeCustomTabImage = (tabId: string, imageId: string) => {
    setCustomTabs(tabs => tabs.map(tab => (
      tab.id === tabId
        ? { ...tab, images: tab.images.filter(image => image.id !== imageId) }
        : tab
    )));
  };

  const handleSave = async () => {
    if (!title || !image || variants.length === 0) return showToast("Title, image, and at least 1 variant are required.", "error");

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const cleanedTabs = customTabs
      .map(tab => ({
        ...tab,
        title: tab.title.trim(),
        content: tab.content.trim(),
        images: tab.images.filter(image => image.url)
      }))
      .filter(tab => tab.title || tab.content || tab.images.length > 0)
      .slice(0, 5);
    const data = { title, description, image, variants, slug, upsellProductIds, customTabs: cleanedTabs };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), data);
        setProducts(products.map(p => p.id === editingId ? { id: editingId, ...data } : p));
        showToast("Product updated!");
      } else {
        const docRef = await addDoc(collection(db, 'products'), data);
        setProducts([...products, { id: docRef.id, ...data }]);
        showToast("Product created!");
      }
      resetForm();
    } catch (e) {
      console.error(e);
      showToast("Failed to save product.", "error");
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      // Delete associated keys first
      const keysQ = query(collection(db, 'keys'), where('productId', '==', productToDelete.id));
      const keysSnap = await getDocs(keysQ);
      for (const k of keysSnap.docs) {
        await deleteDoc(doc(db, 'keys', k.id));
      }
      
      // Delete the product
      await deleteDoc(doc(db, 'products', productToDelete.id));
      setProducts(products.filter(prod => prod.id !== productToDelete.id));
      showToast("Product deleted successfully.");
    } catch (e) {
      console.error(e);
      showToast("Failed to delete product.", "error");
    }
    setProductToDelete(null);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <SEO title="Manage Products | Rumble Hub Admin" description="Manage your store's products." />
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Manage Products</h2>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-2">Delete Product?</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to delete "{productToDelete.title}"? All associated keys will be permanently deleted. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setProductToDelete(null)} className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={confirmDeleteProduct} className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Description (Markdown Supported)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white h-32 font-mono text-sm focus:outline-none focus:border-indigo-500" placeholder="**Bold**, *Italic*, # Heading, - List" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Product Image (16:9)</label>
            <ImageCropper 
              currentImage={image} 
              onImageCropped={(url) => setImage(url)} 
              aspectRatio={16/9}
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <label className="block text-sm font-semibold text-white">Custom Product Buttons</label>
                <p className="text-xs text-slate-500 mt-1">Create up to 5 extra tabs shown between Description and Reviews.</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomTabs(tabs => tabs.length >= 5 ? tabs : [...tabs, makeCustomTab()])}
                disabled={customTabs.length >= 5}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-500/30 px-3 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                Add Button
              </button>
            </div>

            {customTabs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 p-5 text-center text-sm text-slate-500">
                No custom buttons yet.
              </div>
            ) : (
              <div className="space-y-4">
                {customTabs.map((tab, tabIndex) => (
                  <div key={tab.id} className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">Button {tabIndex + 1}</div>
                      <button
                        type="button"
                        onClick={() => setCustomTabs(tabs => tabs.filter(item => item.id !== tab.id))}
                        className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                        title="Remove button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Button Name</label>
                        <input
                          value={tab.title}
                          onChange={e => updateCustomTab(tab.id, { title: e.target.value })}
                          placeholder="Setup, Features, FAQ..."
                          className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Content</label>
                        <textarea
                          value={tab.content}
                          onChange={e => updateCustomTab(tab.id, { content: e.target.value })}
                          className="min-h-36 w-full resize-y rounded-lg border border-slate-800 bg-[#0f172a] p-3 font-mono text-sm text-white outline-none transition-colors focus:border-indigo-500"
                          placeholder="Write text for this button. Line breaks are preserved."
                        />
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                          <ImageIcon className="w-4 h-4 text-indigo-400" />
                          Images
                        </div>
                        <ImageCropper
                          currentImage=""
                          onImageCropped={url => addCustomTabImage(tab.id, url)}
                          aspectRatio={16 / 9}
                        />

                        {tab.images.length > 0 && (
                          <div className="mt-4 space-y-4">
                            {tab.images.map((image, imageIndex) => (
                              <div key={image.id} className="rounded-lg border border-slate-800 bg-[#111827] p-3">
                                <div className="mb-3 flex items-center justify-between">
                                  <div className="text-xs font-semibold text-slate-300">Image {imageIndex + 1}</div>
                                  <button
                                    type="button"
                                    onClick={() => removeCustomTabImage(tab.id, image.id)}
                                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                                    title="Remove image"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <label className="text-xs font-medium text-slate-400">
                                  Size: {image.width}%
                                  <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={image.width}
                                    onChange={e => updateCustomTabImage(tab.id, image.id, { width: Number(e.target.value) })}
                                    className="mt-2 w-full accent-indigo-500"
                                  />
                                </label>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                  <label className="text-xs font-medium text-slate-400">
                                    X: {image.x}%
                                    <input type="number" value={image.x} onChange={e => updateCustomTabImage(tab.id, image.id, { x: Number(e.target.value) })} className="mt-1 w-full rounded border border-slate-800 bg-[#0f172a] px-2 py-1 text-white" />
                                  </label>
                                  <label className="text-xs font-medium text-slate-400">
                                    Y: {image.y}px
                                    <input type="number" value={image.y} onChange={e => updateCustomTabImage(tab.id, image.id, { y: Number(e.target.value) })} className="mt-1 w-full rounded border border-slate-800 bg-[#0f172a] px-2 py-1 text-white" />
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div data-product-tab-preview={tab.id} className="relative min-h-72 overflow-hidden rounded-lg border border-slate-800 bg-[#0b1020] p-5">
                        <div className="mb-4 text-xs uppercase tracking-wider text-slate-500">Preview</div>
                        <div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                          {tab.content || 'Text for this button will appear here.'}
                        </div>
                        {tab.images.map(image => (
                          image.url ? (
                            <div
                              key={image.id}
                              className="absolute select-none"
                              style={{
                                width: `${image.width}%`,
                                left: `${image.x}%`,
                                top: `${image.y}px`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                              <img src={image.url} alt="" draggable={false} className="pointer-events-none w-full select-none rounded-lg border border-slate-800 object-contain shadow-2xl" />
                              <button
                                type="button"
                                className="absolute -right-3 -top-3 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-full border border-indigo-400/50 bg-indigo-600 text-white shadow-lg active:cursor-grabbing"
                                title="Drag image"
                                onPointerMove={e => {
                                  if (e.buttons !== 1) return;
                                  const preview = e.currentTarget.closest('[data-product-tab-preview]') as HTMLElement | null;
                                  if (!preview) return;
                                  const rect = preview.getBoundingClientRect();
                                  const nextX = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
                                  const nextY = Math.max(0, e.clientY - rect.top);
                                  updateCustomTabImage(tab.id, image.id, { x: Math.round(nextX), y: Math.round(nextY) });
                                }}
                                onPointerDown={e => {
                                  e.preventDefault();
                                  e.currentTarget.setPointerCapture(e.pointerId);
                                }}
                              >
                                <Grip className="h-4 w-4" />
                              </button>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Product Upsells</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {products
                .filter(product => product.id !== editingId)
                .map(product => (
                  <label key={product.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0f172a] p-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={upsellProductIds.includes(product.id)}
                      onChange={e => {
                        setUpsellProductIds(current => (
                          e.target.checked
                            ? [...current, product.id]
                            : current.filter(id => id !== product.id)
                        ));
                      }}
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                    />
                    {product.image && <img src={product.image} alt={product.title} className="w-9 h-9 rounded-md object-cover bg-slate-900" />}
                    <span className="truncate">{product.title}</span>
                  </label>
                ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Shown on the product page as recommended add-ons.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Variants (e.g., 1 Day, 1 Week)</label>
            {variants.map((v, i) => (
              <div key={v.id} className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={v.name} 
                  onChange={e => {
                    const newV = [...variants];
                    newV[i].name = e.target.value;
                    setVariants(newV);
                  }}
                  placeholder="Variant Name"
                  className="flex-1 bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                />
                <input 
                  type="number" 
                  value={v.price} 
                  onChange={e => {
                    const newV = [...variants];
                    newV[i].price = parseFloat(e.target.value) || 0;
                    setVariants(newV);
                  }}
                  placeholder="Price"
                  className="w-24 bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                />
                <button 
                  onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button 
              onClick={() => setVariants([...variants, { id: `v${Date.now()}`, name: '', price: 0 }])}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 mt-2"
            >
              <Plus className="w-4 h-4" /> Add Variant
            </button>
          </div>

          <div className="flex gap-2 pt-4">
            <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              {editingId ? 'Update Product' : 'Create Product'}
            </button>
            {editingId && (
              <button onClick={resetForm} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {products.map(p => (
          <div key={p.id} className="bg-[#1e293b] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={p.image} alt={p.title} className="w-16 h-16 object-cover rounded-lg bg-[#0f172a]" />
              <div>
                <div className="font-bold text-white">{p.title}</div>
                <div className="text-sm text-slate-400">{p.variants?.length || 0} variants</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(p)} className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
                Edit
              </button>
              <button 
                onClick={() => setProductToDelete(p)} 
                className="text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
