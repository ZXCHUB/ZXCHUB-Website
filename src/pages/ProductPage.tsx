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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Eye,
  Gamepad2,
  Link as LinkIcon,
  MessageCircle,
  Send,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Trash2
} from 'lucide-react';
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

const canModerateComments = (role?: string) => role === 'admin' || role === 'moderator';

const getScriptStats = (code?: string) => {
  const text = code || '';
  return {
    lines: text ? text.split(/\r\n|\r|\n/).length : 0,
    bytes: new Blob([text]).size
  };
};

export default function ProductPage() {
  const { slug } = useParams();
  const { user, profile, login } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState(false);
  const [shared, setShared] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState('');

  const canModerate = canModerateComments(profile?.role);

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
      setDisliked(false);
      return;
    }

    Promise.all([
      getDoc(doc(db, 'products', product.id, 'likes', user.uid)),
      getDoc(doc(db, 'products', product.id, 'dislikes', user.uid))
    ]).then(([likeSnap, dislikeSnap]) => {
      setLiked(likeSnap.exists());
      setDisliked(dislikeSnap.exists());
    }).catch(() => {
      setLiked(false);
      setDisliked(false);
    });
  }, [product?.id, user?.uid]);

  const handleScriptReaction = async (type: 'like' | 'dislike') => {
    if (!user) {
      await login();
      return;
    }
    if (!product?.id) return;

    const productRef = doc(db, 'products', product.id);
    const likeRef = doc(db, 'products', product.id, 'likes', user.uid);
    const dislikeRef = doc(db, 'products', product.id, 'dislikes', user.uid);
    const active = type === 'like' ? liked : disliked;
    const opposite = type === 'like' ? disliked : liked;

    if (active) {
      await deleteDoc(type === 'like' ? likeRef : dislikeRef);
      await updateDoc(productRef, { [type === 'like' ? 'likes' : 'dislikes']: increment(-1) });
      if (type === 'like') setLiked(false);
      else setDisliked(false);
      setProduct((current: any) => ({ ...current, [type === 'like' ? 'likes' : 'dislikes']: Math.max(0, Number(current[type === 'like' ? 'likes' : 'dislikes'] || 0) - 1) }));
      return;
    }

    await setDoc(type === 'like' ? likeRef : dislikeRef, { userId: user.uid, createdAt: Date.now() });
    if (opposite) {
      await deleteDoc(type === 'like' ? dislikeRef : likeRef);
    }
    await updateDoc(productRef, {
      [type === 'like' ? 'likes' : 'dislikes']: increment(1),
      ...(opposite ? { [type === 'like' ? 'dislikes' : 'likes']: increment(-1) } : {})
    });
    setLiked(type === 'like');
    setDisliked(type === 'dislike');
    setProduct((current: any) => ({
      ...current,
      [type === 'like' ? 'likes' : 'dislikes']: Number(current[type === 'like' ? 'likes' : 'dislikes'] || 0) + 1,
      ...(opposite ? { [type === 'like' ? 'dislikes' : 'likes']: Math.max(0, Number(current[type === 'like' ? 'dislikes' : 'likes'] || 0) - 1) } : {})
    }));
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

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.title || 'ZXCHUB Script', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    }
  };

  const downloadScript = () => {
    if (!product?.scriptCode) return;
    const blob = new Blob([product.scriptCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product.slug || product.id || 'zxchub-script'}.lua`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const scriptStats = useMemo(() => getScriptStats(product?.scriptCode), [product?.scriptCode]);
  const embedUrl = getYouTubeEmbedUrl(product?.videoUrl);

  if (loading) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Loading...</div>;
  if (!product) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Script not found</div>;
  if (product.visibility === 'private' && profile?.role !== 'admin') {
    return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Script not found</div>;
  }

  const customTabs = getCustomTabs(product);

  return (
    <div className="min-h-screen bg-[#050507] pb-20 text-white">
      <SEO
        title={`${product.title} | ZXCHUB Scripts`}
        description={product.description || `${product.title} script information for ZXCHUB.`}
        image={product.image || '/logo.png'}
      />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <Link to="/scripts" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Scripts
        </Link>

        <section className="overflow-hidden border border-white/10 bg-[#0a0607] shadow-[0_28px_90px_rgba(0,0,0,.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_1fr]">
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-4">
                {product.image ? (
                  <img src={product.image} alt="" className="h-16 w-16 shrink-0 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-16 w-16 shrink-0 bg-red-600" />
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">Script - {product.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <BrandName className="text-sm" />
                    <span className="text-zinc-600">-</span>
                    <span className="text-zinc-500">{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Published'}</span>
                    <button onClick={handleShare} className="inline-flex items-center gap-1 text-zinc-400 transition hover:text-white">
                      {shared ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                      {shared ? 'Copied' : 'Share'}
                    </button>
                  </div>
                </div>
                <div className="ml-auto hidden items-center gap-2 border border-white/10 bg-black/35 px-4 py-2 text-sm font-black text-zinc-300 sm:flex">
                  <Eye className="h-4 w-4 text-red-500" /> {Number(product.views || 0)} views
                </div>
              </div>

              <div className="overflow-hidden border border-white/10 bg-black">
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
            </div>

            <aside className="border-t border-white/10 bg-[#10090a] p-5 sm:p-7 lg:border-l lg:border-t-0">
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handleScriptReaction('like')} className={`flex h-16 items-center justify-center gap-2 border text-sm font-black transition ${liked ? 'border-red-500 bg-red-500/15 text-white' : 'border-white/10 bg-black/35 text-zinc-300 hover:border-red-500/60'}`}>
                  <ThumbsUp className="h-5 w-5" /> {Number(product.likes || 0)}
                </button>
                <button onClick={() => handleScriptReaction('dislike')} className={`flex h-16 items-center justify-center gap-2 border text-sm font-black transition ${disliked ? 'border-red-500 bg-red-500/15 text-white' : 'border-white/10 bg-black/35 text-zinc-300 hover:border-red-500/60'}`}>
                  <ThumbsDown className="h-5 w-5" /> {Number(product.dislikes || 0)}
                </button>
                <div className="flex h-16 items-center justify-center gap-2 border border-white/10 bg-black/35 text-sm font-black text-zinc-300">
                  <MessageCircle className="h-5 w-5" /> {Number(product.commentsCount || comments.length || 0)}
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                className={`mt-5 flex min-h-14 w-full items-center justify-center gap-2 text-sm font-black uppercase tracking-wide text-white transition ${copiedCode ? 'bg-emerald-600' : 'bg-red-600 hover:bg-red-500'}`}
              >
                <Copy className="h-4 w-4" /> {copiedCode ? 'Copied' : 'Copy Script'}
              </button>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                {product.gameLink ? (
                  <a href={product.gameLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
                    <Gamepad2 className="h-4 w-4" /> Play
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-zinc-600"><Gamepad2 className="h-4 w-4" /> Universal</span>
                )}
                {product.gameLink ? (
                  <a href={product.gameLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
                    <LinkIcon className="h-4 w-4" /> Game Link
                  </a>
                ) : null}
              </div>

              <Link to="/get-key" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 px-6 text-sm font-black uppercase tracking-wide text-red-200 transition hover:bg-red-600 hover:text-white">
                Get Key <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        </section>

        <section className="mt-8 border border-white/10 bg-[#0a0607] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-3xl font-black">Description</h2>
              <div className="mt-6 whitespace-pre-wrap break-words text-base leading-8 text-zinc-300">
                {product.description || <span className="text-zinc-500 italic">No description yet.</span>}
              </div>
            </div>
            <Link to="/get-key" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-red-600 px-6 text-sm font-black uppercase text-white hover:bg-red-500">
              Get Key
            </Link>
          </div>

          {customTabs.length > 0 && (
            <div className="mt-8 space-y-5 border-t border-white/10 pt-6">
              {customTabs.map((tab: any) => (
                <div key={tab.id}>
                  <h3 className="text-lg font-black">{tab.title || 'More Info'}</h3>
                  <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-400">{tab.content || 'No content yet.'}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {product.scriptCode && (
          <section className="mt-8 overflow-hidden border border-white/10 bg-[#0a0607]">
            <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-black">Script Code</h2>
                <span className="text-sm font-bold text-zinc-500">{scriptStats.lines} lines</span>
                <span className="text-zinc-700">-</span>
                <span className="text-sm font-bold text-zinc-500">{scriptStats.bytes} B</span>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopyCode} className={`inline-flex min-h-10 items-center justify-center gap-2 px-5 text-sm font-black uppercase text-white transition ${copiedCode ? 'bg-emerald-600' : 'bg-red-600 hover:bg-red-500'}`}>
                  <Copy className="h-4 w-4" /> {copiedCode ? 'Copied' : 'Copy Code'}
                </button>
                <button onClick={downloadScript} className="inline-flex min-h-10 items-center justify-center border border-white/10 px-3 text-zinc-300 hover:bg-white/5" title="Download script">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <pre className="m-4 max-h-[32rem] overflow-auto bg-[#16090a] p-5 text-sm leading-7 text-zinc-200"><code>{product.scriptCode}</code></pre>
          </section>
        )}

        <section className="mt-8 border border-white/10 bg-[#0a0607] p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-3xl font-black">Comments</h2>
            <span className="text-sm font-bold text-zinc-500">{comments.length} comments</span>
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
  busy: boolean;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onReply: () => void;
  onReact: (type: 'like' | 'dislike', replyId?: string) => void;
  onDelete: (replyId?: string) => void;
  currentUserId?: string;
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
