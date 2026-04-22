import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, limit, onSnapshot, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { ArrowLeft, ShoppingCart, ShieldCheck, Eye, Plus, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Markdown from 'react-markdown';

function Toast({ toast }: { toast: {message: string, type: string} | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium text-white shadow-xl z-[100] animate-in slide-in-from-bottom-5 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {toast.message}
    </div>
  );
}

const getCustomTabs = (product: any) => (
  Array.isArray(product?.customTabs)
    ? product.customTabs
      .filter((tab: any) => tab?.title || tab?.content || tab?.images?.length)
      .slice(0, 5)
    : []
);

import SEO from '../components/SEO';

export default function ProductPage() {
  const { slug } = useParams();
  const { user, profile, addToCart } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [stock, setStock] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState(false);
  const [viewers, setViewers] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [quantity, setQuantity] = useState(1);
  const [upsells, setUpsells] = useState<any[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [ownedVariants, setOwnedVariants] = useState<string[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      
      let data = null;
      
      // Try fetching by ID first (backward compatibility)
      const docRef = doc(db, 'products', slug);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        data = { id: docSnap.id, ...docSnap.data() };
      } else {
        // Try fetching by slug
        const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          data = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
      
      if (data) {
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          setSelectedVariantId(data.variants[0].id);
        }

        try {
          // Public stock only needs unsold keys. Filtering productId in code avoids a required composite index.
          const keysSnap = await getDocs(query(collection(db, 'keys'), where('isSold', '==', false)));
          const counts: Record<string, number> = {};
          keysSnap.docs.forEach(d => {
            const key = d.data();
            if (key.productId !== data.id) return;
            const vid = key.variantId;
            counts[vid] = (counts[vid] || 0) + 1;
          });
          setStock(counts);
        } catch (stockError) {
          console.error('Failed to load product stock:', stockError);
          setStock({});
        }
      }
      setLoading(false);
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    const fetchUpsells = async () => {
      if (!product?.upsellProductIds?.length) {
        setUpsells([]);
        return;
      }

      const items = await Promise.all(
        product.upsellProductIds.slice(0, 3).map(async (id: string) => {
          const snap = await getDoc(doc(db, 'products', id));
          return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        })
      );
      setUpsells(items.filter(Boolean));
    };
    fetchUpsells();
  }, [product?.id]);

  // Real-time Viewers
  useEffect(() => {
    if (!product?.id) return;
    const sessionId = Math.random().toString(36).substring(2, 15);
    const viewerRef = doc(db, 'products', product.id, 'viewers', sessionId);

    const updatePresence = async () => {
      try {
        await setDoc(viewerRef, { lastActive: Date.now() });
      } catch (e) {
        // Ignore if rules block it or offline
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 10000); // Update every 10s

    const viewersQuery = query(collection(db, 'products', product.id, 'viewers'));
    const unsubscribe = onSnapshot(viewersQuery, (snap) => {
      const now = Date.now();
      // Filter out stale sessions (older than 30 seconds)
      const activeCount = snap.docs.filter(d => now - d.data().lastActive < 30000).length;
      setViewers(Math.max(1, activeCount)); // At least 1 (themselves)
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
      deleteDoc(viewerRef).catch(() => {});
    };
  }, [product?.id]);

  // Fetch Reviews & Ownership & Auto-Reviews
  useEffect(() => {
    if (!product?.id) return;

    let dbReviews: any[] = [];
    let soldKeys: any[] = [];

    const combineAndSetReviews = () => {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const combined = [...dbReviews];

      soldKeys.forEach(key => {
        if (!key.purchasedAt || !key.ownerId) return;
        const purchaseTime = new Date(key.purchasedAt).getTime();
        
        // Check if this specific key has a manual review
        const hasReviewed = dbReviews.some(r => r.keyId === key.id);
        
        if (!hasReviewed && (now - purchaseTime > SEVEN_DAYS_MS)) {
          // Add auto review for this key
          combined.push({
            id: 'auto-' + key.id,
            keyId: key.id,
            productId: product.id,
            productName: product.title,
            userId: key.ownerId,
            userName: key.ownerName || 'Customer',
            userPhoto: key.ownerPhoto || '',
            rating: 5,
            text: 'Automatic feedback after 7 days.',
            variantName: key.variantName,
            createdAt: purchaseTime + SEVEN_DAYS_MS,
            isAuto: true
          });
        }
      });

      combined.sort((a, b) => b.createdAt - a.createdAt);
      setReviews(combined);
    };

    const qReviews = query(collection(db, 'reviews'), where('productId', '==', product.id));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      dbReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      combineAndSetReviews();
    }, (error) => {
      console.error('Failed to load product reviews:', error);
      dbReviews = [];
      combineAndSetReviews();
    });

    let unsubKeys = () => {};
    if (user) {
      const qKeys = query(collection(db, 'keys'), where('productId', '==', product.id), where('ownerId', '==', user.uid));
      unsubKeys = onSnapshot(qKeys, (snap) => {
        soldKeys = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        combineAndSetReviews();
      }, (error) => {
        console.error('Failed to load owned keys for auto reviews:', error);
        soldKeys = [];
        combineAndSetReviews();
      });
    }

    if (user) {
      const checkOwnership = async () => {
        try {
          const keysQ = query(collection(db, 'keys'), where('productId', '==', product.id), where('ownerId', '==', user.uid));
          const keysSnap = await getDocs(keysQ);
          if (!keysSnap.empty) {
            const variants = Array.from(new Set(keysSnap.docs.map(d => d.data().variantName)));
            setOwnedVariants(variants);
          } else {
            setOwnedVariants([]);
          }
        } catch (error) {
          console.error('Failed to check product ownership:', error);
          setOwnedVariants([]);
        }
      };
      checkOwnership();
    } else {
      setOwnedVariants([]);
    }

    return () => {
      unsubReviews();
      unsubKeys();
    };
  }, [product?.id, user]);

  const handleAddToCart = () => {
    if (!product || !selectedVariantId) return;
    const variant = product.variants.find((v: any) => v.id === selectedVariantId);
    if (!variant) return;

    addToCart({
      id: `${product.id}-${variant.id}`,
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      variantName: variant.name,
      price: variant.price,
      quantity: quantity,
      image: product.image
    });
    showToast("Added to cart!");
  };

  const navigate = useNavigate();

  const handleBuy = async () => {
    if (!profile || !user) return showToast("Please login first to buy.", "error");
    if (!product || !selectedVariantId) return;

    const variant = product.variants.find((v: any) => v.id === selectedVariantId);
    if (!variant) return;

    navigate(`/checkout/${product.id}/${variant.id}?qty=${quantity}`);
  };

  const handleSubmitReview = async () => {
    if (!user || !profile) return showToast("Login first to leave a review.", "error");
    if (!reviewText.trim()) return showToast("Review text cannot be empty.", "error");
    
    try {
      if (editingReviewId) {
        await updateDoc(doc(db, 'reviews', editingReviewId), {
          rating: rating || 5,
          text: reviewText || '',
          updatedAt: Date.now()
        });
        setEditingReviewId(null);
        setReviewText('');
        setRating(5);
        showToast("Review updated successfully!");
        return;
      }

      // Find an unreviewed key for this user
      // We need to fetch the user's keys for this product to find an unreviewed one
      const keysQ = query(collection(db, 'keys'), where('productId', '==', product.id), where('ownerId', '==', user.uid));
      const keysSnap = await getDocs(keysQ);
      const userKeys = keysSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      if (userKeys.length === 0) return showToast("You must purchase this product to leave a review.", "error");

      const unreviewedKey = userKeys.find(k => !reviews.some(r => r.keyId === k.id && !r.isAuto));

      if (!unreviewedKey) {
        return showToast("You have already reviewed all your purchases for this product. You can edit your existing reviews.", "error");
      }

      await addDoc(collection(db, 'reviews'), {
        productId: product.id,
        productName: product.title,
        keyId: unreviewedKey.id,
        userId: user.uid,
        userName: profile.displayName || 'Customer',
        userPhoto: profile.photoURL || '',
        rating: rating || 5,
        text: reviewText || '',
        variantName: unreviewedKey.variantName || 'Standard',
        createdAt: Date.now()
      });
      setReviewText('');
      setRating(5);
      showToast("Review submitted successfully!");
    } catch (e) {
      console.error(e);
      showToast("Failed to submit review.", "error");
    }
  };

  const handleEditReview = (review: any) => {
    setEditingReviewId(review.id);
    setReviewText(review.text);
    setRating(review.rating);
    setActiveTab('reviews');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Product not found</div>;

  const selectedVariant = product.variants?.find((v: any) => v.id === selectedVariantId);
  const currentStock = stock[selectedVariantId] || 0;
  const isOutOfStock = currentStock === 0;
  const customTabs = getCustomTabs(product);
  const activeCustomTab = customTabs.find((tab: any) => activeTab === `custom-${tab.id}`);

  return (
    <div className="w-full pb-20">
      <SEO 
        title={`${product.title} | ZXCHUB`} 
        description={product.description || `Buy ${product.title} on ZXCHUB.`}
        image={product.image || '/background.png'}
      />
      <Navbar />
      <Toast toast={toast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-28 sm:py-8 sm:pt-32">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Scripts
          </Link>
        </div>
        
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-6 sm:mb-8 uppercase">{product.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Image & Description */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/50 aspect-video relative">
              <img 
                src={product.image} 
                alt={product.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
              <button 
                onClick={() => setActiveTab('description')}
                className={`shrink-0 px-5 sm:px-6 py-2 rounded-lg font-medium text-sm transition-colors border ${activeTab === 'description' ? 'bg-zinc-800/80 text-white border-zinc-700' : 'bg-transparent text-zinc-400 hover:text-white border-transparent'}`}
              >
                Description
              </button>
              {customTabs.map((tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(`custom-${tab.id}`)}
                  className={`shrink-0 px-5 sm:px-6 py-2 rounded-lg font-medium text-sm transition-colors border ${activeTab === `custom-${tab.id}` ? 'bg-zinc-800/80 text-white border-zinc-700' : 'bg-transparent text-zinc-400 hover:text-white border-transparent'}`}
                >
                  {tab.title || 'More Info'}
                </button>
              ))}
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`shrink-0 px-5 sm:px-6 py-2 rounded-lg font-medium text-sm transition-colors border ${activeTab === 'reviews' ? 'bg-zinc-800/80 text-white border-zinc-700' : 'bg-transparent text-zinc-400 hover:text-white border-transparent'}`}
              >
                Reviews ({reviews.length})
              </button>
            </div>

            <div className="bg-[#11141D] border border-zinc-800/50 rounded-xl p-4 sm:p-6 min-h-[300px]">
              {activeTab === 'description' ? (
                <>
                  <div className="text-zinc-300 text-sm leading-relaxed prose prose-invert max-w-none">
                    {product.description ? <Markdown>{product.description}</Markdown> : <p className="text-zinc-500 italic">No description yet.</p>}
                  </div>
                </>
              ) : activeCustomTab ? (
                <div className="relative min-h-[300px] overflow-hidden">
                  <h3 className="font-bold text-lg mb-4 uppercase">{activeCustomTab.title || 'More Info'}</h3>
                  <div className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
                    {activeCustomTab.content || 'No content yet.'}
                  </div>
                  {(activeCustomTab.images || []).map((image: any) => (
                    image.url ? (
                      <div
                        key={image.id}
                        className="absolute select-none"
                        style={{
                          width: `${image.width || 45}%`,
                          left: `${image.x ?? 50}%`,
                          top: `${image.y ?? 140}px`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <img src={image.url} alt="" draggable={false} className="pointer-events-none w-full select-none rounded-lg border border-zinc-800 object-contain shadow-2xl" />
                      </div>
                    ) : null
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="font-bold text-lg uppercase">Customer Reviews</h3>
                  
                  {/* Write a review */}
                  {user ? (
                    ownedVariants.length > 0 ? (
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-zinc-300 mb-3">Write a review</h4>
                        <div className="flex items-center gap-2 mb-3">
                          {[1,2,3,4,5].map(star => (
                            <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                              <Star className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`} />
                            </button>
                          ))}
                        </div>
                        <textarea 
                          value={reviewText}
                          onChange={e => setReviewText(e.target.value)}
                          placeholder="What do you think about this product?"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 mb-3"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSubmitReview}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            {editingReviewId ? 'Update Review' : 'Submit Review'}
                          </button>
                          {editingReviewId && (
                            <button 
                              onClick={() => {
                                setEditingReviewId(null);
                                setReviewText('');
                                setRating(5);
                              }}
                              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center text-sm text-zinc-400">
                        You must purchase this product to leave a review.
                      </div>
                    )
                  ) : (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center text-sm text-zinc-400">
                      Please log in to leave a review.
                    </div>
                  )}

                  {/* Review List */}
                  <div className="space-y-4">
                    {reviews.length === 0 ? (
                      <div className="text-zinc-500 text-sm italic">No reviews yet. Be the first!</div>
                    ) : (
                      reviews.map(review => (
                        <div key={review.id} className={`border-b border-zinc-800/50 pb-4 last:border-0 ${review.isAuto ? 'opacity-80' : ''}`}>
                          <div className="flex items-center gap-3 mb-2">
                            {review.userPhoto ? (
                              <img src={review.userPhoto} alt={review.userName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                {review.userName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm text-zinc-200 flex items-center gap-2">
                                {review.userName}
                                {review.isAuto && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Auto</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                {[1,2,3,4,5].map(star => (
                                  <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`} />
                                ))}
                                <span className="text-[10px] text-zinc-500 ml-2">{new Date(review.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {user && review.userId === user.uid && !review.isAuto && (
                              <button 
                                onClick={() => handleEditReview(review)}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          <p className={`text-sm pl-11 mb-2 ${review.isAuto ? 'text-zinc-500 italic' : 'text-zinc-400'}`}>{review.text}</p>
                          <div className="pl-11">
                            <span className="inline-block bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded">
                              Purchased: {product.title} {review.variantName ? `- ${review.variantName}` : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Purchase Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Price Card */}
            <div className="bg-[#11141D] border border-zinc-800/50 rounded-xl p-6 flex items-center justify-between">
              <div>
                {profile?.discountPercentage ? (
                  <>
                    <div className="text-lg font-medium text-zinc-500 line-through">${selectedVariant?.price?.toFixed(2)}</div>
                    <div className="text-3xl font-bold text-white flex items-center gap-2">
                      ${(selectedVariant?.price * (1 - profile.discountPercentage / 100)).toFixed(2)}
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-md">-{profile.discountPercentage}%</span>
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-bold text-white">${selectedVariant?.price?.toFixed(2)}</div>
                )}
                <div className="text-xs text-zinc-500 mt-1">per unit</div>
              </div>
              <div className={`text-right text-sm font-medium ${isOutOfStock ? 'text-red-400' : 'text-zinc-300'}`}>
                {isOutOfStock ? 'Out of Stock' : `${currentStock} in stock`}
              </div>
            </div>

            {/* Variants Card */}
            <div className="bg-[#11141D] border border-zinc-800/50 rounded-xl p-6">
              <h4 className="text-sm font-medium text-zinc-400 mb-4">Variant</h4>
              <div className="space-y-3">
                {product.variants?.map((v: any) => {
                  const isSelected = selectedVariantId === v.id;
                  const vStock = stock[v.id] || 0;
                  const finalPrice = profile?.discountPercentage ? v.price * (1 - profile.discountPercentage / 100) : v.price;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        setQuantity(1); // Reset quantity when changing variant
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isSelected 
                          ? 'bg-indigo-600/10 border-indigo-500' 
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-left">
                        <div className={`font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{v.name}</div>
                        <div className="text-xs text-zinc-500 mt-1">{vStock > 0 ? `${vStock} in stock` : 'Out of Stock'}</div>
                      </div>
                      <div className="text-right">
                        {profile?.discountPercentage ? (
                          <div className="text-xs text-zinc-500 line-through">${v.price.toFixed(2)}</div>
                        ) : null}
                        <div className={`font-bold ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                          ${finalPrice.toFixed(2)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quantity */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Quantity</h4>
                <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-lg p-1">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    -
                  </button>
                  <span className="font-medium">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button 
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || buying}
                  className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
                <button 
                  onClick={handleBuy}
                  disabled={isOutOfStock || buying}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {buying ? 'Processing...' : `Buy Now ($${(profile?.discountPercentage ? (selectedVariant?.price * quantity * (1 - profile.discountPercentage / 100)) : (selectedVariant?.price * quantity || 0)).toFixed(2)})`}
                </button>
              </div>
            </div>

            {/* Viewers */}
            {upsells.length > 0 && (
              <div className="bg-[#11141D] border border-zinc-800/50 rounded-xl p-6">
                <h4 className="text-sm font-medium text-zinc-400 mb-4">Recommended Add-ons</h4>
                <div className="space-y-3">
                  {upsells.map((item: any) => {
                    const firstVariant = item.variants?.[0];
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                        {item.image && <img src={item.image} alt={item.title} className="h-12 w-12 rounded-lg object-cover bg-zinc-800" />}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{item.title}</div>
                          <div className="text-xs text-zinc-500">{firstVariant ? `From $${Number(firstVariant.price || 0).toFixed(2)}` : 'View details'}</div>
                        </div>
                        <Link
                          to={`/product/${item.slug || item.id}`}
                          className="rounded-lg border border-indigo-500/30 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10"
                        >
                          View
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Viewers */}
            <div className="bg-[#11141D] border border-zinc-800/50 rounded-xl p-4 flex items-center gap-3 text-sm text-zinc-400">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span className="font-medium text-white">{viewers} {viewers === 1 ? 'person' : 'people'}</span> is currently viewing this product.
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 mt-4">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Secure transaction guaranteed
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
