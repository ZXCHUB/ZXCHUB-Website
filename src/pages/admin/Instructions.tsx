import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { BookOpen, Check, Grip, Image as ImageIcon, Search, Save, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import SEO from '../../components/SEO';
import ImageCropper from '../../components/ImageCropper';

const makeInstructionImage = (url = '') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  url,
  width: 45,
  x: 50,
  y: 140
});

const normalizeImages = (product: any) => {
  if (Array.isArray(product.instructionImages)) return product.instructionImages;
  if (product.instructionImage?.url) return [{ id: 'legacy-image', ...product.instructionImage }];
  return [];
};

export default function AdminInstructions() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [instructionImages, setInstructionImages] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const selectedProduct = products.find(product => product.id === selectedId);
  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(product => product.title?.toLowerCase().includes(needle));
  }, [products, search]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, 'products'));
      const list: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(list);
      if (list[0]) {
        setSelectedId(list[0].id);
        setInstructions(list[0].instructions || '');
        setInstructionImages(normalizeImages(list[0]));
      }
    };
    fetchProducts();
  }, []);

  const handleSelectProduct = (product: any) => {
    setSelectedId(product.id);
    setInstructions(product.instructions || '');
    setInstructionImages(normalizeImages(product));
  };

  const updateImage = (id: string, patch: Record<string, any>) => {
    setInstructionImages(images => images.map(image => image.id === id ? { ...image, ...patch } : image));
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        instructions,
        instructionImages,
        instructionImage: instructionImages[0] || null,
        updatedAt: Date.now()
      });
      setProducts(products.map(product => (
        product.id === selectedProduct.id ? { ...product, instructions, instructionImages, instructionImage: instructionImages[0] || null } : product
      )));
      showToast('Instructions saved.');
    } catch (error) {
      console.error(error);
      showToast('Failed to save instructions.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <SEO title="Product Instructions | Rumble Hub Admin" description="Manage delivery instructions for every product." />
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            Products
          </div>
          <h2 className="text-2xl font-bold text-white">Instructions</h2>
          <p className="text-sm text-slate-400 mt-1">Pick a product and write the delivery guide shown after purchase.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!selectedProduct || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSaving ? <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
          Save Instructions
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="bg-[#1e293b] border border-slate-800 rounded-xl p-4 h-fit">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Product</label>
          <div className="relative mt-3 mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product"
              className="w-full bg-[#0f172a] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filteredProducts.map(product => {
              const isSelected = product.id === selectedId;
              return (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-800 bg-[#0f172a] hover:border-slate-700'
                  }`}
                >
                  {product.image && <img src={product.image} alt={product.title} className="w-12 h-12 rounded-lg object-cover bg-slate-900" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{product.title}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      {product.instructions ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Instructions added
                        </>
                      ) : (
                        'No instructions yet'
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredProducts.length === 0 && <div className="text-sm text-slate-500 italic">No products found.</div>}
          </div>
        </aside>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-white">Delivery Instructions</label>
              {selectedProduct && <span className="text-xs text-slate-500">{selectedProduct.title}</span>}
            </div>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="min-h-[520px] w-full resize-y rounded-lg border border-slate-800 bg-[#0f172a] p-4 font-mono text-sm text-white outline-none transition-colors focus:border-indigo-500"
              placeholder="Setup guide, Discord steps, redemption notes, links..."
            />
            <p className="mt-3 text-xs text-slate-500">Line breaks are preserved exactly as written. This text is also included in the downloadable .txt file.</p>

            <div className="mt-6 rounded-xl border border-slate-800 bg-[#0f172a] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  Instruction Image
                </div>
                {instructionImages.length > 0 && (
                  <button
                    onClick={() => setInstructionImages([])}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                    title="Remove all images"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <ImageCropper
                currentImage=""
                onImageCropped={url => setInstructionImages(images => [...images, makeInstructionImage(url)])}
                aspectRatio={16 / 9}
              />
              {instructionImages.length > 0 && (
                <div className="mt-4 space-y-4">
                  {instructionImages.map((image, index) => (
                    <div key={image.id} className="rounded-lg border border-slate-800 bg-[#111827] p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-300">Image {index + 1}</div>
                        <button
                          onClick={() => setInstructionImages(images => images.filter(item => item.id !== image.id))}
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
                          onChange={e => updateImage(image.id, { width: Number(e.target.value) })}
                          className="mt-2 w-full accent-indigo-500"
                        />
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="text-xs font-medium text-slate-400">
                          X: {image.x}%
                          <input type="number" value={image.x} onChange={e => updateImage(image.id, { x: Number(e.target.value) })} className="mt-1 w-full rounded border border-slate-800 bg-[#0f172a] px-2 py-1 text-white" />
                        </label>
                        <label className="text-xs font-medium text-slate-400">
                          Y: {image.y}px
                          <input type="number" value={image.y} onChange={e => updateImage(image.id, { y: Number(e.target.value) })} className="mt-1 w-full rounded border border-slate-800 bg-[#0f172a] px-2 py-1 text-white" />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-5">
            <div className="mb-3 text-sm font-semibold text-white">Customer Preview</div>
            <div data-instruction-preview="true" className="relative min-h-[520px] rounded-lg border border-slate-800 bg-[#0f172a] p-5 overflow-hidden">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-4">Instructions</div>
              <div className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-300">
                {instructions || 'No special instructions were added for this product.'}
              </div>
              {instructionImages.map(image => (
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
                    <img
                      src={image.url}
                      alt="Instruction"
                      draggable={false}
                      className="pointer-events-none w-full select-none rounded-lg border border-slate-800 object-contain shadow-2xl"
                    />
                    <button
                      type="button"
                      className="absolute -right-3 -top-3 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-full border border-indigo-400/50 bg-indigo-600 text-white shadow-lg active:cursor-grabbing"
                      title="Drag image"
                      onPointerMove={e => {
                        if (e.buttons !== 1) return;
                        const preview = e.currentTarget.closest('[data-instruction-preview="true"]') as HTMLElement | null;
                        if (!preview) return;
                        const rect = preview.getBoundingClientRect();
                        const nextX = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
                        const nextY = Math.max(0, e.clientY - rect.top);
                        updateImage(image.id, { x: Math.round(nextX), y: Math.round(nextY) });
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
        </section>
      </div>
    </div>
  );
}
