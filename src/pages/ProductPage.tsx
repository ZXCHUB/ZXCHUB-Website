import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { ArrowLeft, Copy, ExternalLink, Eye, Heart, MessageCircle, Send, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
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

const getYouTubeEmbedUrl = (url?: string) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    const id = host === 'youtu.be'
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();

    return id ? `https://www.youtube.com/embed/${id}` : '';
  } catch {
    return '';
  }
};

const isModerator = (role?: string) => role === 'admin' || role === 'moderator' || role === 'support';

export default function ProductPage() {
  const { slug } = useParams();
  const { user, profile, login } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('description');
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState('');

  const canModerate = isModerator(profile?.role);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;

      let data = null;
      const docSnap = await getDoc(doc(db, 'products', slug));

      if (docSnap.exists()) {
        data = { id: docSnap.id, ...docSnap.data() };
      } else {
        const productQuery = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(productQuery);
        if (!snap.empty) {
          data = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      setProduct(data);
      setLoading(false);
    };
    fetchProduct();
  }, [slug]);

  const fetchComments = async (productId: string) => {
    const snap = await getDocs(query(collection(db, 'products', productId, 'comments'), orderBy('createdAt', 'desc'), limit(50)));
    const withReplies = await Promise.all(snap.docs.map(async commentDoc => {
      const repliesSnap = await getDocs(query(collection(db, 'products', productId, 'comments', commentDoc.id, 'replies'), orderBy('createdAt', 'asc'), limit(25)));
      return {
        id: commentDoc.id,
        ...commentDoc.data(),
        replies: repliesSnap.docs.map(replyDoc => ({ id: replyDoc.id, ...replyDoc.data() }))
      };
    }));
    setComments(withReplies);
  };

  useEffect(() => {
    if (!product?.id) return;

    const viewKey = `zxchub-viewed-${product.id}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1');
      updateDoc(doc(db, 'products', product.id), { views: increment(1) }).catch(() => {});
    }

    fetchComments(product.id).catch(() => setComments([]));
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

  const buildComment = (text: string) => ({
    userId: user!.uid,
    userName: profile?.displayName || user?.email || 'User',
    userPhoto: profile?.photoURL || '',
    text,
    likes: 0,
    dislikes: 0,
    repliesCount: 0,
    createdAt: Date.now()
  });

  const handleComment = async () => {
    if (!user || !profile) {
      await login();
      return;
    }
    const text = commentText.trim();
    if (!product?.id || text.length < 2) return;

    const comment = buildComment(text);
    const ref = await addDoc(collection(db, 'products', product.id, 'comments'), comment);
    await updateDoc(doc(db, 'products', product.id), { commentsCount: increment(1) });
    setComments(current => [{ id: ref.id, ...comment, replies: [] }, ...current]);
    setProduct((current: any) => ({ ...current, commentsCount: Number(current.commentsCount || 0) + 1 }));
    setCommentText('');
  };

  const handleReply = async (commentId: string) => {
    if (!user || !profile) {
      await login();
      return;
    }
    const text = (replyText[commentId] || '').trim();
    if (!product?.id || text.length < 2) return;

    const reply = buildComment(text);
    const ref = await addDoc(collection(db, 'products', product.id, 'comments', commentId, 'replies'), reply);
    await updateDoc(doc(db, 'products', product.id, 'comments', commentId), { repliesCount: increment(1) });
    setComments(current => current.map(comment => comment.id === commentId
      ? { ...comment, repliesCount: Number(comment.repliesCount || 0) + 1, replies: [...(comment.replies || []), { id: ref.id, ...reply }] }
      : comment
    ));
    setReplyText(current => ({ ...current, [commentId]: '' }));
  };

  const handleCommentReaction = async (commentId: string, type: 'like' | 'dislike', replyId?: string) => {
    if (!user) {
      await login();
      return;
    }
    if (!product?.id) return;

    setBusyCommentId(replyId || commentId);
    try {
      const targetRef = replyId
        ? doc(db, 'products', product.id, 'comments', commentId, 'replies', replyId)
        : doc(db, 'products', product.id, 'comments', commentId);
      const reactionRef = replyId
        ? doc(db, 'products', product.id, 'comments', commentId, 'replies', replyId, 'reactions', user.uid)
        : doc(db, 'products', product.id, 'comments', commentId, 'reactions', user.uid);
      const existing = await getDoc(reactionRef);
      const currentType = existing.exists() ? existing.data().type : '';
      const incrementField = type === 'like' ? 'likes' : 'dislikes';
      const decrementField = type === 'like' ? 'dislikes' : 'likes';

      if (currentType === type) {
        await deleteDoc(reactionRef);
        await updateDoc(targetRef, { [incrementField]: increment(-1) });
      } else {
        await setDoc(reactionRef, { type, userId: user.uid, createdAt: Date.now() });
        await updateDoc(targetRef, {
          [incrementField]: increment(1),
          ...(currentType ? { [decrementField]: increment(-1) } : {})
        });
      }

      await fetchComments(product.id);
    } finally {
      setBusyCommentId('');
    }
  };

  const deleteComment = async (commentId: string, replyId?: string) => {
    if (!product?.id) return;
    const targetRef = replyId
      ? doc(db, 'products', product.id, 'comments', commentId, 'replies', replyId)
      : doc(db, 'products', product.id, 'comments', commentId);
    await deleteDoc(targetRef);
    if (replyId) {
      await updateDoc(doc(db, 'products', product.id, 'comments', commentId), { repliesCount: increment(-1) });
    } else {
      await updateDoc(doc(db, 'products', product.id), { commentsCount: increment(-1) });
      setProduct((current: any) => ({ ...current, commentsCount: Math.max(0, Number(current.commentsCount || 0) - 1) }));
    }
    await fetchComments(product.id);
  };

  const handleCopyCode = async () => {
    if (product?.scriptCode) {
      await navigator.clipboard.writeText(product.scriptCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Loading...</div>;
  if (!product) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Script not found</div>;
  if (product.visibility === 'private' && profile?.role !== 'admin') {
    return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Script not found</div>;
  }

  const customTabs = getCustomTabs(product);
  const activeCustomTab = customTabs.find((tab: any) => activeTab === `custom-${tab.id}`);
  const embedUrl = getYouTubeEmbedUrl(product.videoUrl);

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
          <Link to="/scripts" className="inline-flex items-center gap-2 text-zinc-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Scripts
          </Link>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.28fr_.72fr] lg:items-start">
          <div>
            <div className="overflow-hidden border border-white/10 bg-zinc-950">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={product.title}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : product.image ? (
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
                  <div className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
                    {product.description || <span className="text-zinc-500 italic">No description yet.</span>}
                  </div>

                  {product.scriptCode && (
                    <div className="border border-white/10 bg-black">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Script Code</div>
                        <button onClick={handleCopyCode} className={`inline-flex min-w-24 items-center justify-center gap-2 px-3 py-1.5 text-xs font-black uppercase text-white transition ${copiedCode ? 'bg-emerald-600' : 'bg-red-600 hover:bg-red-500'}`}>
                          <Copy className="h-3.5 w-3.5" /> {copiedCode ? 'Copied' : 'Copy'}
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
            <p className="mt-5 text-sm leading-6 text-zinc-400">
              This script is part of the <BrandName className="inline text-sm" /> hub. Get one key and use it with all supported scripts.
            </p>

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

          <div className="space-y-4">
            {comments.map(comment => (
              <CommentBlock
                key={comment.id}
                comment={comment}
                productId={product.id}
                canDelete={canModerate || comment.userId === user?.uid}
                busy={busyCommentId === comment.id}
                replyText={replyText[comment.id] || ''}
                onReplyTextChange={value => setReplyText(current => ({ ...current, [comment.id]: value }))}
                onReply={() => handleReply(comment.id)}
                onReact={(type, replyId) => handleCommentReaction(comment.id, type, replyId)}
                onDelete={(replyId) => deleteComment(comment.id, replyId)}
                currentUserId={user?.uid}
                canModerate={canModerate}
              />
            ))}
            {comments.length === 0 && <div className="py-8 text-center text-sm text-zinc-600">No comments yet.</div>}
          </div>
        </section>
      </main>
    </div>
  );
}

function CommentBlock({
  comment,
  busy,
  replyText,
  onReplyTextChange,
  onReply,
  onReact,
  onDelete,
  currentUserId,
  canModerate
}: {
  comment: any;
  productId: string;
  busy: boolean;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onReply: () => void;
  onReact: (type: 'like' | 'dislike', replyId?: string) => void;
  onDelete: (replyId?: string) => void;
  currentUserId?: string;
  canDelete: boolean;
  canModerate: boolean;
}) {
  return (
    <div className="border border-white/10 bg-black/35 p-4">
      <CommentBody
        item={comment}
        busy={busy}
        onReact={type => onReact(type)}
        onDelete={() => onDelete()}
        canDelete={canModerate || comment.userId === currentUserId}
      />

      <div className="mt-4 space-y-3 border-l border-white/10 pl-4">
        {(comment.replies || []).map((reply: any) => (
          <CommentBody
            key={reply.id}
            item={reply}
            busy={false}
            compact
            onReact={type => onReact(type, reply.id)}
            onDelete={() => onDelete(reply.id)}
            canDelete={canModerate || reply.userId === currentUserId}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={replyText}
          onChange={event => onReplyTextChange(event.target.value)}
          placeholder="Reply..."
          className="min-h-10 flex-1 border border-white/10 bg-[#08080b] px-3 text-sm text-white outline-none focus:border-red-500"
        />
        <button onClick={onReply} className="bg-white/10 px-4 text-xs font-black uppercase text-white hover:bg-red-600">Reply</button>
      </div>
    </div>
  );
}

function CommentBody({
  item,
  compact,
  busy,
  onReact,
  onDelete,
  canDelete
}: {
  item: any;
  compact?: boolean;
  busy: boolean;
  onReact: (type: 'like' | 'dislike') => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className={compact ? 'border border-white/10 bg-[#08080b] p-3' : ''}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {item.userPhoto ? <img src={item.userPhoto} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-zinc-800" />}
          <div>
            <div className="text-sm font-black">{item.userName || 'User'}</div>
            <div className="text-xs text-zinc-600">{new Date(item.createdAt || Date.now()).toLocaleString()}</div>
          </div>
        </div>
        {canDelete && (
          <button onClick={onDelete} className="p-2 text-zinc-600 hover:text-red-400" title="Delete comment">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{item.text}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
        <button disabled={busy} onClick={() => onReact('like')} className="inline-flex items-center gap-1.5 hover:text-emerald-300 disabled:opacity-50">
          <ThumbsUp className="h-3.5 w-3.5" /> {Number(item.likes || 0)}
        </button>
        <button disabled={busy} onClick={() => onReact('dislike')} className="inline-flex items-center gap-1.5 hover:text-red-300 disabled:opacity-50">
          <ThumbsDown className="h-3.5 w-3.5" /> {Number(item.dislikes || 0)}
        </button>
      </div>
    </div>
  );
}
