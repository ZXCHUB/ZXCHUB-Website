import React, { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ArrowLeft, ArrowUpRight, User as UserIcon, Package, Key, ShoppingBag, Plus, Save, Image as ImageIcon, Edit2, Trash2, Ticket, LayoutDashboard, Wallet, Link as LinkIcon, Copy, CreditCard, Bitcoin, Gamepad2, Receipt, Download, Paperclip } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, addDoc, query, where, deleteDoc, orderBy, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import ImageCropper from '../components/ImageCropper';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';

function Toast({ toast }: { toast: {message: string, type: string} | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium text-white shadow-xl z-[100] animate-in slide-in-from-bottom-5 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {toast.message}
    </div>
  );
}

function readAttachment(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    if (file.size > 700 * 1024) {
      reject(new Error('Attachment must be under 700KB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: String(reader.result || '')
    });
    reader.onerror = () => reject(new Error('Failed to read attachment.'));
    reader.readAsDataURL(file);
  });
}

function AttachmentList({ attachments }: { attachments?: any[] }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {attachments.map((file, index) => (
        <a
          key={`${file.name}-${index}`}
          href={file.dataUrl || file.url}
          download={file.name}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs hover:bg-black/30"
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span className="truncate">{file.name || 'Attachment'}</span>
        </a>
      ))}
    </div>
  );
}

export default function Profile() {
  const { profile, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'dashboard';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'balance' | 'affiliate' | 'settings' | 'purchases' | 'invoices' | 'tickets'>(initialTab);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading...</div>;
  if (!profile || !user) return <Navigate to="/" replace />;

  return (
    <div className="w-full">
      <SEO title="My Profile | Rumble Hub" description="Manage your purchases, tickets, and account settings." />
      <Navbar />
      <Toast toast={toast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'balance' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <Wallet className="w-5 h-5" /> Balance
          </button>
          <button
            onClick={() => setActiveTab('affiliate')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'affiliate' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <LinkIcon className="w-5 h-5" /> Affiliate
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <UserIcon className="w-5 h-5" /> Profile Settings
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'purchases' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <ShoppingBag className="w-5 h-5" /> My Purchases
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'invoices' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <Receipt className="w-5 h-5" /> Invoices
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'tickets' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <Ticket className="w-5 h-5" /> Support Tickets
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-[#11141D] border border-zinc-800/50 rounded-2xl p-6 md:p-8 min-h-[500px]">
          {activeTab === 'dashboard' && <DashboardTab user={user} profile={profile} setActiveTab={setActiveTab} />}
          {activeTab === 'balance' && <BalanceTab user={user} profile={profile} showToast={showToast} />}
          {activeTab === 'affiliate' && <AffiliateTab user={user} profile={profile} showToast={showToast} setActiveTab={setActiveTab} />}
          {activeTab === 'settings' && <SettingsTab profile={profile} showToast={showToast} />}
          {activeTab === 'purchases' && <PurchasesTab user={user} profile={profile} setActiveTab={setActiveTab} />}
          {activeTab === 'invoices' && <InvoicesTab user={user} />}
          {activeTab === 'tickets' && <TicketsTab user={user} profile={profile} startCreating={searchParams.get('new') === '1'} />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ user, profile, setActiveTab }: { user: any, profile: any, setActiveTab: any }) {
  const [stats, setStats] = useState<{
    completedOrders: number;
    totalSpent: number;
    latestOrder: any;
  }>({
    completedOrders: 0,
    totalSpent: 0,
    latestOrder: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const q = query(collection(db, 'keys'), where('ownerId', '==', user.uid));
      const snap = await getDocs(q);
      const purchases = snap.docs.map(d => d.data());
      
      const pSnap = await getDocs(collection(db, 'products'));
      const productsMap: Record<string, any> = {};
      pSnap.docs.forEach(d => {
        productsMap[d.id] = d.data();
      });

      let total = 0;
      let latest: any = null;
      let latestTime = 0;

      purchases.forEach(p => {
        // Calculate total spent
        if (p.price) {
          total += p.price;
        } else if (p.productId && p.variantId && productsMap[p.productId]) {
          const product = productsMap[p.productId];
          const variant = product.variants?.find((v: any) => v.id === p.variantId);
          if (variant) {
            total += variant.price;
          }
        }

        // Calculate latest order
        if (p.purchasedAt) {
          const pTime = new Date(p.purchasedAt).getTime();
          if (pTime > latestTime) {
            latestTime = pTime;
            latest = {
              productName: p.productName || p.productTitle || productsMap[p.productId]?.title || 'Product',
              variantName: p.variantName || '',
              price: p.price || (p.productId && p.variantId && productsMap[p.productId]?.variants?.find((v: any) => v.id === p.variantId)?.price) || 0
            };
          }
        }
      });

      setStats({
        completedOrders: purchases.length,
        totalSpent: total,
        latestOrder: latest
      });
    };
    fetchStats();
  }, [user.uid]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="text-sm text-zinc-400 mb-1">Completed Orders</div>
          <div className="text-2xl font-bold text-white">{stats.completedOrders}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="text-sm text-zinc-400 mb-1">Total Spent</div>
          <div className="text-2xl font-bold text-white">${stats.totalSpent.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="text-sm text-zinc-400 mb-1">Customer Since</div>
          <div className="text-2xl font-bold text-white">
            {new Date(user.metadata.creationTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="text-sm text-zinc-400 mb-1">Latest Order</div>
          {stats.latestOrder && stats.latestOrder !== 'None' ? (
            <div>
              <div className="text-xl font-bold text-white">{stats.latestOrder.productName}</div>
              {stats.latestOrder.variantName && (
                <div className="text-md text-zinc-300">{stats.latestOrder.variantName}</div>
              )}
              <div className="text-sm text-zinc-500 mt-1">${stats.latestOrder.price?.toFixed(2) || '0.00'}</div>
            </div>
          ) : (
            <div className="text-2xl font-bold text-white">None</div>
          )}
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="text-sm text-zinc-400 mb-1">Balance</div>
          <div className="text-2xl font-bold text-white mb-2">${(profile.balance || 0).toFixed(2)}</div>
          <button onClick={() => setActiveTab('balance')} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Top Up</button>
        </div>
      </div>
    </div>
  );
}

function BalanceTab({ user, profile, showToast }: { user: any, profile: any, showToast: any }) {
  const [history, setHistory] = useState<any[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => b.createdAt - a.createdAt);
        setHistory(data);
      } catch (e) {
        console.error("Failed to fetch history:", e);
      }
    };
    fetchHistory();
  }, [user.uid]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    if (sessionId) {
      const verifySession = async () => {
        try {
          // Check if already processed
          const q = query(collection(db, 'transactions'), where('sessionId', '==', sessionId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            // Already processed
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }

          const res = await fetch('/api/payments/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await res.json();
          
          if (data.success && data.metadata?.type === 'topup' && data.metadata?.userId === user.uid) {
            const amount = data.amount;
            const selectedAmount = Number(data.metadata.selectedAmount || amount);
            const finalAmount = Number(data.metadata.finalAmount || amount);
            const newBalance = Number(profile.balance || 0) + finalAmount;
            
            const updates: any = { balance: newBalance };
            if (data.metadata.discountToApply) {
              updates.discountPercentage = Number(data.metadata.discountToApply);
            }
            
            await updateDoc(doc(db, 'users', user.uid), updates);
            
            if (data.metadata.promoId) {
              await updateDoc(doc(db, 'promocodes', data.metadata.promoId), {
                uses: Number(data.metadata.promoUses),
                usedBy: JSON.parse(data.metadata.promoUsedBy || '{}')
              });
            }

            // Affiliate Reward Logic
            try {
                let affUserDoc = null;
                const affiliateToRewardEmail = data.metadata.affiliateToRewardEmail;
                if (affiliateToRewardEmail) {
                    const affSnap = await getDocs(query(collection(db, 'users'), where('email', '==', affiliateToRewardEmail.toLowerCase())));
                    if (!affSnap.empty) affUserDoc = affSnap.docs[0];
                } else {
                    const refDataStr = localStorage.getItem('affiliate_ref');
                    if (refDataStr) {
                        try {
                            const refData = JSON.parse(refDataStr);
                            const isWithin24Hours = (Date.now() - refData.timestamp) <= 24 * 60 * 60 * 1000;
                            
                            if (isWithin24Hours && refData.code !== profile.affiliateCode && refData.code !== user.uid) {
                                const affSnap = await getDocs(query(collection(db, 'users'), where('affiliateCode', '==', refData.code)));
                                if (!affSnap.empty) {
                                    affUserDoc = affSnap.docs[0];
                                } else {
                                    try {
                                        const docSnap = await getDoc(doc(db, 'users', refData.code));
                                        if (docSnap.exists()) affUserDoc = docSnap;
                                    } catch(e) {}
                                }
                            }
                        } catch (e) {
                            // Handle old format where it was just a string
                            const ref = refDataStr;
                            if (ref !== profile.affiliateCode && ref !== user.uid) {
                                const affSnap = await getDocs(query(collection(db, 'users'), where('affiliateCode', '==', ref)));
                                if (!affSnap.empty) {
                                    affUserDoc = affSnap.docs[0];
                                } else {
                                    try {
                                        const docSnap = await getDoc(doc(db, 'users', ref));
                                        if (docSnap.exists()) affUserDoc = docSnap;
                                    } catch(e) {}
                                }
                            }
                        }
                    }
                }

                if (affUserDoc && affUserDoc.id !== user.uid) {
                    const affData = affUserDoc.data();
                    const earned = selectedAmount * 0.20; // 20% of the paid amount
                    await updateDoc(doc(db, 'users', affUserDoc.id), {
                        balance: Number(affData.balance || 0) + earned,
                        affiliateEarnings: Number(affData.affiliateEarnings || 0) + earned
                    });
                    await addDoc(collection(db, 'affiliate_history'), {
                        affiliateId: affUserDoc.id,
                        referredUserId: user.uid,
                        referredUserEmail: user.email,
                        amount: selectedAmount,
                        earned: earned,
                        date: Date.now()
                    });
                }
            } catch (affErr) {
                console.error("Affiliate reward failed:", affErr);
            }
            
            await addDoc(collection(db, 'transactions'), {
              userId: user.uid,
              type: 'topup',
              amount: finalAmount,
              method: 'Credit Card',
              sessionId: sessionId,
              promoCode: data.metadata.promoCode || null,
              promoDetails: data.metadata.promoDetails || null,
              createdAt: Date.now()
            });
            
            showToast(`Successfully added $${finalAmount.toFixed(2)} to balance!`);
            
            // Refresh history
            const histQ = query(collection(db, 'transactions'), where('userId', '==', user.uid));
            const histSnap = await getDocs(histQ);
            const histData = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            histData.sort((a: any, b: any) => b.createdAt - a.createdAt);
            setHistory(histData);
          }
        } catch (e) {
          console.error("Failed to verify session", e);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      verifySession();
    }
  }, [user.uid, profile.balance]);

  const handleTopUp = async () => {
    if (!selectedAmount) return showToast("Please select an amount", "error");
    
    setIsProcessing(true);
    try {
      let finalAmount = selectedAmount;
      let discountToApply = 0;
      let promoUsed = null;
      let affiliateToRewardEmail = null;

      if (promoCode) {
        const promoSnap = await getDocs(query(collection(db, 'promocodes'), where('code', '==', promoCode.toUpperCase())));
        if (promoSnap.empty) {
          setIsProcessing(false);
          return showToast("Invalid promo code", "error");
        }
        const promo = promoSnap.docs[0].data();
        const promoId = promoSnap.docs[0].id;

        if (promo.maxUses > 0 && promo.uses >= promo.maxUses) {
          setIsProcessing(false);
          return showToast("Promo code has reached maximum uses", "error");
        }
        
        const userUses = promo.usedBy?.[user.uid] || 0;
        if (promo.maxUsesPerUser > 0 && userUses >= promo.maxUsesPerUser) {
          setIsProcessing(false);
          return showToast("You have reached the maximum uses for this promo code", "error");
        }

        if (promo.type === 'balance') {
          finalAmount += promo.value;
          showToast(`Promo code applied! Added $${promo.value} to top up.`);
        } else if (promo.type === 'discount') {
          discountToApply = promo.value;
          showToast(`Promo code applied! You get a ${promo.value}% discount on your next purchases.`);
        }

        if (promo.isAffiliate && promo.affiliateEmail) {
            affiliateToRewardEmail = promo.affiliateEmail;
        }

        promoUsed = {
          id: promoId,
          uses: promo.uses + 1,
          usedBy: { ...promo.usedBy, [user.uid]: userUses + 1 },
          detailsStr: promo.type === 'balance' ? `+$${promo.value} bonus` : `${promo.value}% discount`
        };
      }

      if (paymentMethod === 'stripe') {
        const metadata: any = { type: 'topup', selectedAmount, finalAmount };
        if (promoUsed) {
          metadata.promoId = promoUsed.id;
          metadata.promoUses = promoUsed.uses;
          metadata.promoUsedBy = JSON.stringify(promoUsed.usedBy);
          metadata.promoCode = promoCode.toUpperCase();
          metadata.promoDetails = promoUsed.detailsStr;
        }
        if (discountToApply > 0) {
          metadata.discountToApply = discountToApply;
        }
        if (affiliateToRewardEmail) {
          metadata.affiliateToRewardEmail = affiliateToRewardEmail;
        }

        const res = await fetch('/api/payments/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            amount: selectedAmount, 
            method: 'stripe', 
            userId: user.uid,
            metadata: metadata,
            successUrl: window.location.origin + '/profile?session_id={CHECKOUT_SESSION_ID}',
            cancelUrl: window.location.origin + '/profile'
          })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        } else {
          throw new Error(data.error || "Failed to create checkout session");
        }
      } else {
        throw new Error(`${paymentMethod} is not fully implemented yet.`);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to process payment", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Balance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="text-sm text-zinc-400 mb-1">Balance</div>
          <div className="text-xs text-zinc-500 mb-4">Customer Balance can be used to pay for future orders.</div>
          <div className="text-3xl font-bold text-white">${(profile.balance || 0).toFixed(2)}</div>
          {profile.discountPercentage > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
              Active Discount: {profile.discountPercentage}%
            </div>
          )}
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="text-sm text-zinc-400 mb-1">Top Up</div>
          <div className="text-xs text-zinc-500 mb-4">Select an amount and payment method.</div>
          
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Promo Code (Optional)</label>
              <input 
                type="text" 
                value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-2">Select Amount</label>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 25, 50, 100].map(amount => (
                <button 
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedAmount === amount ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                >
                  ${amount.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-zinc-400 mb-2">Payment Method</label>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border bg-indigo-500/10 border-indigo-500 text-indigo-400">
                <CreditCard className="w-4 h-4" /> Credit / Debit Card (Stripe)
              </div>
            </div>
          </div>

          <button 
            onClick={handleTopUp}
            disabled={!selectedAmount || isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              `Pay $${selectedAmount ? selectedAmount.toFixed(2) : '0.00'}`
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Transaction History</h3>
        {history.length === 0 ? (
          <div className="text-sm text-zinc-500">No balance transactions yet.</div>
        ) : (
          <div className="space-y-4">
            {history.map(tx => (
              <div key={tx.id} className="flex items-center justify-between border-b border-zinc-800/50 pb-4 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium text-white">{tx.type === 'topup' ? 'Top Up' : 'Purchase'}</div>
                  <div className="text-xs text-zinc-500">{new Date(tx.createdAt).toLocaleString()} &bull; {tx.method || 'System'}</div>
                </div>
                <div className={`font-bold ${tx.type === 'topup' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'topup' ? '+' : '-'}${tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AffiliateTab({ user, profile, showToast, setActiveTab }: { user: any, profile: any, showToast: any, setActiveTab: any }) {
  const [customCode, setCustomCode] = useState(profile.affiliateCode || profile.displayName?.toLowerCase().replace(/[^a-z0-9]/g, '') || user.uid);
  const affiliateLink = `${window.location.origin}/?a=${customCode}`;
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(20);

  useEffect(() => {
    const fetchAffiliateHistory = async () => {
      try {
        const [snap, discountsSnap] = await Promise.all([
          getDocs(query(collection(db, 'affiliate_history'), where('affiliateId', '==', user.uid))),
          getDoc(doc(db, 'settings', 'discounts'))
        ]);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => b.date - a.date);
        setReferredUsers(data);
        if (discountsSnap.exists()) {
          setCommissionPercent(Number((discountsSnap.data() as any).affiliateCommissionPercent ?? 20));
        }
      } catch (e) {
        console.error("Failed to fetch affiliate history:", e);
      }
    };
    fetchAffiliateHistory();
  }, [user.uid]);

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateLink);
    showToast("Affiliate link copied!");
  };

  const handleSaveCode = async () => {
    try {
        if (!customCode.trim()) return showToast("Code cannot be empty", "error");
        const q = query(collection(db, 'users'), where('affiliateCode', '==', customCode));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].id !== user.uid) {
            return showToast("This code is already taken", "error");
        }
        await updateDoc(doc(db, 'users', user.uid), { affiliateCode: customCode });
        showToast("Affiliate code updated!");
    } catch (e) {
        console.error(e);
        showToast("Failed to update code", "error");
    }
  };

  const totalEarned = referredUsers.reduce((sum, item) => sum + Number(item.earned || 0), 0);
  const totalSales = referredUsers.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-3">
          <LinkIcon className="w-3.5 h-3.5" />
          Affiliate Panel
        </div>
        <h2 className="text-2xl font-bold text-white">Your Affiliate Dashboard</h2>
        <p className="mt-2 text-zinc-400">Share your link, track referred sales, and receive rewards directly to your balance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="text-sm text-zinc-400">Commission</div>
          <div className="mt-2 text-3xl font-bold text-white">{commissionPercent}%</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="text-sm text-zinc-400">Total Earned</div>
          <div className="mt-2 text-3xl font-bold text-emerald-400">${totalEarned.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="text-sm text-zinc-400">Referred Sales</div>
          <div className="mt-2 text-3xl font-bold text-white">${totalSales.toFixed(2)}</div>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
        <div className="text-sm font-semibold text-white mb-3">Your Link</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 break-all">
            {window.location.origin}/?a=
            <input
              value={customCode}
              onChange={e => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              className="bg-transparent text-white outline-none"
            />
          </div>
          <button onClick={handleSaveCode} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500">Save</button>
          <button onClick={handleCopy} className="rounded-lg border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-900 flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" /> Copy
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button onClick={() => setActiveTab('balance')} className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center justify-between transition-colors">
          <span className="text-sm font-medium text-zinc-300">View Your Balance</span>
          <ArrowLeft className="w-4 h-4 text-zinc-500 rotate-180" />
        </button>
        <button onClick={() => setActiveTab('balance')} className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center justify-between transition-colors">
          <span className="text-sm font-medium text-zinc-300">View Your Balance History</span>
          <ArrowLeft className="w-4 h-4 text-zinc-500 rotate-180" />
        </button>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="border-b border-zinc-800 p-5 flex items-center gap-2 font-semibold text-white">
          <Wallet className="w-4 h-4 text-indigo-400" />
          Reward History
        </div>
        {referredUsers.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No referred purchases yet.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {referredUsers.map(item => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{item.referredUserEmail || 'Customer'}</div>
                  <div className="text-xs text-zinc-500">{new Date(item.date).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-zinc-400">Order ${Number(item.amount || 0).toFixed(2)}</div>
                  <div className="font-bold text-emerald-400">+${Number(item.earned || 0).toFixed(2)}</div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsTab({ profile, showToast }: { profile: any, showToast: any }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [photoURL, setPhotoURL] = useState(profile.photoURL);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        photoURL
      });
      showToast("Profile updated successfully!");
    } catch (e) {
      console.error(e);
      showToast("Failed to update profile.", "error");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Profile Picture</label>
          <ImageCropper 
            currentImage={photoURL} 
            onImageCropped={(url) => setPhotoURL(url)} 
            aspectRatio={1}
            circularCrop={true}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Display Name</label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Email (Read-only)</label>
          <input 
            type="email" 
            value={profile.email}
            disabled
            className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed"
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function PurchasesTab({ user, profile, setActiveTab }: { user: any, profile: any, setActiveTab: any }) {
  const [keys, setKeys] = useState<any[]>([]);
  const [invoiceByKeyId, setInvoiceByKeyId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creatingTicketFor, setCreatingTicketFor] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      const [keysSnap, txSnap] = await Promise.all([
        getDocs(query(collection(db, 'keys'), where('ownerId', '==', user.uid))),
        getDocs(query(collection(db, 'transactions'), where('userId', '==', user.uid)))
      ]);
      const invoiceMap: Record<string, string> = {};
      txSnap.docs.forEach(txDoc => {
        const tx = txDoc.data() as any;
        (tx.items || []).forEach((item: any) => {
          if (item.keyId) invoiceMap[item.keyId] = txDoc.id;
        });
      });
      setInvoiceByKeyId(invoiceMap);
      setKeys(keysSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchPurchases();
  }, [user]);

  if (loading) return <div className="text-zinc-500">Loading purchases...</div>;

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key);
  };

  const handleDownload = (key: any) => {
    const text = [
      'Rumble Hub Purchase',
      `Product: ${key.productName || 'Product'}`,
      `Variant: ${key.variantName || 'Standard'}`,
      `Key: ${key.keyString}`,
      '',
      key.instructions ? `Instructions:\n${key.instructions}` : ''
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rumble-hub-${key.productName || 'key'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenTicket = async (key: any) => {
    setCreatingTicketFor(key.id);
    try {
      const activeTicketsSnap = await getDocs(query(collection(db, 'tickets'), where('userId', '==', user.uid)));
      const activeTickets = activeTicketsSnap.docs.filter(ticket => ticket.data().status !== 'closed').length;
      if (activeTickets >= 3) {
        alert('You can have up to 3 active support tickets at once.');
        return;
      }

      const invoiceId = invoiceByKeyId[key.id] || 'Unknown';
      const batch = writeBatch(db);
      const newTicketRef = doc(collection(db, 'tickets'));
      const message = [
        `Invoice ID: ${invoiceId}`,
        `Product: ${key.productName || 'Product'}`,
        `Variant: ${key.variantName || 'Standard'}`,
        `Key: ${key.keyString}`,
        '',
        'Issue: Please describe what happened here.'
      ].join('\n');

      batch.set(newTicketRef, {
        userId: user.uid,
        userEmail: profile.email,
        subject: `Order issue: ${key.productName || 'Product'}`,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        invoiceId,
        keyId: key.id,
        lastMessage: `Invoice ID: ${invoiceId}`
      });

      batch.set(doc(collection(db, `tickets/${newTicketRef.id}/messages`)), {
        text: message,
        senderId: user.uid,
        senderName: profile.displayName || 'Me',
        ticketUserId: user.uid,
        isAdmin: false,
        createdAt: Date.now()
      });

      await batch.commit();
      fetch('/api/discord/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ticket_created', ticketId: newTicketRef.id })
      }).catch(() => {});
      setActiveTab('tickets');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to create ticket.');
    } finally {
      setCreatingTicketFor(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">My Purchases</h2>
      {keys.length === 0 ? (
        <div className="text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
          You haven't purchased any keys yet.
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map(k => (
            <div key={k.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="font-bold text-lg text-white">{k.productName}</div>
                  <div className="text-sm text-zinc-400">{k.variantName}</div>
                  <div className="text-xs text-zinc-500 mt-1">Purchased: {new Date(k.purchasedAt).toLocaleString()}</div>
                  <div className="text-xs text-zinc-500 mt-1">Invoice ID: <span className="font-mono text-zinc-300">{invoiceByKeyId[k.id] || 'Unknown'}</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCopy(k.keyString)} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5" /> Copy Key
                  </button>
                  <button onClick={() => handleDownload(k)} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button
                    onClick={() => handleOpenTicket(k)}
                    disabled={creatingTicketFor === k.id}
                    className="rounded-lg border border-indigo-500/30 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Ticket className="w-3.5 h-3.5" /> {creatingTicketFor === k.id ? 'Opening...' : 'Open Ticket'}
                  </button>
                </div>
              </div>
              <div className="bg-black/50 border border-zinc-800 px-4 py-2 rounded-lg font-mono text-indigo-400 select-all">
                {k.keyString}
              </div>
              {(k.instructions || k.instructionImages?.length > 0 || k.instructionImage?.url) && (
                <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-zinc-800 bg-black/20 p-4">
                  <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Instructions</div>
                  <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{k.instructions || 'No special instructions were added for this product.'}</div>
                  {(k.instructionImages?.length ? k.instructionImages : [k.instructionImage]).map((image: any, index: number) => image?.url ? (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvoicesTab({ user }: { user: any }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    const fetchInvoices = async () => {
      const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setInvoices(data);
      setLoading(false);
    };
    fetchInvoices();
  }, [user]);

  const filteredInvoices = invoices
    .filter(inv => {
      const term = search.toLowerCase();
      return (
        inv.id.toLowerCase().includes(term) ||
        (inv.productTitle || inv.productName || 'Top Up').toLowerCase().includes(term) ||
        (inv.promoCode || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'desc') return b.createdAt - a.createdAt;
      return a.createdAt - b.createdAt;
    });

  if (loading) return <div className="text-zinc-500">Loading invoices...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Search invoices..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <button 
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white hover:bg-zinc-800 transition-colors"
          >
            Sort: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-900 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Method</th>
                <th className="px-6 py-4 font-medium">Promo Code</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium border border-emerald-500/20">
                        Completed
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">{inv.id}</td>
                    <td className="px-6 py-4 font-medium text-white">{inv.productTitle || inv.productName || 'Top Up'}</td>
                    <td className="px-6 py-4 text-emerald-400">${inv.amount?.toFixed(2)}</td>
                    <td className="px-6 py-4 capitalize text-zinc-400">{inv.method || inv.paymentMethod || 'Stripe'}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      {inv.promoCode ? (
                        <div>
                          <span className="font-medium text-white">{inv.promoCode}</span>
                          {inv.promoDetails && <span className="text-xs ml-1 text-indigo-400">({inv.promoDetails})</span>}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{new Date(inv.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminProducts({ showToast }: { showToast: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [variants, setVariants] = useState<{id: string, name: string, price: number}[]>([
    { id: 'v1', name: 'Standard', price: 10 }
  ]);

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
    setVariants([{ id: 'v1', name: 'Standard', price: 10 }]);
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description);
    setImage(p.image);
    setVariants(p.variants || []);
  };

  const handleSave = async () => {
    if (!title || !image || variants.length === 0) return showToast("Title, image, and at least 1 variant are required.", "error");

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const data = { title, description, image, variants, slug };

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
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Products</h2>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-2">Delete Product?</h3>
            <p className="text-zinc-400 mb-6">Are you sure you want to delete "{productToDelete.title}"? All associated keys will be permanently deleted. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setProductToDelete(null)} className="px-4 py-2 rounded-lg font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">Cancel</button>
              <button onClick={confirmDeleteProduct} className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Description (Markdown Supported)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white h-32 font-mono text-sm" placeholder="**Bold**, *Italic*, # Heading, - List" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Product Image (16:9)</label>
            <ImageCropper 
              currentImage={image} 
              onImageCropped={(url) => setImage(url)} 
              aspectRatio={16/9}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Variants (e.g., 1 Day, 1 Week)</label>
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
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white" 
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
                  className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white" 
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
              <button onClick={resetForm} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {products.map(p => (
          <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={p.image} alt={p.title} className="w-16 h-16 object-cover rounded-lg bg-zinc-800" />
              <div>
                <div className="font-bold text-white">{p.title}</div>
                <div className="text-sm text-zinc-400">{p.variants?.length || 0} variants</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(p)} className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors">
                Edit
              </button>
              <button 
                onClick={() => setProductToDelete(p)} 
                className="text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50 px-4 py-2 rounded-lg transition-colors"
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

function AdminKeys({ showToast }: { showToast: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [keysInput, setKeysInput] = useState('');
  const [existingKeys, setExistingKeys] = useState<any[]>([]);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

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
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Keys</h2>

      {/* Delete Key Modal */}
      {keyToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-2">Delete Key?</h3>
            <p className="text-zinc-400 mb-6">Are you sure you want to delete this key? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setKeyToDelete(null)} className="px-4 py-2 rounded-lg font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">Cancel</button>
              <button onClick={confirmDeleteKey} className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Select Product</label>
          <select 
            value={selectedProductId} 
            onChange={e => {
              setSelectedProductId(e.target.value);
              setSelectedVariantId('');
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Choose Product --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Select Variant</label>
          <select 
            value={selectedVariantId} 
            onChange={e => setSelectedVariantId(e.target.value)}
            disabled={!selectedProductId}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Add New Keys</h3>
            <p className="text-sm text-zinc-400 mb-2">Enter one key per line.</p>
            <textarea 
              value={keysInput}
              onChange={e => setKeysInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white h-48 font-mono text-sm mb-4"
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
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              Inventory
              <span className="text-sm font-normal text-zinc-400">
                {existingKeys.filter(k => !k.isSold).length} Available / {existingKeys.length} Total
              </span>
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-2">
              {existingKeys.length === 0 ? (
                <div className="text-zinc-500 text-sm italic">No keys found for this variant.</div>
              ) : (
                existingKeys.map(k => (
                  <div key={k.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <div>
                      <div className="font-mono text-sm text-zinc-300">{k.keyString}</div>
                      <div className={`text-xs mt-1 ${k.isSold ? 'text-red-400' : 'text-green-400'}`}>
                        {k.isSold ? 'Sold' : 'Available'}
                      </div>
                    </div>
                    <button 
                      onClick={() => setKeyToDelete(k.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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

function AdminPromoCodes({ showToast }: { showToast: any }) {
  const [promos, setPromos] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'balance' | 'discount'>('balance');
  const [value, setValue] = useState(10);
  const [maxUses, setMaxUses] = useState(100);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(1);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateEmail, setAffiliateEmail] = useState('');

  useEffect(() => {
    const fetchPromos = async () => {
      const snap = await getDocs(collection(db, 'promocodes'));
      setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchPromos();
  }, []);

  const handleCreate = async () => {
    if (!code || value <= 0) return showToast("Invalid code or value", "error");
    if (isAffiliate && !affiliateEmail) return showToast("Enter affiliate email", "error");
    try {
      const newPromo = {
        code: code.toUpperCase(),
        type,
        value,
        maxUses,
        maxUsesPerUser,
        uses: 0,
        usedBy: {}, // Map of uid -> count
        isAffiliate,
        affiliateEmail: isAffiliate ? affiliateEmail.toLowerCase() : null,
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'promocodes'), newPromo);
      setPromos([...promos, { id: docRef.id, ...newPromo }]);
      setCode('');
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
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Promo Codes</h2>
      
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Create Promo Code</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white uppercase" placeholder="SUMMER50" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white">
              <option value="balance">Balance ($)</option>
              <option value="discount">Discount (%)</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Value</label>
            <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white" min="1" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Total Uses (0 = в€ћ)</label>
            <input type="number" value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white" min="0" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Uses/User (0 = в€ћ)</label>
            <input type="number" value={maxUsesPerUser} onChange={e => setMaxUsesPerUser(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white" min="0" />
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox" 
              id="adminIsAffiliate"
              checked={isAffiliate}
              onChange={e => setIsAffiliate(e.target.checked)}
              className="rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="adminIsAffiliate" className="text-sm text-zinc-400">Is Affiliate Promocode?</label>
          </div>
          {isAffiliate && (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Affiliate Email</label>
              <input 
                type="email" 
                value={affiliateEmail}
                onChange={e => setAffiliateEmail(e.target.value)}
                placeholder="Enter affiliate's email"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
          )}
        </div>

        <button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Create Code
        </button>
      </div>

      <div className="space-y-4">
        {promos.map(p => (
          <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-lg">{p.code}</div>
              <div className="text-sm text-zinc-400">
                {p.type === 'balance' ? `Adds $${p.value}` : `${p.value}% Discount`} &bull; 
                Uses: {p.uses} / {p.maxUses === 0 ? '∞' : p.maxUses} &bull; 
                Per User: {p.maxUsesPerUser === 0 ? '∞' : p.maxUsesPerUser}
                {p.isAffiliate && <span className="ml-2 text-indigo-400">&bull; Affiliate: {p.affiliateEmail}</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(p.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        {promos.length === 0 && (
          <div className="text-zinc-500 text-sm italic">No promo codes active.</div>
        )}
      </div>
    </div>
  );
}

function TicketsTab({ user, profile, startCreating = false }: { user: any, profile: any, startCreating?: boolean }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreating, setIsCreating] = useState(startCreating);
  const [newSubject, setNewSubject] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [createError, setCreateError] = useState('');
  const msgInitLoad = React.useRef(true);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    const q = query(collection(db, 'tickets'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const t = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      t.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setTickets(t);
    }, (err) => {
      console.error("Tickets Listener Error:", err);
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    if (!selectedTicketId) return;
    msgInitLoad.current = true;
    const q = query(collection(db, `tickets/${selectedTicketId}/messages`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!msgInitLoad.current) {
        const changes = snap.docChanges();
        const hasNewMsg = changes.some(c => c.type === 'added' && c.doc.data().senderId !== user.uid);
        if (hasNewMsg) playNotificationSound();
      }
      msgInitLoad.current = false;
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selectedTicketId, user.uid]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    try {
      const activeTickets = tickets.filter(ticket => ticket.status !== 'closed').length;
      if (activeTickets >= 3) {
        setCreateError('You can have up to 3 active support tickets at once.');
        return;
      }
      const batch = writeBatch(db);
      const newTicketRef = doc(collection(db, 'tickets'));
      
      batch.set(newTicketRef, {
        userId: user.uid,
        userEmail: profile.email,
        subject: newSubject,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastMessage: 'Ticket created'
      });
      
      const newMessageRef = doc(collection(db, `tickets/${newTicketRef.id}/messages`));
      batch.set(newMessageRef, {
        text: 'Ticket created. Please describe your issue.',
        senderId: 'system',
        senderName: 'System',
        ticketUserId: user.uid,
        isAdmin: true,
        createdAt: Date.now()
      });

      await batch.commit();

      setNewSubject('');
      setIsCreating(false);
      setCreateError('');
      setSelectedTicketId(newTicketRef.id);
      fetch('/api/discord/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ticket_created', ticketId: newTicketRef.id })
      }).catch(() => {});
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || !selectedTicket) return;

    try {
      const batch = writeBatch(db);
      const newMessageRef = doc(collection(db, `tickets/${selectedTicket.id}/messages`));
      
      batch.set(newMessageRef, {
        text: newMessage,
        attachments,
        senderId: user.uid,
        senderName: profile.displayName || 'Me',
        ticketUserId: user.uid,
        isAdmin: false,
        createdAt: Date.now()
      });
      
      const ticketRef = doc(db, 'tickets', selectedTicket.id);
      batch.update(ticketRef, {
        updatedAt: Date.now(),
        lastMessage: newMessage || `${attachments.length} attachment(s)`,
        status: 'active'
      });
      
      await batch.commit();

      setNewMessage('');
      setAttachments([]);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div className="h-[600px] flex gap-6">
      {/* Ticket List */}
      <div className="w-1/3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-bold text-white">My Tickets</h2>
          <button 
            onClick={() => {
              if (tickets.filter(ticket => ticket.status !== 'closed').length >= 3) {
                setCreateError('You can have up to 3 active support tickets at once.');
                setIsCreating(true);
                return;
              }
              setCreateError('');
              setIsCreating(true);
            }}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isCreating && (
            <div className="p-4 border-b border-zinc-800 bg-zinc-900">
              <form onSubmit={handleCreateTicket} className="space-y-2">
                <input 
                  type="text" 
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="Ticket Subject"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                {createError && <div className="text-xs text-red-400">{createError}</div>}
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white text-xs py-1.5 rounded-lg">Create</button>
                  <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-zinc-800 text-white text-xs py-1.5 rounded-lg">Cancel</button>
                </div>
              </form>
            </div>
          )}
          {tickets.length === 0 && !isCreating ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No tickets found.</div>
          ) : (
            tickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`p-4 border-b border-zinc-800 cursor-pointer transition-colors ${
                  selectedTicket?.id === ticket.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-white text-sm truncate pr-2">{ticket.subject}</div>
                  <div className="text-[10px] text-zinc-500 whitespace-nowrap">
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-zinc-400 truncate pr-4">{ticket.lastMessage}</div>
                  {ticket.status === 'closed' ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Closed</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
        {selectedTicket ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="font-bold text-white">{selectedTicket.subject}</h2>
              {selectedTicket.status === 'closed' && (
                <span className="text-xs text-zinc-500">This ticket is closed. Replying will reopen it.</span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl p-3 ${
                      isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                    }`}>
                      <div className="text-[10px] opacity-70 mb-1 flex justify-between gap-4">
                        <span>{msg.senderName}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="text-sm break-words whitespace-pre-wrap">{msg.text}</div>
                      <AttachmentList attachments={msg.attachments} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-zinc-800">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <span key={`${file.name}-${index}`} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">{file.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center">
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const attachment = await readAttachment(file);
                        setAttachments(current => [...current, attachment].slice(0, 3));
                      } catch (error: any) {
                        alert(error.message);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                <button 
                  type="submit"
                  disabled={!newMessage.trim() && attachments.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <Ticket className="w-12 h-12 mb-4 text-zinc-600" />
            <p className="text-lg font-medium">Select a ticket to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
