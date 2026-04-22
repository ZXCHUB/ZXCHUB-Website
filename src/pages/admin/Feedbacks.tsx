import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Star, Search, Filter, Trash2, Edit2, Check, X, MessageSquare } from 'lucide-react';

export default function AdminFeedbacks() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const pSnap = await getDocs(collection(db, 'products'));
        const pMap: Record<string, any> = {};
        pSnap.docs.forEach(d => {
          pMap[d.id] = d.data();
        });
        setProducts(pMap);
      } catch (e) {
        console.error("Failed to fetch products", e);
      }
    };
    fetchProducts();

    const unsub = onSnapshot(collection(db, 'reviews'), (snap) => {
      const revs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      revs.sort((a, b) => b.createdAt - a.createdAt);
      setReviews(revs);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
      showToast('Feedback deleted successfully');
    } catch (e) {
      console.error(e);
      showToast('Failed to delete feedback', 'error');
    }
  };

  const startEdit = (review: any) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditText(review.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reviews', id), {
        rating: editRating,
        text: editText,
        isAuto: false // If admin edits it, it's no longer considered auto
      });
      setEditingId(null);
      showToast('Feedback updated successfully');
    } catch (e) {
      console.error(e);
      showToast('Failed to update feedback', 'error');
    }
  };

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = r.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterProduct !== 'all' && r.productId !== filterProduct) return false;
    
    return true;
  });

  const uniqueProducts = Array.from(new Set(reviews.map(r => r.productId))).map(id => ({
    id,
    title: products[id]?.title || 'Unknown Product'
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-white pb-12">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Feedbacks</h1>
        <p className="text-sm text-slate-400 mt-1">Manage customer reviews and feedback.</p>
      </div>

      <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#222b3d] flex flex-col sm:flex-row gap-4 justify-between bg-[#1a2332]">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by text, name, email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="relative">
              <select
                value={filterProduct}
                onChange={e => setFilterProduct(e.target.value)}
                className="appearance-none flex items-center gap-2 pl-9 pr-8 py-2 bg-[#1e293b] border border-[#222b3d] rounded-lg text-sm font-medium hover:bg-[#273549] transition-colors focus:outline-none focus:border-indigo-500 text-white"
              >
                <option value="all">All Products</option>
                {uniqueProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 bg-[#1a2332] uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Rating</th>
                <th className="px-6 py-4 font-medium">Message</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading feedbacks...</td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MessageSquare className="w-8 h-8 text-slate-600" />
                      <p>No feedbacks found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReviews.map(review => {
                  const isEditing = editingId === review.id;
                  const product = products[review.productId];
                  const productName = product ? product.title : 'Unknown Product';

                  return (
                    <tr key={review.id} className="border-b border-[#222b3d] hover:bg-[#1e293b]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{review.userName || 'Anonymous'}</div>
                        <div className="text-xs text-slate-400 font-mono">{review.userEmail || review.userId || '-'}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {productName}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select 
                            value={editRating} 
                            onChange={e => setEditRating(Number(e.target.value))}
                            className="bg-[#0f172a] border border-[#222b3d] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Stars</option>)}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-indigo-500 fill-indigo-500' : 'text-slate-600'}`} />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <textarea 
                            value={editText} 
                            onChange={e => setEditText(e.target.value)}
                            className="w-full min-w-[250px] bg-[#0f172a] border border-[#222b3d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            rows={3}
                          />
                        ) : (
                          <div className={`max-w-md break-words ${review.isAuto ? 'text-slate-500 italic' : 'text-slate-300'}`}>
                            {review.text}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => saveEdit(review.id)} className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 rounded transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => startEdit(review)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(review.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[#222b3d] text-xs text-slate-500 bg-[#1a2332]">
          Showing {filteredReviews.length} results.
        </div>
      </div>
    </div>
  );
}
