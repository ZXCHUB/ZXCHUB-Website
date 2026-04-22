import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, limit, query, runTransaction, where, updateDoc } from 'firebase/firestore';
import { ArrowRight, CreditCard, Gamepad2, Ticket, Wallet } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import SEO from '../components/SEO';

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function Checkout() {
  const { productId, variantId } = useParams();
  const { user, profile, cart, cartTotal, clearCart } = useAuth();
  const navigate = useNavigate();

  const isCartCheckout = !productId;

  const [product, setProduct] = useState<any>(null);
  const [variant, setVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const [useBalance, setUseBalance] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [agreedToTOS, setAgreedToTOS] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paypalClientId, setPaypalClientId] = useState('');
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [discountSettings, setDiscountSettings] = useState({
    reviewDiscountPercent: 5,
    affiliateCommissionPercent: 20
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [paymentsSnap, discountsSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'payments')),
          getDoc(doc(db, 'settings', 'discounts'))
        ]);
        if (paymentsSnap.exists()) {
          setPaymentSettings(paymentsSnap.data());
        }
        if (discountsSnap.exists()) {
          const data = discountsSnap.data() as any;
          setDiscountSettings({
            reviewDiscountPercent: Number(data.reviewDiscountPercent ?? 5),
            affiliateCommissionPercent: Number(data.affiliateCommissionPercent ?? 20)
          });
        }
      } catch(e) {}
    };
    fetchSettings();
  },[]);

  useEffect(() => {
    const loadPayPalConfig = async () => {
      if (!paymentSettings?.paypal?.enabled) return;
      try {
        const response = await fetch('/api/payments/paypal-client-config');
        const data = await response.json();
        setPaypalClientId(data.clientId || paymentSettings?.paypal?.clientId || '');
      } catch {
        setPaypalClientId(paymentSettings?.paypal?.clientId || '');
      }
    };
    loadPayPalConfig();
  }, [paymentSettings?.paypal?.enabled, paymentSettings?.paypal?.clientId]);

  useEffect(() => {
    if (isCartCheckout) {
      if (cart.length === 0) {
        navigate('/');
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const qty = parseInt(params.get('qty') || '1', 10);
    setQuantity(qty > 0 ? qty : 1);

    const fetchProduct = async () => {
      if (!productId) return;
      const docSnap = await getDoc(doc(db, 'products', productId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProduct(data);
        const selected = data.variants?.find((item: any) => item.id === variantId);
        if (selected) {
          setVariant(selected);
        }
      }
    };

    fetchProduct();
  }, [productId, variantId, isCartCheckout, cart, navigate]);

  const subtotal = isCartCheckout ? cartTotal : (variant?.price || 0) * quantity;
  const getProductSubtotal = (targetProductId?: string | null) => {
    if (!targetProductId) return subtotal;
    if (isCartCheckout) {
      return cart
        .filter(item => item.productId === targetProductId)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
    return productId === targetProductId ? subtotal : 0;
  };
  const promoDiscountBase = appliedPromo?.productScope === 'product' ? getProductSubtotal(appliedPromo.productId) : subtotal;
  const promoDiscountAmount = discountPercent > 0 ? promoDiscountBase * (discountPercent / 100) : 0;
  const reviewDiscountPercent = profile?.reviewDiscountAvailable && discountPercent === 0 ? Number(discountSettings.reviewDiscountPercent || 0) : 0;
  const reviewDiscountAmount = reviewDiscountPercent > 0 ? subtotal * (reviewDiscountPercent / 100) : 0;
  const effectiveDiscountPercent = discountPercent > 0 ? discountPercent : reviewDiscountPercent;
  const discountAmount = discountPercent > 0 ? promoDiscountAmount : reviewDiscountAmount;
  const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const balanceToUse = useBalance ? Math.min(profile?.balance || 0, totalAfterDiscount) : 0;
  const finalAmount = totalAfterDiscount - balanceToUse;

  const handleApplyPromo = async (codeToApply?: string) => {
    const code = codeToApply || promoCode;
    setPromoError('');
    setPromoSuccess('');
    if (!code.trim()) return;

    try {
      const promoSnap = await getDocs(
        query(collection(db, 'promocodes'), where('code', '==', code.toUpperCase()))
      );

      if (promoSnap.empty) {
        setPromoError('Invalid coupon code');
        return;
      }

      const promo = promoSnap.docs[0].data();
      const scopedProductId = promo.productScope === 'product' ? promo.productId : null;

      if (promo.maxUses > 0 && promo.uses >= promo.maxUses) {
        setPromoError('Coupon code has reached maximum uses');
        return;
      }

      const userUses = promo.usedBy?.[user?.uid || ''] || 0;
      if (promo.maxUsesPerUser > 0 && userUses >= promo.maxUsesPerUser) {
        setPromoError('You have reached the maximum uses for this coupon');
        return;
      }

      if (promo.type === 'discount') {
        if (scopedProductId && getProductSubtotal(scopedProductId) <= 0) {
          setPromoError(`This coupon only works for ${promo.productTitle || 'a specific product'}.`);
          return;
        }
        setDiscountPercent(promo.value);
        setAppliedPromo({
          code: code.toUpperCase(),
          value: promo.value,
          productScope: promo.productScope || 'all',
          productId: scopedProductId,
          productTitle: promo.productTitle || ''
        });
        setPromoCode(code.toUpperCase());
        setPromoSuccess(
          scopedProductId
            ? `Applied ${promo.value}% discount to ${promo.productTitle || 'selected product'}!`
            : `Applied ${promo.value}% discount!`
        );
      } else {
        setPromoError('This coupon is only for balance top-ups.');
      }
    } catch {
      setPromoError('Failed to apply coupon');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId && user && profile && (isCartCheckout || (product && variant))) {
      const verifySession = async () => {
        try {
          const existingTransaction = await getDocs(
            query(collection(db, 'transactions'), where('sessionId', '==', sessionId))
          );

          if (!existingTransaction.empty) {
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate(`/order/${existingTransaction.docs[0].id}`);
            return;
          }

          const res = await fetch('/api/payments/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await res.json();

          if (data.success && data.metadata?.userId === user.uid) {
            await processOrder(sessionId, data.metadata);
          }
        } catch (verifyError) {
          console.error('Failed to verify session', verifyError);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      verifySession();
    }
  }, [user, profile, product, variant, isCartCheckout, navigate]);

  const processOrder = async (sessionId?: string, metadata?: any) => {
    if (!user || !profile) return;
    if (!isCartCheckout && (!product || !variant)) return;
    if (isCartCheckout && cart.length === 0) return;

    setIsProcessing(true);
    setError('');

    try {
      const keysToBuy: Array<{ docId: string; price: number; title: string; productId: string; variantId: string; variantName: string; image?: string; instructions?: string; instructionImage?: any; instructionImages?: any[] }> = [];
      const productsById: Record<string, any> = {};

      if (isCartCheckout) {
        const productIds = Array.from(new Set(cart.map(item => item.productId)));
        await Promise.all(productIds.map(async id => {
          const snap = await getDoc(doc(db, 'products', id));
          if (snap.exists()) {
            productsById[id] = { id: snap.id, ...snap.data() };
          }
        }));

        for (const item of cart) {
          const stockQuery = query(
            collection(db, 'keys'),
            where('productId', '==', item.productId),
            where('variantId', '==', item.variantId),
            where('isSold', '==', false),
            limit(item.quantity)
          );
          const snap = await getDocs(stockQuery);
          if (snap.docs.length < item.quantity) {
            throw new Error(`Not enough stock for ${item.title} (${item.variantName})`);
          }
          keysToBuy.push(...snap.docs.map(d => ({
            docId: d.id,
            price: item.price,
            title: item.title,
            productId: item.productId,
            variantId: item.variantId,
            variantName: item.variantName,
            image: item.image,
            instructions: productsById[item.productId]?.instructions || '',
            instructionImage: productsById[item.productId]?.instructionImage || null,
            instructionImages: productsById[item.productId]?.instructionImages || []
          })));
        }
      } else {
        const stockQuery = query(
          collection(db, 'keys'),
          where('productId', '==', productId),
          where('variantId', '==', variantId),
          where('isSold', '==', false),
          limit(quantity)
        );
        const keySnap = await getDocs(stockQuery);

        if (keySnap.docs.length < quantity) {
          throw new Error(`Sorry, only ${keySnap.docs.length} keys left in stock!`);
        }

        keysToBuy.push(...keySnap.docs.map(d => ({
          docId: d.id,
          price: variant.price,
          title: product.title,
          productId: productId!,
          variantId: variantId!,
          variantName: variant.name,
          image: product.image,
          instructions: product.instructions || '',
          instructionImage: product.instructionImage || null,
          instructionImages: product.instructionImages || []
        })));
      }

      const appliedDiscountPercent = metadata?.discountPercent ? Number(metadata.discountPercent) : effectiveDiscountPercent;
      const appliedPromoCode = metadata?.promoCode || promoCode;
      const appliedBalanceToUse = metadata?.balanceUsed ? Number(metadata.balanceUsed) : balanceToUse;
      const appliedReviewDiscount = metadata?.reviewDiscount === 'true' || (reviewDiscountPercent > 0 && !appliedPromoCode);
      const currentSubtotal = isCartCheckout ? cartTotal : (variant?.price || 0) * quantity;
      const metadataPromoProductId = metadata?.promoProductId || appliedPromo?.productId || null;
      const currentPromoDiscountBase = metadataPromoProductId ? getProductSubtotal(metadataPromoProductId) : currentSubtotal;
      const currentDiscountBase = appliedReviewDiscount ? currentSubtotal : currentPromoDiscountBase;
      const currentDiscountAmount = appliedDiscountPercent > 0 ? currentDiscountBase * (appliedDiscountPercent / 100) : 0;
      const currentTotalAfterDiscount = Math.max(0, currentSubtotal - currentDiscountAmount);
      const affiliateCommissionPercent = metadata?.affiliateCommissionPercent
        ? Number(metadata.affiliateCommissionPercent)
        : Number(discountSettings.affiliateCommissionPercent || 0);

      const userRef = doc(db, 'users', user.uid);
      const promoQuery =
        appliedDiscountPercent > 0 && appliedPromoCode
          ? query(collection(db, 'promocodes'), where('code', '==', appliedPromoCode.toUpperCase()))
          : null;
      const promoSnap = promoQuery ? await getDocs(promoQuery) : null;
      const promoDocRef = promoSnap && !promoSnap.empty ? doc(db, 'promocodes', promoSnap.docs[0].id) : null;
      const promoData = promoSnap && !promoSnap.empty ? promoSnap.docs[0].data() : null;

      let affiliateDocRef = null;
      if (promoData && promoData.isAffiliate && promoData.affiliateEmail) {
        const affiliateQ = query(collection(db, 'users'), where('email', '==', promoData.affiliateEmail.toLowerCase()));
        const affiliateSnap = await getDocs(affiliateQ);
        if (!affiliateSnap.empty) {
          affiliateDocRef = doc(db, 'users', affiliateSnap.docs[0].id);
        }
      }

      const transactionRef = doc(collection(db, 'transactions'));
      const purchasedAt = Date.now();

      let promoDetailsStr: string | null = null;
      await runTransaction(db, async transaction => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error('User profile not found.');
        }

        const latestProfile = userSnap.data() as any;
        const currentBalance = Number(latestProfile.balance || 0);
        if (appliedBalanceToUse > currentBalance) {
          throw new Error('Insufficient balance.');
        }

        const keyRefs = keysToBuy.map(key => doc(db, 'keys', key.docId));
        const keySnaps = await Promise.all(keyRefs.map(ref => transaction.get(ref)));
        const promoDocSnap = promoDocRef && promoData ? await transaction.get(promoDocRef) : null;
        const affSnap = affiliateDocRef ? await transaction.get(affiliateDocRef) : null;

        keySnaps.forEach((snap, index) => {
          if (!snap.exists()) {
            throw new Error('One of the selected keys no longer exists.');
          }
          if (snap.data().isSold) {
            throw new Error(`Sorry, ${keysToBuy[index].title} just went out of stock. Please try again.`);
          }
        });

        let promoUpdate: { uses: number; usedBy: Record<string, number> } | null = null;
        if (promoDocRef && promoData) {
          if (!promoDocSnap?.exists()) {
            throw new Error('The coupon code is no longer available.');
          }

          const currentPromoData = promoDocSnap.data() as any;
          const uses = Number(currentPromoData.uses || 0);
          const maxUses = Number(currentPromoData.maxUses || 0);
          const userUses = Number(currentPromoData.usedBy?.[user.uid] || 0);
          const maxUsesPerUser = Number(currentPromoData.maxUsesPerUser || 0);

          if (maxUses > 0 && uses >= maxUses) {
            throw new Error('Coupon code has reached maximum uses.');
          }
          if (maxUsesPerUser > 0 && userUses >= maxUsesPerUser) {
            throw new Error('You have reached the maximum uses for this coupon.');
          }
          if (currentPromoData.productScope === 'product') {
            const scopedProductId = currentPromoData.productId;
            const hasScopedProduct = keysToBuy.some(key => key.productId === scopedProductId);
            if (!hasScopedProduct || currentPromoDiscountBase <= 0) {
              throw new Error('This coupon does not apply to the selected product.');
            }
          }

          promoDetailsStr = currentPromoData.type === 'balance' ? `+$${currentPromoData.value} bonus` : `${currentPromoData.value}% discount`;
          promoUpdate = {
            uses: uses + 1,
            usedBy: { ...currentPromoData.usedBy, [user.uid]: userUses + 1 }
          };
        }

        const shouldCreditAffiliate = Boolean(affiliateDocRef && affSnap?.exists() && affSnap.id !== user.uid);
        const affData = shouldCreditAffiliate ? affSnap!.data() as any : null;
        const earned = shouldCreditAffiliate ? currentTotalAfterDiscount * (affiliateCommissionPercent / 100) : 0;

        if (promoDocRef && promoUpdate) {
          transaction.update(promoDocRef, promoUpdate);
        }

        if (affiliateDocRef && shouldCreditAffiliate && affData) {
          transaction.update(affiliateDocRef, {
            balance: Number(affData.balance || 0) + earned,
            affiliateEarnings: Number(affData.affiliateEarnings || 0) + earned
          });
          const affHistoryRef = doc(collection(db, 'affiliate_history'));
          transaction.set(affHistoryRef, {
            affiliateId: affSnap!.id,
            referredUserId: user.uid,
            referredUserEmail: user.email,
            amount: currentTotalAfterDiscount,
            earned: earned,
            date: purchasedAt
          });
        }

        if (appliedBalanceToUse > 0 || appliedReviewDiscount) {
          transaction.update(userRef, {
            ...(appliedBalanceToUse > 0 ? { balance: currentBalance - appliedBalanceToUse } : {}),
            ...(appliedReviewDiscount ? { reviewDiscountAvailable: false } : {})
          });
        }

        const deliveredItems = keyRefs.map((keyRef, index) => {
          const key = keysToBuy[index];
          return {
            keyId: keyRef.id,
            keyString: keySnaps[index].data().keyString,
            productId: key.productId,
            variantId: key.variantId,
            productName: key.title,
            variantName: key.variantName,
            price: key.price,
            image: key.image || '',
            instructions: key.instructions || '',
            instructionImage: key.instructionImage || null,
            instructionImages: key.instructionImages || []
          };
        });

        keyRefs.forEach((keyRef, index) => {
          const key = keysToBuy[index];
          transaction.update(keyRef, {
            isSold: true,
            ownerId: user.uid,
            ownerName: latestProfile.displayName || user.email,
            ownerPhoto: latestProfile.photoURL || '',
            purchasedAt,
            price: key.price,
            productName: key.title,
            instructions: key.instructions || '',
            instructionImage: key.instructionImage || null,
            instructionImages: key.instructionImages || []
          });
        });

        transaction.set(transactionRef, {
          userId: user.uid,
          type: 'purchase',
          amount: currentTotalAfterDiscount,
          method:
            appliedBalanceToUse === currentTotalAfterDiscount
              ? 'Balance'
              : metadata?.paymentProvider === 'paypal' || paymentMethod === 'paypal'
                ? 'PayPal'
                : 'Credit Card',
          productTitle: isCartCheckout ? 'Cart Checkout' : product.title,
          items: deliveredItems,
          subtotal: currentSubtotal,
          discountPercent: appliedDiscountPercent,
          discountAmount: currentDiscountAmount,
          discountBase: currentDiscountBase,
          reviewDiscountApplied: appliedReviewDiscount,
          balanceUsed: appliedBalanceToUse,
          promoCode: appliedPromoCode || null,
          promoProductId: metadataPromoProductId || null,
          promoDetails: promoDetailsStr,
          createdAt: purchasedAt,
          ...(sessionId ? { sessionId } : {})
        });
      });

      if (isCartCheckout) {
        clearCart();
      }

      try {
         await fetch('/api/discord/give-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid })
         });
      } catch (e) {}

      fetch('/api/discord/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'order_paid', orderId: transactionRef.id })
      }).catch(() => {});

      navigate(`/order/${transactionRef.id}`);
    } catch (purchaseError: any) {
      console.error(purchaseError);
      setError(purchaseError.message || 'An error occurred during purchase.');
      setIsProcessing(false);
    }
  };

  const buildPaymentMetadata = () => {
    const metadata: any = isCartCheckout ? { type: 'cart' } : { productId, variantId, quantity };
    if (effectiveDiscountPercent > 0) {
      metadata.discountPercent = effectiveDiscountPercent;
      if (reviewDiscountPercent > 0 && discountPercent === 0) {
        metadata.reviewDiscount = 'true';
      }
    }
    if (discountPercent > 0) {
      metadata.promoCode = promoCode.toUpperCase();
      if (appliedPromo?.productScope === 'product') {
        metadata.promoProductId = appliedPromo.productId;
      }
    }
    metadata.affiliateCommissionPercent = discountSettings.affiliateCommissionPercent;
    if (useBalance && balanceToUse > 0) {
      metadata.balanceUsed = balanceToUse;
    }
    return metadata;
  };

  useEffect(() => {
    if (paymentMethod !== 'paypal' || finalAmount <= 0 || !paypalClientId) {
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
          if (!agreedToTOS) {
            setError('You must agree to the Terms of Service.');
            throw new Error('Terms of Service must be accepted.');
          }
          if (!user?.uid) {
            setError('Please sign in before paying.');
            throw new Error('User is not signed in.');
          }
          setError('');
          const response = await fetch('/api/payments/paypal-create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: finalAmount,
              userId: user.uid,
              metadata: buildPaymentMetadata()
            })
          });
          const data = await response.json();
          if (!data.id) {
            throw new Error(data.error || 'Failed to create PayPal order.');
          }
          return data.id;
        },
        onApprove: async (data: any) => {
          setIsProcessing(true);
          try {
            const response = await fetch('/api/payments/paypal-capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID })
            });
            const capture = await response.json();
            if (!capture.success) {
              throw new Error(capture.error || 'PayPal payment was not completed.');
            }
            await processOrder(capture.orderId || data.orderID, {
              ...buildPaymentMetadata(),
              paymentProvider: 'paypal',
              paypalOrderId: capture.orderId || data.orderID,
              paypalPayerEmail: capture.payerEmail || ''
            });
          } catch (paypalError: any) {
            console.error(paypalError);
            setError(paypalError.message || 'Failed to complete PayPal payment.');
            setIsProcessing(false);
          }
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
  }, [paymentMethod, paypalClientId, finalAmount, agreedToTOS, user?.uid, promoCode, discountPercent, useBalance, balanceToUse]);

  const handleProceed = async () => {
    if (!agreedToTOS) {
      setError('You must agree to the Terms of Service.');
      return;
    }

    if (finalAmount === 0) {
      await processOrder();
      return;
    }

    if (paymentMethod === 'stripe') {
      setIsProcessing(true);
      try {
        const metadata = buildPaymentMetadata();

        const res = await fetch('/api/payments/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalAmount,
            method: 'stripe',
            userId: user.uid,
            metadata,
            successUrl:
              window.location.origin +
              `/checkout/${isCartCheckout ? 'cart' : `${productId}/${variantId}`}?session_id={CHECKOUT_SESSION_ID}&qty=${quantity}`,
            cancelUrl:
              window.location.origin +
              `/checkout/${isCartCheckout ? 'cart' : `${productId}/${variantId}`}?qty=${quantity}`
          })
        });
        const data = await res.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'Failed to create checkout session');
        }
      } catch (paymentError: any) {
        console.error(paymentError);
        setError(paymentError.message || 'Failed to initiate payment');
        setIsProcessing(false);
      }
      return;
    }

    setError('Use the PayPal button to complete payment.');
  };

  if (!isCartCheckout && (!product || !variant)) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="w-full">
      <SEO title="Checkout | ZXCHUB" description="Complete your secure purchase on ZXCHUB." />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-32">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-1/3">
            <Link to="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="ZXCHUB" className="w-8 h-8 object-contain" />
              <span className="font-bold text-xl">ZXCHUB</span>
            </Link>

            <div className="text-zinc-400 text-sm mb-2">Pay ZXCHUB</div>
            <div className="text-4xl font-bold text-white mb-8">${finalAmount.toFixed(2)}</div>

            {isCartCheckout ? (
              <div className="space-y-4 mb-6">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1A1D24] rounded-xl p-4 border border-zinc-800/50 flex gap-4 items-center"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Gamepad2 className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-white">{item.title}</div>
                      <div className="text-sm text-zinc-400">{item.variantName}</div>
                      <div className="text-xs text-zinc-500">{item.quantity}x</div>
                    </div>
                    <div className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1A1D24] rounded-xl p-4 border border-zinc-800/50 mb-6 flex gap-4 items-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-16 h-16 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center">
                    <Gamepad2 className="w-8 h-8 text-zinc-600" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-bold text-white">{product.title}</div>
                  <div className="text-sm text-zinc-400">{variant.name}</div>
                  <div className="text-xs text-zinc-500">{quantity}x</div>
                </div>
                <div className="font-bold text-white">${subtotal.toFixed(2)}</div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {effectiveDiscountPercent > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>{reviewDiscountPercent > 0 && discountPercent === 0 ? 'Review Reward' : 'Discount'} ({effectiveDiscountPercent}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {balanceToUse > 0 && (
                <div className="flex justify-between text-indigo-400">
                  <span>Balance Used</span>
                  <span>-${balanceToUse.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold pt-3 border-t border-zinc-800/50">
                <span>Total</span>
                <span>${finalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-zinc-800/50">
              <div className="text-sm font-bold text-white mb-2">Having issues with your order?</div>
              <div className="text-xs text-zinc-400 mb-4">
                You can open a ticket on your Customer Dashboard to receive assistance from our support team.
              </div>
              <button
                onClick={() => navigate('/profile?tab=tickets')}
                className="border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 px-4 py-2 rounded-lg text-xs font-medium transition-colors mb-8 flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" /> Open a Support Ticket
              </button>

              <div className="flex gap-4 text-xs text-zinc-500">
                <a href="/terms-of-service" target="_blank" className="hover:text-zinc-300 transition-colors">
                  Terms of Service
                </a>
                <span>&bull;</span>
                <a href="/refund-policy" target="_blank" className="hover:text-zinc-300 transition-colors">
                  Refund Policy
                </a>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-2/3">
            <div className="flex items-center gap-8 border-b border-zinc-800/50 pb-4 mb-8">
              <div className="text-indigo-400 font-medium border-b-2 border-indigo-500 pb-4 -mb-[18px]">
                <div className="text-xs text-indigo-400/70">Step 1</div>
                Order Information
              </div>
              <div className="text-zinc-500 font-medium">
                <div className="text-xs text-zinc-600">Step 2</div>
                Confirm & Pay
              </div>
              <div className="text-zinc-500 font-medium">
                <div className="text-xs text-zinc-600">Step 3</div>
                Receive Your Items
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Coupon Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={e => {
                      setPromoCode(e.target.value);
                      setDiscountPercent(0);
                      setAppliedPromo(null);
                      setPromoSuccess('');
                      setPromoError('');
                    }}
                    placeholder="Have a coupon code? Enter it here."
                    className="flex-1 bg-[#1A1D24] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    onClick={() => handleApplyPromo()}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Apply &rarr;
                  </button>
                </div>
                {promoError && <div className="text-red-400 text-xs mt-2">{promoError}</div>}
                {promoSuccess && <div className="text-green-400 text-xs mt-2">{promoSuccess}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Payment Method *</label>

                <div className="space-y-3">
                  {(!paymentSettings || paymentSettings?.balance?.enabled) && (
                  <label
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                      useBalance
                        ? 'bg-indigo-500/10 border-indigo-500'
                        : 'bg-[#1A1D24] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={useBalance}
                        onChange={e => setUseBalance(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
                      />
                      <div>
                        <div className="font-medium text-white">Customer Balance</div>
                        <div className="text-xs text-zinc-500">Available: ${(profile?.balance || 0).toFixed(2)}</div>
                      </div>
                    </div>
                    <Wallet className={`w-5 h-5 ${useBalance ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  </label>
                  )}

                  {(!paymentSettings || paymentSettings?.stripe?.enabled) && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`flex w-full items-center justify-between p-4 rounded-xl border text-left transition-colors ${
                      paymentMethod === 'stripe'
                        ? 'bg-[#22252D] border-red-500'
                        : 'bg-[#1A1D24] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-4 bg-zinc-900 ${paymentMethod === 'stripe' ? 'border-red-600' : 'border-zinc-600'}`}></div>
                      <div>
                        <div className="font-medium text-white">Debit Card / Credit Card / Google Pay / Apple Pay</div>
                        <div className="text-xs text-zinc-500">Powered by Stripe</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <CreditCard className="w-5 h-5 text-zinc-400" />
                    </div>
                  </button>
                  )}

                  {paymentSettings?.paypal?.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`flex w-full items-center justify-between p-4 rounded-xl border text-left transition-colors ${
                      paymentMethod === 'paypal'
                        ? 'bg-[#22252D] border-red-500'
                        : 'bg-[#1A1D24] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-4 bg-zinc-900 ${paymentMethod === 'paypal' ? 'border-red-600' : 'border-zinc-600'}`}></div>
                      <div>
                        <div className="font-medium text-white">PayPal</div>
                        <div className="text-xs text-zinc-500">PayPal balance, card, or supported wallet</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <CreditCard className="w-5 h-5 text-zinc-400" />
                    </div>
                  </button>
                  )}
                  
                  {paymentSettings && !paymentSettings?.stripe?.enabled && !paymentSettings?.balance?.enabled && !paymentSettings?.paypal?.enabled && (
                    <div className="text-red-400 text-sm">No payment methods available right now.</div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTOS}
                    onChange={e => setAgreedToTOS(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
                  />
                  <span className="text-sm text-zinc-300">
                    I have read and agree to ZXCHUB&apos;s{' '}
                    <a href="/terms-of-service" target="_blank" className="text-indigo-400 hover:underline">
                      Terms of Service
                    </a>
                    .
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">{error}</div>
              )}

              {profile && !profile.discordId ? (
                <button
                  onClick={() => {
                     window.open(`/api/discord/auth-url?uid=${user?.uid}`, '_blank', 'width=500,height=600');
                     window.addEventListener('message', async (e) => {
                        if (e.data?.type === 'discord_auth_success') {
                           if (user) {
                             try {
                               await updateDoc(doc(db, 'users', user.uid), e.data.data);
                               window.location.reload();
                             } catch (err) {
                               console.error(err);
                             }
                           }
                        }
                     });
                  }}
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Link Discord to Continue
                </button>
              ) : paymentMethod === 'paypal' && finalAmount > 0 ? (
                <div className="space-y-3">
                  {!paypalClientId && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                      PayPal is enabled but the Client ID is missing.
                    </div>
                  )}
                  <div id="paypal-buttons" className="min-h-[120px]" />
                  {paypalClientId && !isPayPalReady && (
                    <div className="text-center text-sm text-zinc-500">Loading PayPal...</div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleProceed}
                  disabled={isProcessing}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-4 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Proceed to Payment <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
