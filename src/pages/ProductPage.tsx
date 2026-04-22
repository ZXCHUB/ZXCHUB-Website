import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { ArrowLeft, ExternalLink, KeyRound } from 'lucide-react';
import Markdown from 'react-markdown';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import BrandName from '../components/BrandName';

const getCustomTabs = (product: any) => (
  Array.isArray(product?.customTabs)
    ? product.customTabs
      .filter((tab: any) => tab?.title || tab?.content || tab?.images?.length)
      .slice(0, 5)
    : []
);

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;

      let data = null;
      const docSnap = await getDoc(doc(db, 'products', slug));

      if (docSnap.exists()) {
        data = { id: docSnap.id, ...docSnap.data() };
      } else {
        const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          data = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      setProduct(data);
      setLoading(false);
    };
    fetchProduct();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Loading...</div>;
  if (!product) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Script not found</div>;

  const customTabs = getCustomTabs(product);
  const activeCustomTab = customTabs.find((tab: any) => activeTab === `custom-${tab.id}`);

  return (
    <div className="min-h-screen bg-[#050507] pb-20 text-white">
      <SEO
        title={`${product.title} | ZXCHUB Scripts`}
        description={product.description || `${product.title} script information for ZXCHUB.`}
        image={product.image || '/background.png'}
      />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mb-6">
          <Link to="/products" className="inline-flex items-center gap-2 text-zinc-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Scripts
          </Link>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-start">
          <div>
            <div className="overflow-hidden border border-white/10 bg-zinc-950">
              {product.image ? (
                <img src={product.image} alt={product.title} className="aspect-video w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="aspect-video bg-zinc-900" />
              )}
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
              <button
                onClick={() => setActiveTab('description')}
                className={`shrink-0 border px-5 py-2 text-sm font-bold transition-colors ${activeTab === 'description' ? 'border-red-500 bg-red-500/10 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
              >
                Description
              </button>
              {customTabs.map((tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(`custom-${tab.id}`)}
                  className={`shrink-0 border px-5 py-2 text-sm font-bold transition-colors ${activeTab === `custom-${tab.id}` ? 'border-red-500 bg-red-500/10 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
                >
                  {tab.title || 'More Info'}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-[280px] border border-white/10 bg-[#09090d] p-5 sm:p-7">
              {activeTab === 'description' ? (
                <div className="prose prose-invert max-w-none text-sm leading-7 text-zinc-300">
                  {product.description ? <Markdown>{product.description}</Markdown> : <p className="text-zinc-500 italic">No description yet.</p>}
                </div>
              ) : activeCustomTab ? (
                <div className="relative min-h-[300px] overflow-hidden">
                  <h2 className="mb-4 text-lg font-black uppercase">{activeCustomTab.title || 'More Info'}</h2>
                  <div className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
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
                        <img src={image.url} alt="" draggable={false} className="pointer-events-none w-full select-none border border-zinc-800 object-contain shadow-2xl" />
                      </div>
                    ) : null
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <aside className="border border-white/10 bg-[#09090d] p-6">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-red-400">
              <BrandName className="text-xs" /> Script
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">{product.title}</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              This script is included with <BrandName className="inline text-sm" /> access. Scripts are not purchased separately.
            </p>

            <div className="mt-7 border border-white/10 bg-black/40 p-5">
              <div className="flex items-center gap-3 text-sm font-bold text-white">
                <KeyRound className="h-5 w-5 text-red-400" />
                Requires a <BrandName className="text-sm" /> key
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Get a key once, then use it with supported <BrandName className="inline text-sm" /> scripts.
              </p>
            </div>

            <Link
              to="/get-key"
              className="mt-6 inline-flex w-full min-h-12 items-center justify-center gap-2 bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500"
            >
              Get Key <ExternalLink className="h-4 w-4" />
            </Link>
          </aside>
        </section>
      </main>
    </div>
  );
}
