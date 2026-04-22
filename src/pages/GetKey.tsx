import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { CreditCard, ExternalLink, Gamepad2, KeyRound, Play, WalletCards } from 'lucide-react';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';

type Method = 'free' | 'robux' | 'paypal' | 'card' | 'funpay';

const methods: Array<{ id: Method; label: string; icon: React.ElementType }> = [
  { id: 'free', label: 'Free Key', icon: Play },
  { id: 'robux', label: 'Robux', icon: Gamepad2 },
  { id: 'paypal', label: 'PayPal', icon: WalletCards },
  { id: 'card', label: 'Bank Card', icon: CreditCard },
  { id: 'funpay', label: 'FunPay RU', icon: KeyRound }
];

const externalLinks = {
  free: 'https://jnkie.com/overview/zxchub',
  robux: 'https://www.roblox.com/games/107479861631807/ZXCHUB-KEY',
  funpay: 'https://funpay.com/users/1862044/'
};

export default function GetKey() {
  const [params, setParams] = useSearchParams();
  const requestedMethod = params.get('method') as Method | null;
  const [activeMethod, setActiveMethod] = useState<Method>(requestedMethod || 'free');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setProducts(items);
        const firstWithVariants = items.find(item => item.variants?.length);
        if (firstWithVariants) {
          setSelectedProductId(firstWithVariants.id);
          setSelectedVariantId(firstWithVariants.variants[0].id);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (requestedMethod && methods.some(method => method.id === requestedMethod)) {
      setActiveMethod(requestedMethod);
    }
  }, [requestedMethod]);

  const selectedProduct = useMemo(
    () => products.find(product => product.id === selectedProductId) || products.find(product => product.variants?.length),
    [products, selectedProductId]
  );

  const variants = selectedProduct?.variants || [];
  const selectedVariant = variants.find((variant: any) => variant.id === selectedVariantId) || variants[0];
  const checkoutPath = selectedProduct && selectedVariant ? `/checkout/${selectedProduct.id}/${selectedVariant.id}?qty=1` : '/products';

  const updateMethod = (method: Method) => {
    setActiveMethod(method);
    setParams({ method });
  };

  const isPaidWebMethod = activeMethod === 'paypal' || activeMethod === 'card';
  const accent = activeMethod === 'paypal' || activeMethod === 'funpay' ? 'text-sky-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <SEO title="Get Key | ZXCHUB" description="Choose a free, Robux, PayPal, card, or FunPay method to get ZXCHUB access." />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <section className="mb-10 text-center">
          <h1 className="text-5xl font-black uppercase tracking-tight text-red-500 sm:text-7xl">
            Get ZXCHUB Key
          </h1>
          <p className="mt-4 font-mono text-sm text-zinc-400">
            Choose your preferred method to obtain access.
          </p>
        </section>

        <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-5">
          {methods.map(method => {
            const Icon = method.icon;
            const active = activeMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => updateMethod(method.id)}
                className={`flex min-h-24 flex-col items-center justify-center gap-3 bg-[#08080b] px-3 text-xs font-black uppercase tracking-wide transition ${
                  active ? 'text-red-400 shadow-[inset_0_0_40px_rgba(239,68,68,.14)]' : 'text-zinc-500 hover:bg-[#101016] hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {method.label}
              </button>
            );
          })}
        </div>

        <section className="border border-white/10 bg-[#08080b] p-6 shadow-[0_22px_90px_rgba(0,0,0,.35)] sm:p-9">
          {activeMethod === 'free' && (
            <div className="py-10 text-center">
              <h2 className="text-3xl font-black uppercase tracking-wide">Free Key System</h2>
              <p className="mx-auto mt-5 max-w-2xl text-zinc-400">
                Watch a few ads through the gateway and generate a temporary ZXCHUB key.
              </p>
              <a
                href={externalLinks.free}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500"
              >
                Generate Free Key <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {activeMethod === 'robux' && (
            <div>
              <h2 className="text-3xl font-black uppercase tracking-wide">Robux Pricing</h2>
              <div className="my-7 grid gap-3 sm:grid-cols-4">
                {['1 Day = 50 R$', '1 Week = 200 R$', '1 Month = 680 R$', '1 Year = 5000 R$'].map(plan => (
                  <div key={plan} className="border border-white/10 bg-black px-4 py-4 text-center font-mono text-sm">
                    {plan}
                  </div>
                ))}
              </div>
              <div className="border border-white/10 bg-black/40 p-6">
                <h3 className="mb-4 text-lg font-black uppercase">Instructions</h3>
                <ol className="space-y-3 text-zinc-300">
                  <li>1. Click Buy Now below.</li>
                  <li>2. Join the Roblox game and select the duration for your key.</li>
                  <li>3. After purchase, open a Discord ticket if you need help activating the key.</li>
                </ol>
              </div>
              <a
                href={externalLinks.robux}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-emerald-600 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-500"
              >
                Buy Now <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {isPaidWebMethod && (
            <div>
              <h2 className={`text-3xl font-black uppercase tracking-[0.18em] ${accent}`}>
                {activeMethod === 'paypal' ? 'PayPal Pricing' : 'Bank Card / Google Pay / Apple Pay'}
              </h2>

              {products.length > 1 && (
                <label className="mt-7 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Script</span>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={event => {
                      const product = products.find(item => item.id === event.target.value);
                      setSelectedProductId(event.target.value);
                      setSelectedVariantId(product?.variants?.[0]?.id || '');
                    }}
                    className="h-12 w-full border border-white/10 bg-black px-4 text-white outline-none focus:border-red-500"
                  >
                    {products.filter(product => product.variants?.length).map(product => (
                      <option key={product.id} value={product.id}>{product.title}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="my-7 grid gap-3 sm:grid-cols-3">
                {variants.map((variant: any) => {
                  const active = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`border px-4 py-4 text-center font-mono text-sm transition ${
                        active ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/10 bg-black text-zinc-400 hover:border-white/30'
                      }`}
                    >
                      {variant.name} = ${Number(variant.price || 0).toFixed(2)}
                    </button>
                  );
                })}
              </div>

              <div className="border border-white/10 bg-black/40 p-6">
                <h3 className="mb-4 text-lg font-black uppercase">Instructions</h3>
                <ol className="space-y-3 text-zinc-300">
                  <li>1. Select a script and duration above.</li>
                  <li>2. Complete payment through {activeMethod === 'paypal' ? 'PayPal' : 'Stripe secure checkout'}.</li>
                  <li>3. After successful purchase, your key appears instantly in the order page and profile purchases.</li>
                </ol>
              </div>

              <Link
                to={checkoutPath}
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-white px-8 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-zinc-200"
              >
                Buy Now <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          )}

          {activeMethod === 'funpay' && (
            <div>
              <h2 className="text-3xl font-black uppercase tracking-[0.18em] text-sky-400">FunPay RU Cards</h2>
              <div className="my-7 grid gap-3 sm:grid-cols-4">
                {['1 Day = 25 ₽', '1 Week = 150 ₽', '1 Month = 500 ₽', 'Lifetime = 1155 ₽'].map(plan => (
                  <div key={plan} className="border border-white/10 bg-black px-4 py-4 text-center font-mono text-sm">
                    {plan}
                  </div>
                ))}
              </div>
              <div className="border border-white/10 bg-black/40 p-6">
                <h3 className="mb-4 text-lg font-black uppercase">Instructions</h3>
                <ol className="space-y-3 text-zinc-300">
                  <li>1. Click Buy Now to navigate to the FunPay shop.</li>
                  <li>2. Pay for the duration you need.</li>
                  <li>3. After successful purchase, you will receive your key in chat.</li>
                </ol>
              </div>
              <a
                href={externalLinks.funpay}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-sky-500 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-sky-400"
              >
                Buy Now <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </section>

        <div className="mt-10 border border-white/10 bg-[#08080b] p-6">
          <p className="text-sm font-semibold text-zinc-300">
            After purchase, join our Discord server and open a ticket if you need help activating your key.
          </p>
          <a
            href="https://discord.com/invite/rumblehub"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-black uppercase tracking-wide text-indigo-400 hover:text-indigo-300"
          >
            Join Server
          </a>
        </div>
      </main>
    </div>
  );
}
