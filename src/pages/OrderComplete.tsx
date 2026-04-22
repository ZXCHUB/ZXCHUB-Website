import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Check, ChevronDown, Copy, Download, ExternalLink, Star, Ticket } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import SEO from '../components/SEO';

function Toast({ toast }: { toast: { message: string; type: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium text-white shadow-xl z-[100] ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
      {toast.message}
    </div>
  );
}

function buildDownloadText(order: any) {
  const lines = [
    'ZXCHUB Order',
    `Order ID: ${order.id}`,
    `Date: ${new Date(order.createdAt || Date.now()).toLocaleString()}`,
    `Total: $${Number(order.amount || 0).toFixed(2)}`,
    '',
    'Delivered Items'
  ];

  (order.items || []).forEach((item: any, index: number) => {
    lines.push('');
    lines.push(`${index + 1}. ${item.productName} - ${item.variantName || 'Standard'}`);
    lines.push(`Key: ${item.keyString}`);
    if (item.instructions) {
      lines.push('');
      lines.push('Instructions:');
      lines.push(item.instructions);
    }
  });

  return lines.join('\n');
}

export default function OrderComplete() {
  const { transactionId } = useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewed, setReviewed] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [reviewDiscountPercent, setReviewDiscountPercent] = useState(5);

  const items = useMemo(() => order?.items || [], [order]);
  const firstItem = items[0];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!transactionId || !user) return;

    const fetchOrder = async () => {
      try {
        const [snap, discountsSnap] = await Promise.all([
          getDoc(doc(db, 'transactions', transactionId)),
          getDoc(doc(db, 'settings', 'discounts'))
        ]);
        if (discountsSnap.exists()) {
          setReviewDiscountPercent(Number((discountsSnap.data() as any).reviewDiscountPercent ?? 5));
        }
        if (!snap.exists()) {
          setOrder(null);
          return;
        }

        const data = { id: snap.id, ...snap.data() } as any;
        if (data.userId !== user.uid) {
          setOrder(null);
          return;
        }

        setOrder(data);
        if (data.items?.[0]?.keyId) {
          setOpenItemId(data.items[0].keyId);
          const existing = await getDocs(query(collection(db, 'reviews'), where('keyId', '==', data.items[0].keyId), where('userId', '==', user.uid)));
          setReviewed(!existing.empty);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [transactionId, user]);

  const handleCopy = async (value: string, label = 'Copied') => {
    await navigator.clipboard.writeText(value);
    showToast(label);
  };

  const handleDownload = () => {
    if (!order) return;
    const blob = new Blob([buildDownloadText(order)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zxchub-order-${order.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReview = async () => {
    if (!user || !profile || !firstItem || reviewed) return;
    if (!reviewText.trim()) {
      showToast('Write a short review first.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: firstItem.productId,
        productName: firstItem.productName,
        keyId: firstItem.keyId,
        userId: user.uid,
        userName: profile.displayName || 'Customer',
        userPhoto: profile.photoURL || '',
        rating,
        text: reviewText.trim(),
        variantName: firstItem.variantName || 'Standard',
        createdAt: Date.now()
      });

      if (rating >= 4) {
        await updateDoc(doc(db, 'users', user.uid), {
          reviewDiscountAvailable: true
        });
        showToast(`Review posted. Your next purchase has a ${reviewDiscountPercent}% discount.`);
      } else {
        showToast('Review posted. Thanks for the feedback.');
      }

      setReviewed(true);
      setReviewText('');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Failed to post review.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading || isLoading) {
    return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-zinc-400">Loading order...</div>;
  }

  if (!user || !profile) return <Navigate to="/" replace />;
  if (!order) return <Navigate to="/profile?tab=purchases" replace />;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white">
      <SEO title="Order Complete | ZXCHUB" description="Your ZXCHUB order is ready." />
      <Toast toast={toast} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="w-full lg:w-1/3 lg:border-r border-zinc-800/50 lg:pr-10">
            <Link to="/" className="flex items-center gap-3 mb-10 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="ZXCHUB" className="w-8 h-8 object-contain" />
              <span className="font-bold text-xl">ZXCHUB</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </Link>

            <div className="text-zinc-400 text-sm mb-2">Paid to ZXCHUB</div>
            <div className="text-4xl font-bold text-white mb-8">${Number(order.amount || 0).toFixed(2)}</div>

            <div className="space-y-4 mb-8">
              {items.map((item: any) => (
                <div key={item.keyId} className="bg-[#1A1D24] rounded-xl p-4 border border-zinc-800/50 flex gap-4 items-center">
                  {item.image && <img src={item.image} alt={item.productName} className="w-14 h-14 object-cover rounded-lg bg-zinc-800" />}
                  <div className="flex-1">
                    <div className="font-bold text-white">{item.productName}</div>
                    <div className="text-sm text-zinc-400">{item.variantName || 'Standard'}</div>
                  </div>
                  <div className="font-bold text-white">${Number(item.price || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm border-t border-zinc-800/50 pt-5">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>${Number(order.subtotal || order.amount || 0).toFixed(2)}</span>
              </div>
              {order.discountPercent > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>{order.reviewDiscountApplied ? 'Review Reward' : 'Discount'} ({order.discountPercent}%)</span>
                  <span>-${Number(order.discountAmount || (Number(order.subtotal || 0) * (Number(order.discountPercent) / 100))).toFixed(2)}</span>
                </div>
              )}
              {order.balanceUsed > 0 && (
                <div className="flex justify-between text-indigo-400">
                  <span>Balance Used</span>
                  <span>-${Number(order.balanceUsed).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold pt-3 border-t border-zinc-800/50">
                <span>Total</span>
                <span>${Number(order.amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-zinc-800/50">
              <div className="text-sm font-bold text-white mb-2">Having issues with your order?</div>
              <div className="text-xs text-zinc-400 mb-4">You can open a ticket and our support team will help you.</div>
              <button
                onClick={() => navigate('/profile?tab=tickets&new=1')}
                className="border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" /> Open Ticket
              </button>
            </div>
          </aside>

          <main className="flex-1">
            <div className="flex items-center gap-8 border-b border-zinc-800/50 pb-4 mb-8">
              <div className="text-indigo-400 font-medium">
                <div className="text-xs text-indigo-400/70">Step 1</div>
                Order Information
              </div>
              <div className="text-indigo-400 font-medium">
                <div className="text-xs text-indigo-400/70">Step 2</div>
                Confirm & Pay
              </div>
              <div className="text-white font-bold border-b-2 border-indigo-500 pb-4 -mb-[18px]">
                <div className="text-xs text-zinc-400">Step 3</div>
                Receive Your Items
              </div>
            </div>

            <section className="text-center py-10 border-b border-zinc-800/50 mb-10">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold">Order Complete</h1>
              <p className="text-zinc-400 mt-2">Your items are ready. Check below for your product.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-lg font-bold mb-5">Delivered Items</h2>
              <div className="space-y-4">
                {items.map((item: any) => {
                  const isOpen = openItemId === item.keyId;
                  return (
                    <div key={item.keyId} className="border border-zinc-800 rounded-xl overflow-hidden bg-black/10">
                      <button
                        onClick={() => setOpenItemId(isOpen ? null : item.keyId)}
                        className="w-full p-5 flex items-center justify-between text-left hover:bg-zinc-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <div>
                            <div className="font-bold text-white">{item.productName}</div>
                            <div className="text-sm text-zinc-400">{item.variantName || 'Standard'}</div>
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5">
                          <div className="pt-4 border-t border-zinc-800">
                            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Instructions</div>
                            <div className="relative mb-6 min-h-[320px] overflow-hidden rounded-lg border border-zinc-800 bg-black/20 p-5">
                              <div className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
                                {item.instructions || 'No special instructions were added for this product.'}
                              </div>
                              {(item.instructionImages?.length ? item.instructionImages : [item.instructionImage]).map((image: any, index: number) => image?.url ? (
                                <img
                                  key={`${image.id || 'image'}-${index}`}
                                  src={image.url}
                                  alt="Instruction"
                                  className="absolute rounded-lg border border-zinc-800 object-contain shadow-2xl"
                                  style={{
                                    width: `${image.width || 45}%`,
                                    left: `${image.x ?? 50}%`,
                                    top: `${image.y ?? 140}px`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                />
                              ) : null)}
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xs uppercase tracking-wider text-zinc-500">Deliverables</div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleCopy(item.keyString, 'Key copied')} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                                <button onClick={handleDownload} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2">
                                  <Download className="w-3 h-3" /> Download
                                </button>
                              </div>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 font-mono text-sm text-indigo-300 select-all break-all">
                              {item.keyString}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border-t border-zinc-800/50 pt-10">
              <h2 className="text-lg font-bold">Leave a Review</h2>
              <p className="text-zinc-400 text-sm mt-1 mb-5">Leave feedback with at least 4 stars to unlock {reviewDiscountPercent}% off your next purchase.</p>

              {reviewed ? (
                <div className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 rounded-xl p-4 text-sm">
                  Thanks for your review. Your reward is ready when eligible.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                        <Star className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="How was your order?"
                  />
                  <button
                    onClick={handleReview}
                    disabled={isSubmittingReview}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors"
                  >
                    {isSubmittingReview ? 'Posting...' : 'Submit Review'}
                  </button>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
