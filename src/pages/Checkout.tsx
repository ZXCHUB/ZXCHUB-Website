import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, limit, query, runTransaction, where } from 'firebase/firestore';
import { ArrowRight, CreditCard, KeyRound, ShieldCheck, Ticket } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import SEO from '../components/SEO';
import BrandName from '../components/BrandName';
import { getZxchubKeyPlan, PAID_WEB_KEY_PLANS, ZXCHUB_KEY_PRODUCT_ID } from '../keyPlans';

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function Checkout() {
  const { variantId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading, login, linkDiscord } = useAuth();
  const plan = getZxchubKeyPlan(variantId);
  const isPaidPlan = PAID_WEB_KEY_PLANS.some(item => item.id === plan.id);

  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>(params.get('method') === 'paypal' ? 'paypal' : 'stripe');
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [paypalClientId, setPaypalClientId] = useState('');
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'payments')).catch(() => null);
      setPaymentSettings(snap?.exists() ? snap.data() : null);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadPayPal = async () => {
      if (!paymentSettings?.paypal?.enabled) return;
      try {
        const response = await fetch('/api/payments/paypal-client-config');
        const data = await response.json();
        setPaypalClientId(data.clientId || paymentSettings.paypal.clientId || '');
      } catch {
        setPaypalClientId(paymentSettings.paypal.clientId || '');
      }
    };
    loadPayPal();
  }, [paymentSettings?.paypal?.enabled, paymentSettings?.paypal?.clientId]);

  const processOrder = async (sessionId?: string, metadata?: any) => {
    if (!user || !profile) return;
    setIsProcessing(true);
    setError('');

    try {
      const stockQuery = query(
        collection(db, 'keys'),
        where('productId', '==', ZXCHUB_KEY_PRODUCT_ID),
        where('variantId', '==', plan.id),
        where('isSold', '==', false),
        limit(1)
      );
      const keySnap = await getDocs(stockQuery);

      if (keySnap.empty) {
        throw new Error(`No ${plan.name} keys left in stock.`);
      }

      const keyDoc = keySnap.docs[0];
      const keyRef = doc(db, 'keys', keyDoc.id);
      const transactionRef = doc(collection(db, 'transactions'));
      const purchasedAt = Date.now();

      await runTransaction(db, async transaction => {
        const freshKey = await transaction.get(keyRef);
        if (!freshKey.exists()) throw new Error('Selected key no longer exists.');
        if (freshKey.data().isSold) throw new Error('This key was just sold. Please try again.');

        const deliveredItem = {
          keyId: keyRef.id,
          keyString: freshKey.data().keyString,
          productId: ZXCHUB_KEY_PRODUCT_ID,
          variantId: plan.id,
          productName: 'ZXCHUB Key',
          variantName: plan.name,
          price: plan.price,
          image: '/logo.png',
          instructions: 'Open ZXCHUB, paste your key, and join discord.gg/zxchub if you need help.'
        };

        transaction.update(keyRef, {
          isSold: true,
          ownerId: user.uid,
          ownerName: profile.displayName || user.email,
          ownerPhoto: profile.photoURL || '',
          purchasedAt,
          price: plan.price,
          productName: 'ZXCHUB Key',
          variantName: plan.name,
          paymentProvider: metadata?.paymentProvider || paymentMethod
        });

        transaction.set(transactionRef, {
          userId: user.uid,
          type: 'purchase',
          amount: plan.price,
          method: metadata?.paymentProvider === 'paypal' ? 'PayPal' : 'Credit Card',
          productTitle: 'ZXCHUB Key',
          planId: plan.id,
          planName: plan.name,
          items: [deliveredItem],
          subtotal: plan.price,
          createdAt: purchasedAt,
          ...(sessionId ? { sessionId } : {})
        });
      });

      fetch('/api/discord/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'order_paid', orderId: transactionRef.id })
      }).catch(() => {});

      fetch('/api/discord/give-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      }).catch(() => {});

      navigate(`/order/${transactionRef.id}`);
    } catch (purchaseError: any) {
      console.error(purchaseError);
      setError(purchaseError.message || 'Failed to complete purchase.');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const sessionId = params.get('session_id');
    if (!sessionId || !user || !profile) return;

    const verifySession = async () => {
      try {
        const existing = await getDocs(query(collection(db, 'transactions'), where('sessionId', '==', sessionId)));
        if (!existing.empty) {
          navigate(`/order/${existing.docs[0].id}`, { replace: true });
          return;
        }

        const response = await fetch('/api/payments/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const data = await response.json();
        if (data.success && data.metadata?.userId === user.uid && data.metadata?.planId === plan.id) {
          await processOrder(sessionId, data.metadata);
        }
      } catch (verifyError: any) {
        setError(verifyError.message || 'Failed to verify payment.');
      }
    };

    verifySession();
  }, [params, user, profile, plan.id]);

  const buildPaymentMetadata = () => ({
    type: 'zxchub-key',
    userId: user?.uid || '',
    planId: plan.id,
    planName: plan.name,
    productTitle: `ZXCHUB Key - ${plan.name}`
  });

  useEffect(() => {
    if (paymentMethod !== 'paypal' || !paypalClientId || !user?.uid) {
      setIsPayPalReady(false);
      return;
    }

    let cancelled = false;
    const scriptId = 'paypal-sdk-script';

    const renderButtons = () => {
      const container = document.getElementById('paypal-buttons');
      if (!container || !window.paypal || cancelled) return;
      container.innerHTML = '';
      window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
        createOrder: async () => {
          if (!profile?.discordId) {
            await linkDiscord();
          }
          const response = await fetch('/api/payments/paypal-create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: plan.price, userId: user.uid, metadata: buildPaymentMetadata() })
          });
          const data = await response.json();
          if (!data.id) throw new Error(data.error || 'Failed to create PayPal order.');
          return data.id;
        },
        onApprove: async (data: any) => {
          const response = await fetch('/api/payments/paypal-capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID })
          });
          const capture = await response.json();
          if (!capture.success) throw new Error(capture.error || 'PayPal payment was not completed.');
          await processOrder(capture.orderId || data.orderID, { ...buildPaymentMetadata(), paymentProvider: 'paypal' });
        },
        onError: (paypalError: any) => {
          console.error(paypalError);
          setError(paypalError?.message || 'PayPal payment failed.');
          setIsProcessing(false);
        }
      }).render('#paypal-buttons');
      setIsPayPalReady(true);
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (window.paypal && existingScript?.dataset.clientId === paypalClientId) {
      renderButtons();
      return () => {
        cancelled = true;
      };
    }

    if (existingScript) {
      existingScript.remove();
      window.paypal = undefined;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.dataset.clientId = paypalClientId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = renderButtons;
    script.onerror = () => setError('Failed to load PayPal checkout.');
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [paymentMethod, paypalClientId, user?.uid, profile?.discordId, plan.id, plan.price]);

  const handleStripe = async () => {
    if (!user || !profile) {
      await login();
      return;
    }
    if (!profile.discordId) {
      try {
        await linkDiscord();
      } catch (discordError: any) {
        setError(discordError.message || 'Link Discord before checkout.');
        return;
      }
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.price,
          method: 'stripe',
          userId: user.uid,
          metadata: buildPaymentMetadata(),
          successUrl: `${window.location.origin}/checkout/key/${plan.id}?method=card&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/get-key?method=card`
        })
      });
      const data = await response.json();
      if (!data.url) throw new Error(data.error || 'Failed to create checkout session.');
      window.location.href = data.url;
    } catch (stripeError: any) {
      setError(stripeError.message || 'Failed to start Stripe checkout.');
      setIsProcessing(false);
    }
  };

  if (!loading && (!user || !profile)) {
    return (
      <div className="min-h-screen bg-[#050507] px-4 py-28 text-white">
        <SEO title="Sign In | ZXCHUB" description="Sign in to buy a ZXCHUB key." />
        <div className="mx-auto max-w-lg border border-white/10 bg-[#09090d] p-8 text-center">
          <KeyRound className="mx-auto mb-5 h-10 w-10 text-red-500" />
          <h1 className="text-3xl font-black">Sign In Required</h1>
          <p className="mt-3 text-zinc-400">Sign in and link Discord before purchasing so the key can be delivered to My Purchases.</p>
          <button onClick={login} className="mt-7 bg-red-600 px-6 py-3 text-sm font-black uppercase text-white hover:bg-red-500">Sign In</button>
        </div>
      </div>
    );
  }

  if (!isPaidPlan) return <Navigate to="/get-key?method=card" replace />;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <SEO title="Checkout | ZXCHUB" description="Complete your ZXCHUB key purchase." />
      <main className="mx-auto grid min-h-screen max-w-6xl gap-10 px-4 py-12 pt-28 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <Link to="/" className="mb-8 flex items-center gap-3">
            <img src="/logo.png" alt="ZXCHUB" className="h-9 w-9 object-contain" />
            <BrandName className="text-xl" />
          </Link>

          <div className="border border-white/10 bg-[#09090d] p-6">
            <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-red-400">Secure Access</div>
            <h1 className="text-4xl font-black">ZXCHUB Key</h1>
            <div className="mt-2 text-zinc-400">{plan.name}</div>
            <div className="mt-8 text-5xl font-black">${plan.price.toFixed(2)}</div>

            <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm text-zinc-300">
              <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-red-400" /> Works with every published ZXCHUB script</div>
              <div className="flex items-center gap-3"><KeyRound className="h-4 w-4 text-red-400" /> One unused key is reserved and delivered after payment</div>
              <div className="flex items-center gap-3"><Ticket className="h-4 w-4 text-red-400" /> Support through discord.gg/zxchub</div>
            </div>
          </div>
        </aside>

        <section className="border border-white/10 bg-[#08080b] p-6 sm:p-8">
          <div className="mb-8">
            <div className="text-sm font-bold text-zinc-500">Total</div>
            <div className="mt-1 text-3xl font-black">${plan.price.toFixed(2)}</div>
          </div>

          {profile && !profile.discordId && (
            <div className="mb-6 border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              Link Discord before checkout. The bot can add you to the server, and paid purchases can receive the configured Discord role.
            </div>
          )}

          <div className="mb-8 grid gap-3">
            {(!paymentSettings || paymentSettings?.stripe?.enabled) && (
              <button
                type="button"
                onClick={() => setPaymentMethod('stripe')}
                className={`flex items-center justify-between border p-5 text-left transition ${paymentMethod === 'stripe' ? 'border-red-500 bg-red-500/10' : 'border-white/10 bg-black hover:border-white/25'}`}
              >
                <span>
                  <span className="block font-black">Bank Card / Google Pay / Apple Pay</span>
                  <span className="mt-1 block text-sm text-zinc-500">Powered by Stripe Checkout</span>
                </span>
                <CreditCard className="h-5 w-5 text-zinc-400" />
              </button>
            )}

            {paymentSettings?.paypal?.enabled && (
              <button
                type="button"
                onClick={() => setPaymentMethod('paypal')}
                className={`flex items-center justify-between border p-5 text-left transition ${paymentMethod === 'paypal' ? 'border-red-500 bg-red-500/10' : 'border-white/10 bg-black hover:border-white/25'}`}
              >
                <span>
                  <span className="block font-black">PayPal</span>
                  <span className="mt-1 block text-sm text-zinc-500">PayPal wallet or card through PayPal</span>
                </span>
                <CreditCard className="h-5 w-5 text-zinc-400" />
              </button>
            )}
          </div>

          {error && <div className="mb-6 border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

          {paymentMethod === 'paypal' ? (
            <div>
              {!paypalClientId && <div className="border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">PayPal is enabled but Client ID is missing.</div>}
              <div id="paypal-buttons" className="min-h-32" />
              {paypalClientId && !isPayPalReady && <div className="text-center text-sm text-zinc-500">Loading PayPal...</div>}
            </div>
          ) : (
            <button
              onClick={handleStripe}
              disabled={isProcessing}
              className="flex min-h-14 w-full items-center justify-center gap-2 bg-red-600 px-6 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : <>Proceed to Payment <ArrowRight className="h-4 w-4" /></>}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
