import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { CalendarDays, Eye, Film, Flame, Heart, RotateCcw, Search, SlidersHorizontal, Trophy } from 'lucide-react';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import BrandName from '../components/BrandName';

type FilterMode = 'all' | 'free' | 'premium';
type SortMode = 'popular' | 'newest' | 'liked';
const NEW_SCRIPT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const isNewScript = (script: any) => {
  const createdAt = Number(script.createdAt || 0);
  return createdAt > 0 && Date.now() - createdAt < NEW_SCRIPT_WINDOW_MS;
};

const normalize = (value: string) => value.toLowerCase().trim();

const extractGameId = (value?: string) => {
  if (!value) return '';
  const match = value.match(/games\/(\d+)/i) || value.match(/^(\d+)$/);
  return match?.[1] || '';
};

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [gameQuery, setGameQuery] = useState('');
  const [mode, setMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [hasVideoOnly, setHasVideoOnly] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const scripts = useMemo(() => products.filter(product => {
    if (product.slug === 'zxchub-key') return false;
    if ((product.visibility || 'public') !== 'public') return false;
    return true;
  }), [products]);

  const stats = useMemo(() => ({
    total: scripts.length,
    newCount: scripts.filter(isNewScript).length,
    videoCount: scripts.filter(script => Boolean(script.videoUrl)).length
  }), [scripts]);

  const filteredProducts = useMemo(() => scripts
    .filter(product => {
      if (product.slug === 'zxchub-key') return false;
      if ((product.visibility || 'public') !== 'public') return false;
      const searchText = normalize(`${product.title || ''} ${product.description || ''} ${product.gameLink || ''}`);
      if (keyword && !searchText.includes(normalize(keyword))) return false;

      if (gameQuery) {
        const wanted = normalize(gameQuery);
        const wantedGameId = extractGameId(wanted);
        const productGameLink = normalize(product.gameLink || product.placeId || '');
        const productGameId = extractGameId(productGameLink);
        const matchesGameId = wantedGameId && productGameId && wantedGameId === productGameId;
        if (!matchesGameId && !productGameLink.includes(wanted)) return false;
      }

      if (hasVideoOnly && !product.videoUrl) return false;

      if (mode === 'free') return !product.isPaid;
      if (mode === 'premium') return Boolean(product.isPaid);
      return true;
    })
    .sort((a, b) => {
      const aNew = isNewScript(a);
      const bNew = isNewScript(b);
      if (aNew !== bNew) return aNew ? -1 : 1;
      if (aNew && bNew) return Number(b.createdAt || 0) - Number(a.createdAt || 0);

      if (sortMode === 'newest') return Number(b.createdAt || 0) - Number(a.createdAt || 0);
      if (sortMode === 'liked') return Number(b.likes || 0) - Number(a.likes || 0);
      return Number(b.views || 0) - Number(a.views || 0);
    }), [scripts, keyword, gameQuery, hasVideoOnly, mode, sortMode]);

  const hasActiveFilters = Boolean(keyword || gameQuery || hasVideoOnly || mode !== 'all' || sortMode !== 'popular');

  const resetFilters = () => {
    setKeyword('');
    setGameQuery('');
    setMode('all');
    setSortMode('popular');
    setHasVideoOnly(false);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <SEO title="Scripts | ZXCHUB" description="Browse ZXCHUB Roblox scripts and choose your key plan." />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <section className="relative mb-12 overflow-hidden border border-white/10 bg-[#09090d] p-6 sm:p-10">
          <div className="absolute inset-0 opacity-40">
            <div className="h-full w-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.06)_0_1px,transparent_1px_64px),repeating-linear-gradient(0deg,rgba(255,255,255,.04)_0_1px,transparent_1px_64px)]" />
          </div>
          <div className="relative">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-red-400">
              <SlidersHorizontal className="h-4 w-4" /> Script Library
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
              Our <span className="text-red-500">Scripts</span>
            </h1>
            <p className="mt-4 max-w-2xl text-zinc-400">
              Browse high-performance Roblox scripts developed for <BrandName className="inline" />. Scripts are listed here for discovery, while one ZXCHUB key unlocks access.
            </p>
          </div>
        </section>

        <div className="mb-8 border border-white/10 bg-[#08080b] p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by script name, feature, or description..."
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                className="h-14 w-full border border-white/10 bg-black pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/70"
              />
            </label>

            <label className="relative block">
              <Trophy className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Game link or Place ID"
                value={gameQuery}
                onChange={event => setGameQuery(event.target.value)}
                className="h-14 w-full border border-white/10 bg-black pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/70"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[auto_auto_1fr_auto]">
            <div className="grid grid-cols-3 overflow-hidden border border-white/10 bg-black">
              {[
                ['all', 'All'],
                ['free', 'Free'],
                ['premium', 'Premium']
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setMode(value as FilterMode)}
                  className={`h-12 min-w-24 px-4 text-xs font-black uppercase tracking-wide transition ${
                    mode === value ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 overflow-hidden border border-white/10 bg-black">
              {[
                ['popular', 'Popular', Flame],
                ['newest', 'New', CalendarDays],
                ['liked', 'Liked', Heart]
              ].map(([value, label, Icon]) => {
                const SortIcon = Icon as React.ElementType;
                return (
                  <button
                    key={value as string}
                    onClick={() => setSortMode(value as SortMode)}
                    className={`flex h-12 min-w-24 items-center justify-center gap-2 px-4 text-xs font-black uppercase tracking-wide transition ${
                      sortMode === value ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <SortIcon className="h-4 w-4" />
                    {label as string}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setHasVideoOnly(value => !value)}
                className={`inline-flex h-12 items-center gap-2 border px-4 text-xs font-black uppercase tracking-wide transition ${
                  hasVideoOnly
                    ? 'border-red-500 bg-red-500/10 text-red-300'
                    : 'border-white/10 bg-black text-zinc-400 hover:border-white/25 hover:text-white'
                }`}
              >
                <Film className="h-4 w-4" />
                Has Video
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-12 items-center gap-2 border border-white/10 bg-black px-4 text-xs font-black uppercase tracking-wide text-zinc-400 transition hover:border-white/25 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center justify-start border border-white/10 bg-black px-4 text-sm font-bold text-zinc-400 xl:justify-end">
              <span className="text-white">{filteredProducts.length}</span>
              <span className="mx-1">/</span>
              <span>{stats.total}</span>
              <span className="ml-2">scripts</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="border border-white/10 bg-black px-3 py-2 text-zinc-500">{stats.newCount} new scripts</span>
            <span className="border border-white/10 bg-black px-3 py-2 text-zinc-500">{stats.videoCount} with video</span>
            <span className="border border-white/10 bg-black px-3 py-2 text-zinc-500">New scripts stay pinned for 3 days</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(item => (
              <div key={item} className="aspect-[4/3] animate-pulse border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="border border-white/10 bg-[#09090d] py-20 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
            <h2 className="text-xl font-black text-zinc-300">No scripts found</h2>
            <p className="mt-2 text-zinc-500">Try another search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map(script => {
              const likes = Number(script.likes || 0);
              const views = Number(script.views || 0);
              const isNew = isNewScript(script);

              return (
                <Link
                  to={`/script/${script.slug || script.id}`}
                  key={script.id}
                  className="group flex flex-col overflow-hidden border border-white/10 bg-[#09090d] transition duration-300 hover:-translate-y-1 hover:border-red-500/70 hover:shadow-[0_28px_70px_rgba(239,68,68,.16)]"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-zinc-950">
                    {script.image && (
                      <img
                        src={script.image}
                        alt={script.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    {isNew ? (
                      <div className="absolute right-3 top-3 bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-[0_0_22px_rgba(239,68,68,.55)]">
                        New
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="line-clamp-1 text-xl font-black text-white group-hover:text-red-300">{script.title}</h2>
                    <p className="mt-2 line-clamp-3 min-h-[4.5rem] whitespace-pre-line text-sm leading-6 text-zinc-400">
                      {script.description || 'ZXCHUB script with details, code, and comments.'}
                    </p>

                    <div className="mt-5 flex items-center gap-5 border-t border-white/10 pt-4 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" /> {likes}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="h-4 w-4" /> {views}
                      </span>
                      <BrandName className="ml-auto text-xs" />
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-600">Script Details</div>
                      <span className="bg-red-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white transition group-hover:bg-red-500">
                        View Details
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
