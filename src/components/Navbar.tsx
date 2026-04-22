import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogOut, Wallet, X, Trash2, CreditCard } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs, limit, getDoc } from 'firebase/firestore';

function Toast({ toast }: { toast: {message: string, type: string} | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 font-medium text-white shadow-xl z-[100] animate-in slide-in-from-bottom-5 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {toast.message}
    </div>
  );
}

const normalizeExternalUrl = (url?: string) => {
  const trimmed = url?.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

export default function Navbar() {
  const { user, profile, login, logout, cart, removeFromCart, clearCart, cartTotal } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(50);
  const [promoCode, setPromoCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const navigate = useNavigate();

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 5000);
  };

  const getSignInErrorMessage = (error: unknown) => {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';

    if (code === 'auth/unauthorized-domain') {
      return 'This domain is not allowed in Firebase Authentication settings.';
    }

    if (code === 'auth/popup-blocked') {
      return 'The sign-in popup was blocked by your browser.';
    }

    if (code === 'auth/popup-closed-by-user') {
      return 'The sign-in popup was closed before login finished.';
    }

    if (code === 'auth/operation-not-allowed') {
      return 'Google sign-in is not enabled in Firebase Authentication.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Sign in failed. Check Firebase Authentication settings.';
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Sign in failed:', error);
      showToast(getSignInErrorMessage(error), 'error');
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'announcement'));
        if (snap.exists() && snap.data().enabled && snap.data().message) {
          setAnnouncement(snap.data());
        }
      } catch (error) {
        console.error('Failed to load announcement', error);
      }
    };
    fetchAnnouncement();
  }, []);

  const handleTopUp = async () => {
    if (!user || !profile) return;
    if (topUpAmount < 1) {
      showToast("Minimum top-up amount is $1", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: topUpAmount,
          method: 'stripe',
          userId: user.uid,
          metadata: { type: 'topup' },
          successUrl: `${window.location.origin}/profile?topup_session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/profile`
        })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to initiate top-up.", "error");
      setIsProcessing(false);
    }
  };

  const handleRedeemPromo = async () => {
    if (!user || !profile || !promoCode) return;
    setIsProcessing(true);
    try {
      const q = query(collection(db, 'promocodes'), where('code', '==', promoCode));
      const snap = await getDocs(q);
      if (snap.empty) {
        showToast("Invalid promo code", "error");
      } else {
        const promoDoc = snap.docs[0];
        const promo = promoDoc.data();
        
        if (promo.maxUses > 0 && promo.uses >= promo.maxUses) {
          showToast("Promo code has reached its usage limit", "error");
          setIsProcessing(false);
          return;
        }

        const userUses = promo.usedBy?.[user.uid] || 0;
        if (promo.maxUsesPerUser > 0 && userUses >= promo.maxUsesPerUser) {
          showToast("You have reached the usage limit for this promo code", "error");
          setIsProcessing(false);
          return;
        }

        if (promo.type === 'balance') {
          await updateDoc(doc(db, 'users', profile.uid), {
            balance: profile.balance + promo.value
          });
          showToast(`Promo code applied! Added $${promo.value} to balance.`);
        } else if (promo.type === 'discount') {
          await updateDoc(doc(db, 'users', profile.uid), {
            discountPercentage: promo.value
          });
          showToast(`Promo code applied! You get ${promo.value}% off your next purchase.`);
        }
        
        // Increment uses
        await updateDoc(doc(db, 'promocodes', promoDoc.id), {
          uses: (promo.uses || 0) + 1,
          [`usedBy.${user.uid}`]: userUses + 1
        });

        setPromoCode('');
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to redeem promo code", "error");
    }
    setIsProcessing(false);
  };

  const finalTotal = profile?.discountPercentage 
    ? cartTotal * (1 - profile.discountPercentage / 100) 
    : cartTotal;

  const announcementDuration = Math.max(1, Math.min(100, Number(announcement?.loopDuration || 38)));
  const announcementUrl = normalizeExternalUrl(announcement?.linkUrl);

  const handleCheckout = async () => {
    if (!user || !profile) return showToast("Please login to checkout", "error");
    if (cart.length === 0) return;
    
    setIsCartOpen(false);
    navigate('/checkout/cart');
  };

  return (
    <>
      <Toast toast={toast} />
      {announcement && (
        <div
          className="relative z-40 overflow-hidden border-b border-white/10"
          style={{ backgroundColor: announcement.backgroundColor || '#4f46e5', color: announcement.textColor || '#ffffff' }}
        >
          <div className="h-9 whitespace-nowrap">
            <div className="relative h-9 overflow-hidden text-sm font-medium">
              {announcementUrl ? (
                <a
                  href={announcementUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute left-0 top-0 inline-flex h-9 items-center gap-3 px-4 animate-marquee-ltr hover:opacity-90"
                  style={{ '--marquee-duration': `${announcementDuration}s` } as React.CSSProperties}
                >
                  <span>{announcement.message}</span>
                  {announcement.linkText && (
                    <span className="underline decoration-current/50 underline-offset-4 hover:decoration-current">
                      {announcement.linkText}
                    </span>
                  )}
                </a>
              ) : (
                <span
                  className="absolute left-0 top-0 inline-flex h-9 items-center gap-3 px-4 animate-marquee-ltr"
                  style={{ '--marquee-duration': `${announcementDuration}s` } as React.CSSProperties}
                >
                  <span>{announcement.message}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#050507]/88 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <img src="/logo.png" alt="ZXCHUB" className="w-8 h-8 object-contain" />
              <span className="text-xl font-black tracking-tight text-red-500">ZXCHUB</span>
            </Link>

            {/* Center Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/products" className="text-zinc-300 hover:text-white font-medium transition-colors">Scripts</Link>
              <Link to="/get-key" className="text-zinc-300 hover:text-white font-medium transition-colors">Get Key</Link>
              <Link to="/feedback" className="text-zinc-300 hover:text-white font-medium transition-colors">Feedback</Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {user && profile ? (
                <>
                  {/* Balance Pill */}
                  <div className="hidden sm:flex items-center gap-3 bg-[#1A1D24] border border-zinc-800/80 p-1.5 rounded-xl">
                    <div className="flex items-center gap-2 px-2">
                      <Wallet className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-white">${profile.balance.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => setIsTopUpOpen(true)}
                      className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-1.5 transition-colors"
                    >
                      Top Up
                    </button>
                  </div>
                  
                  {/* Cart */}
                  <button 
                    onClick={() => setIsCartOpen(true)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors relative"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {cartCount > 0 && (
                      <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-600 text-[10px] font-bold text-center leading-5 text-white transform translate-x-1/4 -translate-y-1/4 border-2 border-[#050507]">
                        {cartCount}
                      </span>
                    )}
                  </button>

                  {/* Admin Panel Link */}
                  {profile.role === 'admin' && (
                    <Link to="/admin" className="hidden sm:flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 text-sm font-medium transition-colors">
                      Admin Panel
                    </Link>
                  )}
                  
                  {/* Avatar */}
                  <Link to="/profile" className="block relative group" title="Profile & Settings">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-transparent group-hover:border-red-500 transition-colors" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold border-2 border-transparent group-hover:border-white transition-colors">
                        {profile.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  {/* Logout */}
                  <button onClick={logout} className="p-2 text-zinc-400 hover:text-white transition-colors" title="Logout">
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 font-medium transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 border-t border-zinc-800/50 py-2 text-sm md:hidden">
            <Link to="/products" className="text-zinc-300 hover:text-white font-medium transition-colors">Scripts</Link>
            <Link to="/get-key" className="text-zinc-300 hover:text-white font-medium transition-colors">Get Key</Link>
            <Link to="/feedback" className="text-zinc-300 hover:text-white font-medium transition-colors">Feedback</Link>
          </div>
        </div>
      </nav>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
            <div className="relative w-full max-w-md bg-[#09090d] h-full shadow-2xl border-l border-zinc-800 flex flex-col animate-in slide-in-from-right">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Your Cart
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center text-zinc-500 mt-10">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Your cart is empty.</p>
                  <Link to="/products" onClick={() => setIsCartOpen(false)} className="mt-4 inline-flex text-sm font-bold text-red-400 hover:text-red-300">
                    Browse scripts
                  </Link>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                    <img src={item.image} alt={item.title} className="w-20 h-20 object-cover rounded-lg bg-zinc-800" />
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                          <p className="text-xs text-zinc-400 mt-0.5">{item.variantName}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-zinc-500 hover:text-red-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Qty: {item.quantity}</span>
                        <span className="font-bold text-indigo-400">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-zinc-800 bg-[#0B0E14]">
                {profile?.discountPercentage ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-400">Subtotal</span>
                      <span className="text-lg font-medium text-zinc-500 line-through">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-indigo-400 font-medium">Discount ({profile.discountPercentage}%)</span>
                      <span className="text-2xl font-bold text-white">${finalTotal.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-400">Total</span>
                    <span className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</span>
                  </div>
                )}
                <button 
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-3 font-bold transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-md w-full mx-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-red-400" /> Top Up Balance
              </h3>
              <button onClick={() => setIsTopUpOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[10, 25, 50, 100, 250, 500].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setTopUpAmount(amount)}
                    className={`py-2 border font-bold transition-colors ${
                      topUpAmount === amount 
                        ? 'bg-red-600/20 border-red-500 text-red-400' 
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Custom Amount ($)</label>
                <input 
                  type="number" 
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  min="1"
                />
              </div>

              <button 
                onClick={handleTopUp}
                disabled={isProcessing || topUpAmount <= 0}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-3 font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
              >
                {isProcessing ? 'Processing...' : `Pay $${topUpAmount}`}
              </button>

              <div className="border-t border-zinc-800 pt-4">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Promo Code</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase"
                    placeholder="ENTER CODE"
                  />
                  <button 
                    onClick={handleRedeemPromo}
                    disabled={isProcessing || !promoCode}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    Redeem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
