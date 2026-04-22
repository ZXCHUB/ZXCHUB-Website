import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { ArrowRight, BadgeCheck, Code2, KeyRound, Radio, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import BrandName from '../components/BrandName';

export default function Storefront() {
  const [products, setProducts] = useState<any[]>([]);
  const [availableKeys, setAvailableKeys] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    productsSold: 0,
    happyCustomers: 0,
    averageRating: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsSnap, reviewsSnap, statsResponse, themeSnap] = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))),
          fetch('/api/store-stats').catch(() => null),
          getDoc(doc(db, 'settings', 'theme')).catch(() => null)
        ]);

        const prods = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const sorted = prods.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
        setProducts(sorted);

        const keysSnap = await getDocs(query(collection(db, 'keys'), where('isSold', '==', false)));
        const counts: Record<string, number> = {};
        keysSnap.docs.forEach(d => {
          const data = d.data();
          counts[data.productId] = (counts[data.productId] || 0) + 1;
        });
        setAvailableKeys(counts);

        const storeStats = statsResponse?.ok ? await statsResponse.json() : null;
        const reviews = reviewsSnap.docs.map(d => d.data() as any);
        const uniqueUsers = new Set(reviews.map(review => review.userId));
        const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 5), 0);
        const avgRating = reviews.length > 0 ? Math.round(totalRating / reviews.length) : 5;

        setStats({
          productsSold: Number(storeStats?.productsSold || 0),
          happyCustomers: uniqueUsers.size,
          averageRating: avgRating
        });

        if (themeSnap?.exists()) {
          document.documentElement.dataset.zxTheme = themeSnap.data()?.themeId || 'zxchub';
        }
      } catch (fetchError) {
        console.error(fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const featuredScripts = useMemo(() => products.slice(0, 3), [products]);
  const totalStock = Object.values(availableKeys).reduce((sum, value) => sum + value, 0);

  return (
    <div className="min-h-screen overflow-hidden bg-[#050507] text-zinc-50 selection:bg-red-500/30">
      <SEO
        title="ZXCHUB | Roblox Scripts and Key Access"
        description="Premium Roblox scripts, fast updates, and secure ZXCHUB key access."
        image="/background.png"
      />
      <Navbar />

      <main>
        <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/10">
          <div className="absolute inset-0">
            <img src="/background.png" alt="" className="h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#050507_0%,rgba(5,5,7,.88)_38%,rgba(5,5,7,.42)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,7,.1)_0%,#050507_98%)]" />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.04)_0_1px,transparent_1px_78px)]" />
          </div>

          <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <div className="mb-6 inline-flex items-center gap-2 border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.9)]" />
                Status: Undetected and Working
              </div>

              <h1 className="text-6xl font-black uppercase leading-[0.82] tracking-tight text-white sm:text-7xl lg:text-8xl">
                <BrandName />
                <span className="block text-red-500 drop-shadow-[0_0_32px_rgba(239,68,68,.5)]">Scripts</span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                Roblox scripts built for fast farming, clean automation, and private key access. Browse the latest scripts or get a <BrandName className="inline" /> key in seconds.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/products"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_18px_55px_rgba(239,68,68,.25)] transition hover:bg-red-500"
                >
                  Browse Scripts <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/get-key"
                  className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 bg-white/5 px-6 py-3 text-sm font-black uppercase tracking-wide text-white backdrop-blur transition hover:border-red-400/50 hover:bg-red-500/10"
                >
                  <KeyRound className="h-4 w-4 text-red-400" /> Get Key
                </Link>
              </div>
            </div>

            <div className="mt-14 grid max-w-4xl grid-cols-1 gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-3">
              {[
                { title: 'Premium Scripts', body: 'Optimized scripts for Roblox games and fast automation.', Icon: Code2 },
                { title: 'Private Access', body: `${totalStock} keys available for instant delivery.`, Icon: ShieldCheck },
                { title: 'Fast Updates', body: 'Patches and script updates shipped as games change.', Icon: Zap }
              ].map(({ title, body, Icon }) => (
                <div key={title} className="bg-[#08080b]/90 p-6 backdrop-blur">
                  <Icon className="mb-5 h-6 w-6 text-red-400" />
                  <h2 className="text-lg font-black text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-red-400">
                <Radio className="h-4 w-4" /> Live Script Library
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Featured Scripts
              </h2>
            </div>
            <Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-300 hover:text-white">
              Open Library <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-3">
              {[1, 2, 3].map(item => <div key={item} className="aspect-[4/3] animate-pulse bg-white/5" />)}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {featuredScripts.map(script => {
                const firstVariant = script.variants?.[0];
                const stock = availableKeys[script.id] || 0;
                return (
                  <Link
                    key={script.id}
                    to={`/product/${script.slug || script.id}`}
                    className="group overflow-hidden border border-white/10 bg-[#0a0a0e] transition hover:-translate-y-1 hover:border-red-500/60 hover:shadow-[0_24px_70px_rgba(239,68,68,.14)]"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
                      {script.image && (
                        <img
                          src={script.image}
                          alt={script.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute right-3 top-3 bg-red-600/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                        Any Executor
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="line-clamp-1 text-xl font-black text-white group-hover:text-red-300">{script.title}</h3>
                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-400">{script.description || 'View script details and key plans.'}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                        <span className="font-mono text-zinc-400">{stock > 0 ? `${stock} keys` : 'Stock soon'}</span>
                        <span className="font-black text-white">{firstVariant ? `$${Number(firstVariant.price || 0).toFixed(2)}` : 'Details'}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-y border-white/10 bg-[#08080b]">
          <div className="mx-auto grid max-w-7xl gap-px bg-white/10 md:grid-cols-3">
            {[
              [`${stats.productsSold}`, 'Keys delivered'],
              [`${stats.happyCustomers}`, 'Customers with reviews'],
              [`${stats.averageRating}/5`, 'Average rating']
            ].map(([value, label]) => (
              <div key={label} className="bg-[#08080b] px-4 py-12 text-center">
                <div className="text-4xl font-black text-white">{value}</div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-red-400">
                <Sparkles className="h-4 w-4" /> Key Access
              </div>
              <h2 className="text-3xl font-black uppercase text-white sm:text-5xl">Choose how you get in</h2>
              <p className="mt-5 max-w-xl text-zinc-400">
                Generate a free ad key, buy with Robux, pay by card or PayPal, or use FunPay for RU cards. Every paid web purchase keeps the existing instant key delivery system.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2">
              {[
                ['Free Key', 'Generate through the ad gateway', '/get-key?method=free'],
                ['Robux', 'Open the Roblox key game', '/get-key?method=robux'],
                ['PayPal', 'Buy a paid plan securely', '/get-key?method=paypal'],
                ['Bank Card', 'Checkout through Stripe', '/get-key?method=card']
              ].map(([title, body, href]) => (
                <Link key={title} to={href} className="group bg-[#0a0a0e] p-6 transition hover:bg-red-500/10">
                  <BadgeCheck className="mb-5 h-5 w-5 text-red-400" />
                  <div className="text-lg font-black text-white">{title}</div>
                  <div className="mt-2 text-sm text-zinc-400">{body}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-white">
            <img src="/logo.png" alt="ZXCHUB" className="h-8 w-8 object-contain" />
            <BrandName />
          </Link>
          <div className="flex gap-5">
            <Link to="/products" className="hover:text-white">Scripts</Link>
            <Link to="/get-key" className="hover:text-white">Get Key</Link>
            <a href="https://discord.gg/zxchub" target="_blank" rel="noreferrer" className="hover:text-white">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
