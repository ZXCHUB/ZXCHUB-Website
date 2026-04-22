import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, Copy, ExternalLink, Eye, Heart, KeyRound, MessageCircle, Send } from 'lucide-react';
import Markdown from 'react-markdown';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
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
  const { user, profile, login } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('description');
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');

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

  useEffect(() => {
    if (!product?.id) return;

    const viewKey = `zxchub-viewed-${product.id}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1');
      updateDoc(doc(db, 'products', product.id), { views: increment(1) }).catch(() => {});
    }

    getDocs(query(collection(db, 'products', product.id, 'comments'), orderBy('createdAt', 'desc'), limit(50)))
      .then(snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setComments([]));
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id || !user?.uid) {
      setLiked(false);
      return;
    }

    getDoc(doc(db, 'products', product.id, 'likes', user.uid))
      .then(snap => setLiked(snap.exists()))
      .catch(() => setLiked(false));
  }, [product?.id, user?.uid]);

  const handleLike = async () => {
    if (!user) {
      await login();
      return;
    }
    if (!product?.id) return;

    const likeRef = doc(db, 'products', product.id, 'likes', user.uid);
    const productRef = doc(db, 'products', product.id);
    if (liked) {
      await deleteDoc(likeRef);
      await updateDoc(productRef, { likes: increment(-1) });
      setLiked(false);
      setProduct((current: any) => ({ ...current, likes: Math.max(0, Number(current.likes || 0) - 1) }));
    } else {
      await setDoc(likeRef, { userId: user.uid, createdAt: Date.now() });
      await updateDoc(productRef, { likes: increment(1) });
      setLiked(true);
      setProduct((current: any) => ({ ...current, likes: Number(current.likes || 0) + 1 }));
    }
  };

  const handleComment = async () => {
    if (!user || !profile) {
      await login();
      return;
    }
    const text = commentText.trim();
    if (!product?.id || text.length < 2) return;

    const comment = {
      userId: user.uid,
      userName: profile.displayName || user.email || 'User',
      userPhoto: profile.photoURL || '',
      text,
      createdAt: Date.now()
    };
    const ref = await addDoc(collection(db, 'products', product.id, 'comments'), comment);
    await updateDoc(doc(db, 'products', product.id), { commentsCount: increment(1) });
    setComments(current => [{ id: ref.id, ...comment }, ...current]);
    setProduct((current: any) => ({ ...current, commentsCount: Number(current.commentsCount || 0) + 1 }));
    setCommentText('');
  };

  const handleCopyCode = async () => {
    if (product?.scriptCode) {
      await navigator.clipboard.writeText(product.scriptCode);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Loading...</div>;
  if (!product) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Script not found</div>;
  if (product.visibility === 'private' && profile?.role !== 'admin') {
    return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Script not found</div>;
  }

  const customTabs = getCustomTabs(product);
  const activeCustomTab = customTabs.find((tab: any) => activeTab === `custom-${tab.id}`);

  return (
    <div className="min-h-screen bg-[#050507] pb-20 text-white">
      <SEO
        title={`${product.title} | ZXCHUB Scripts`}
        description={product.description || `${product.title} script information for ZXCHUB.`}
        image={product.image || '/logo.png'}
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
                <div className="space-y-7">
                  <div className="prose prose-invert max-w-none text-sm leading-7 text-zinc-300">
                    {product.description ? <Markdown>{product.description}</Markdown> : <p className="text-zinc-500 italic">No description yet.</p>}
                  </div>

                  {product.scriptCode && (
                    <div className="border border-white/10 bg-black">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Script Code</div>
                        <button onClick={handleCopyCode} className="inline-flex items-center gap-2 bg-red-600 px-3 py-1.5 text-xs font-black uppercase text-white hover:bg-red-500">
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                      </div>
                      <pre className="max-h-96 overflow-auto p-4 text-sm leading-6 text-zinc-300"><code>{product.scriptCode}</code></pre>
                    </div>
                  )}
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
            <div className="mt-5 grid grid-cols-3 gap-px border border-white/10 bg-white/10 text-center">
              <button onClick={handleLike} className="bg-black/40 px-3 py-4 transition hover:bg-red-500/10">
                <Heart className={`mx-auto mb-2 h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : 'text-zinc-500'}`} />
                <div className="text-sm font-black">{Number(product.likes || 0)}</div>
              </button>
              <div className="bg-black/40 px-3 py-4">
                <MessageCircle className="mx-auto mb-2 h-5 w-5 text-zinc-500" />
                <div className="text-sm font-black">{Number(product.commentsCount || comments.length || 0)}</div>
              </div>
              <div className="bg-black/40 px-3 py-4">
                <Eye className="mx-auto mb-2 h-5 w-5 text-zinc-500" />
                <div className="text-sm font-black">{Number(product.views || 0)}</div>
              </div>
            </div>
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

        <section className="mt-10 border border-white/10 bg-[#09090d] p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Comments</h2>
            <span className="text-sm font-bold text-zinc-500">{comments.length}</span>
          </div>

          <div className="mb-6 flex gap-3">
            <input
              value={commentText}
              onChange={event => setCommentText(event.target.value)}
              placeholder={user ? 'Write a comment...' : 'Sign in to comment...'}
              className="min-h-12 flex-1 border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-red-500"
            />
            <button onClick={handleComment} className="inline-flex min-h-12 items-center justify-center gap-2 bg-red-600 px-5 text-sm font-black uppercase text-white hover:bg-red-500">
              <Send className="h-4 w-4" /> Send
            </button>
          </div>

          <div className="space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className="border border-white/10 bg-black/35 p-4">
                <div className="mb-2 flex items-center gap-3">
                  {comment.userPhoto ? <img src={comment.userPhoto} alt="" className="h-8 w-8 rounded-full" /> : <div className="h-8 w-8 rounded-full bg-zinc-800" />}
                  <div>
                    <div className="text-sm font-black">{comment.userName || 'User'}</div>
                    <div className="text-xs text-zinc-600">{new Date(comment.createdAt || Date.now()).toLocaleString()}</div>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{comment.text}</p>
              </div>
            ))}
            {comments.length === 0 && <div className="py-8 text-center text-sm text-zinc-600">No comments yet.</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
