import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Code2, Globe2, Image as ImageIcon, Link as LinkIcon, Lock, Plus, Save, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import ImageCropper from '../../components/ImageCropper';
import SEO from '../../components/SEO';
import { useAuth } from '../../AuthContext';
import { logActivity } from '../../utils/activityLog';

type ScriptVisibility = 'public' | 'unlisted' | 'private';

const makeSlug = (title: string) => (
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
);

const getVisibilityIcon = (visibility: ScriptVisibility) => {
  if (visibility === 'public') return Globe2;
  if (visibility === 'unlisted') return LinkIcon;
  return Lock;
};

export default function AdminScripts() {
  const { user, profile } = useAuth();
  const [scripts, setScripts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scriptToDelete, setScriptToDelete] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [gameLink, setGameLink] = useState('');
  const [image, setImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [scriptCode, setScriptCode] = useState('');
  const [visibility, setVisibility] = useState<ScriptVisibility>('public');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const publicScripts = useMemo(() => scripts.filter(script => script.slug !== 'zxchub-key'), [scripts]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchScripts = async () => {
      const snap = await getDocs(collection(db, 'products'));
      setScripts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchScripts();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setGameLink('');
    setImage('');
    setVideoUrl('');
    setDescription('');
    setIsPaid(false);
    setScriptCode('');
    setVisibility('public');
  };

  const handleEdit = (script: any) => {
    setEditingId(script.id);
    setTitle(script.title || '');
    setGameLink(script.gameLink || script.placeId || '');
    setImage(script.image || '');
    setVideoUrl(script.videoUrl || '');
    setDescription(script.description || '');
    setIsPaid(Boolean(script.isPaid));
    setScriptCode(script.scriptCode || '');
    setVisibility(script.visibility || 'public');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanScriptCode = scriptCode.trim();

    if (cleanTitle.length < 10) return showToast('Script title must be at least 10 characters.', 'error');
    if (!image) return showToast('Thumbnail is required.', 'error');
    if (cleanDescription.length < 30) return showToast('Description must be at least 30 characters.', 'error');
    if (cleanScriptCode.length < 10) return showToast('Script code must be at least 10 characters.', 'error');

    const slug = makeSlug(cleanTitle);
    const data = {
      title: cleanTitle,
      gameLink: gameLink.trim(),
      image,
      videoUrl: videoUrl.trim(),
      description: cleanDescription,
      isPaid,
      isFree: !isPaid,
      scriptCode: cleanScriptCode,
      visibility,
      slug,
      type: 'script',
      variants: [],
      customTabs: [],
      updatedAt: Date.now(),
      ...(editingId ? {} : { createdAt: Date.now(), likes: 0, commentsCount: 0 })
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), data);
        setScripts(current => current.map(script => script.id === editingId ? { ...script, ...data } : script));
        await logActivity(profile ? { ...profile, uid: user?.uid } : { uid: user?.uid }, {
          action: 'script_update',
          targetType: 'script',
          targetId: editingId,
          targetTitle: cleanTitle,
          details: `Updated script visibility to ${visibility}`
        });
        showToast('Script updated.');
      } else {
        const ref = await addDoc(collection(db, 'products'), data);
        setScripts(current => [{ id: ref.id, ...data }, ...current]);
        await logActivity(profile ? { ...profile, uid: user?.uid } : { uid: user?.uid }, {
          action: 'script_create',
          targetType: 'script',
          targetId: ref.id,
          targetTitle: cleanTitle,
          details: `Published ${visibility} script`
        });
        showToast('Script published.');
      }
      resetForm();
    } catch (error) {
      console.error(error);
      showToast('Failed to save script.', 'error');
    }
  };

  const confirmDeleteScript = async () => {
    if (!scriptToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', scriptToDelete.id));
      setScripts(current => current.filter(script => script.id !== scriptToDelete.id));
      await logActivity(profile ? { ...profile, uid: user?.uid } : { uid: user?.uid }, {
        action: 'script_delete',
        targetType: 'script',
        targetId: scriptToDelete.id,
        targetTitle: scriptToDelete.title || 'Script',
        details: 'Deleted script from library'
      });
      showToast('Script deleted.');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete script.', 'error');
    } finally {
      setScriptToDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl text-white">
      <SEO title="Scripts | ZXCHUB Admin" description="Create and manage ZXCHUB scripts." />
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 font-medium text-white shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}

      {scriptToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md border border-white/10 bg-[#101016] p-6">
            <h3 className="text-xl font-black">Delete Script?</h3>
            <p className="mt-2 text-sm text-zinc-400">Delete "{scriptToDelete.title}" from the public script library.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setScriptToDelete(null)} className="px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5">Cancel</button>
              <button onClick={confirmDeleteScript} className="bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-300">
            <Code2 className="h-3.5 w-3.5" /> Script Library
          </div>
          <h1 className="text-3xl font-black">Scripts</h1>
          <p className="mt-1 text-sm text-zinc-400">Publish scripts with code, thumbnails, visibility, likes, comments, and view tracking.</p>
        </div>
        {editingId && (
          <button onClick={resetForm} className="border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5">
            New Script
          </button>
        )}
      </div>

      <section className="mb-8 border border-white/10 bg-[#08080b] p-6">
        <h2 className="mb-5 text-xl font-black">{editingId ? 'Edit Script' : 'Add New Script'}</h2>
        <div className="grid gap-6">
          <label>
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-zinc-200">
              <Code2 className="h-4 w-4" /> Script Title <span className="text-red-500">*</span>
              <span className="font-normal text-zinc-500">(min 10 characters)</span>
            </span>
            <input value={title} onChange={event => setTitle(event.target.value.slice(0, 60))} placeholder="e.g., Auto Farm, ESP, Infinite Jump" className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500" />
            <div className="mt-2 flex justify-between text-xs font-bold text-zinc-500">
              <span>Do not include game name in title</span>
              <span>{title.length}/60</span>
            </div>
          </label>

          <label>
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-zinc-200">
              <LinkIcon className="h-4 w-4" /> Roblox Game Link or Place ID
            </span>
            <input value={gameLink} onChange={event => setGameLink(event.target.value)} placeholder="https://www.roblox.com/games/... or 123456789" className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500" />
            <div className="mt-2 text-xs font-bold text-zinc-500">Leave blank for hub/universal scripts</div>
          </label>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-zinc-200">
              <ImageIcon className="h-4 w-4" /> Upload Thumbnail <span className="text-red-500">*</span>
            </div>
            <p className="mb-3 text-xs font-bold text-zinc-500">Make it eye-catching. Image will be cropped to 16:9 aspect ratio.</p>
            <ImageCropper currentImage={image} onImageCropped={setImage} aspectRatio={16 / 9} />
          </div>

          <label>
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-zinc-200">
              <LinkIcon className="h-4 w-4" /> YouTube Video URL
            </span>
            <input
              value={videoUrl}
              onChange={event => setVideoUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
            />
            <div className="mt-2 text-xs font-bold text-zinc-500">If set, the script page uses this video instead of the thumbnail. The script library still uses the thumbnail.</div>
          </label>

          <label>
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-zinc-200">
              Description <span className="text-red-500">*</span>
              <span className="font-normal text-zinc-500">(min 30 characters)</span>
            </span>
            <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the features, how it works, and how people can use it..." className="min-h-52 w-full resize-y border border-white/10 bg-black p-4 text-white outline-none focus:border-red-500" />
          </label>

          <div>
            <div className="mb-2 text-sm font-black text-zinc-200">Script Type</div>
            <button type="button" onClick={() => setIsPaid(value => !value)} className="inline-flex items-center gap-3 text-sm font-bold">
              <span>{isPaid ? 'Paid' : 'Free'}</span>
              <span className={`flex h-6 w-12 items-center border p-1 transition ${isPaid ? 'border-red-500 bg-red-500/20' : 'border-white/20 bg-white/5'}`}>
                <span className={`h-4 w-4 bg-white transition ${isPaid ? 'translate-x-6' : ''}`} />
              </span>
            </button>
          </div>

          <label>
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-zinc-200">
              <Code2 className="h-4 w-4" /> Script Code <span className="text-red-500">*</span>
              <span className="font-normal text-zinc-500">(min 10 characters)</span>
            </span>
            <textarea value={scriptCode} onChange={event => setScriptCode(event.target.value.slice(0, 100000))} placeholder="-- Paste your script code here local player = game.Players.LocalPlayer ..." className="min-h-64 w-full resize-y border border-white/10 bg-black p-4 font-mono text-sm text-white outline-none focus:border-red-500" />
            <div className="mt-2 text-right text-xs font-black text-zinc-500">{scriptCode.length}/100000</div>
          </label>

          <div className="grid gap-3">
            {(['public', 'unlisted', 'private'] as ScriptVisibility[]).map(option => {
              const Icon = getVisibilityIcon(option);
              const active = visibility === option;
              const copy = option === 'public'
                ? 'Your script will be shown in site searches and google search engine.'
                : option === 'unlisted'
                  ? 'Your script will only be accessible with a link.'
                  : 'No one can access the script besides you, even with a link.';

              return (
                <button key={option} type="button" onClick={() => setVisibility(option)} className={`flex items-center gap-4 border p-5 text-left transition ${active ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-black hover:border-white/25'}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${active ? 'border-red-500' : 'border-white/20'}`}>
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                  </span>
                  <Icon className="h-5 w-5 text-zinc-400" />
                  <span>
                    <span className="block text-lg font-black capitalize">{option}</span>
                    <span className="mt-1 block text-sm font-semibold text-zinc-500">{copy}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3">
            <button onClick={resetForm} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-black text-zinc-300 hover:bg-white/5">
              Back
            </button>
            <button onClick={handleSave} className="inline-flex min-w-64 items-center justify-center gap-2 bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-500">
              <Save className="h-4 w-4" /> {editingId ? 'Update Script' : 'Publish Script'}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Published Scripts</h2>
          <span className="text-sm font-bold text-zinc-500">{publicScripts.length} total</span>
        </div>

        {publicScripts.map(script => {
          const Icon = getVisibilityIcon(script.visibility || 'public');
          return (
            <div key={script.id} className="flex flex-col gap-4 border border-white/10 bg-[#08080b] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {script.image && <img src={script.image} alt={script.title} className="h-20 w-32 bg-black object-cover" />}
                <div className="min-w-0">
                  <div className="truncate text-lg font-black">{script.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    <span className="inline-flex items-center gap-1"><Icon className="h-3.5 w-3.5" /> {script.visibility || 'public'}</span>
                    <span>{script.isPaid ? 'Paid' : 'Free'}</span>
                    <span>{Number(script.likes || 0)} likes</span>
                    <span>{Number(script.commentsCount || 0)} comments</span>
                    <span>{Number(script.views || 0)} views</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(script)} className="border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/5">Edit</button>
                <button onClick={() => setScriptToDelete(script)} className="bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20">
                  <Trash2 className="inline h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          );
        })}

        {publicScripts.length === 0 && (
          <div className="border border-dashed border-white/10 bg-black/30 p-10 text-center text-zinc-500">
            <Plus className="mx-auto mb-3 h-8 w-8" />
            No scripts yet.
          </div>
        )}
      </section>
    </div>
  );
}
