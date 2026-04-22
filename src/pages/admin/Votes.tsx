import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { BarChart3, CheckCircle2, Clock, Copy, ExternalLink, Link as LinkIcon, Plus, Save, Trophy, Vote, X } from 'lucide-react';
import { db } from '../../firebase';
import SEO from '../../components/SEO';
import ImageCropper from '../../components/ImageCropper';
import { useAuth } from '../../AuthContext';
import { logActivity } from '../../utils/activityLog';

type PollOptionDraft = {
  id: string;
  title: string;
  description: string;
  image: string;
  gameLink: string;
};

const makeSlug = (value: string) => (
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 70)
);

const makeOption = (): PollOptionDraft => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  image: '',
  gameLink: ''
});

const formatDate = (value?: number) => value ? new Date(value).toLocaleString() : '-';

export default function AdminVotes() {
  const { user, profile } = useAuth();
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Which script should ZXCHUB build next?');
  const [slug, setSlug] = useState('next-script-vote');
  const [durationHours, setDurationHours] = useState(48);
  const [options, setOptions] = useState<PollOptionDraft[]>([makeOption(), makeOption()]);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'polls'), orderBy('createdAt', 'desc')));
        setPolls(snap.docs.map(item => ({ id: item.id, ...item.data() })));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, []);

  const activePoll = useMemo(() => polls.find(poll => poll.status === 'active' && Number(poll.endsAt || 0) > Date.now()), [polls]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateOption = (id: string, patch: Partial<PollOptionDraft>) => {
    setOptions(current => current.map(option => option.id === id ? { ...option, ...patch } : option));
  };

  const addOption = () => {
    if (options.length >= 5) {
      showToast('You can add up to 5 options.', 'error');
      return;
    }
    setOptions(current => [...current, makeOption()]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      showToast('Voting needs at least 2 options.', 'error');
      return;
    }
    setOptions(current => current.filter(option => option.id !== id));
  };

  const resetForm = () => {
    setTitle('Which script should ZXCHUB build next?');
    setSlug('next-script-vote');
    setDurationHours(48);
    setOptions([makeOption(), makeOption()]);
  };

  const createPoll = async () => {
    const cleanTitle = title.trim();
    const cleanSlug = makeSlug(slug || title);
    const cleanOptions = options.map(option => ({
      ...option,
      title: option.title.trim(),
      description: option.description.trim(),
      gameLink: option.gameLink.trim()
    }));

    if (cleanTitle.length < 8) return showToast('Voting title is too short.', 'error');
    if (!cleanSlug) return showToast('Slug is required.', 'error');
    if (!Number.isFinite(durationHours) || durationHours < 1) return showToast('Duration must be at least 1 hour.', 'error');
    if (cleanOptions.length < 2 || cleanOptions.length > 5) return showToast('Add 2 to 5 options.', 'error');
    if (cleanOptions.some(option => option.title.length < 3 || option.description.length < 10 || !option.image || !option.gameLink)) {
      return showToast('Each option needs title, description, image, and game link.', 'error');
    }

    const voteCounts = cleanOptions.reduce<Record<string, number>>((acc, option) => {
      acc[option.id] = 0;
      return acc;
    }, {});
    const createdAt = Date.now();
    const pollData = {
      title: cleanTitle,
      slug: cleanSlug,
      status: 'active',
      options: cleanOptions,
      voteCounts,
      totalVotes: 0,
      durationHours,
      createdAt,
      updatedAt: createdAt,
      endsAt: createdAt + durationHours * 60 * 60 * 1000,
      createdBy: user?.uid || '',
      createdByName: profile?.displayName || user?.email || 'Admin'
    };

    setSaving(true);
    try {
      await setDoc(doc(db, 'polls', cleanSlug), pollData);
      setPolls(current => [{ id: cleanSlug, ...pollData }, ...current.filter(poll => poll.id !== cleanSlug)]);
      await logActivity(profile ? { ...profile, uid: user?.uid } : { uid: user?.uid }, {
        action: 'vote_create',
        targetType: 'system',
        targetId: cleanSlug,
        targetTitle: cleanTitle,
        details: `Created vote with ${cleanOptions.length} options`
      });
      resetForm();
      showToast('Voting created.');
    } catch (error) {
      console.error(error);
      showToast('Failed to create voting.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const closePoll = async (poll: any) => {
    try {
      await updateDoc(doc(db, 'polls', poll.id), { status: 'closed', closedAt: Date.now(), updatedAt: Date.now() });
      setPolls(current => current.map(item => item.id === poll.id ? { ...item, status: 'closed', closedAt: Date.now() } : item));
      showToast('Voting closed.');
    } catch (error) {
      console.error(error);
      showToast('Failed to close voting.', 'error');
    }
  };

  const copyLink = async (poll: any) => {
    const url = `${window.location.origin}/vote/${poll.slug || poll.id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(poll.id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="mx-auto max-w-6xl text-white">
      <SEO title="Votes | ZXCHUB Admin" description="Create hidden ZXCHUB voting pages." />
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 font-medium text-white shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-300">
            <Vote className="h-3.5 w-3.5" /> Hidden Voting
          </div>
          <h1 className="text-3xl font-black">Votes</h1>
          <p className="mt-1 text-sm text-zinc-400">Create private voting links for the next ZXCHUB script. They are not shown in the navbar.</p>
        </div>
        {activePoll && (
          <a href={`/vote/${activePoll.slug || activePoll.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-red-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white hover:bg-red-500">
            Open Active Vote <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <section className="mb-8 border border-white/10 bg-[#08080b] p-6">
        <h2 className="mb-5 text-xl font-black">Create Voting</h2>
        <div className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px_180px]">
            <label>
              <span className="mb-2 block text-sm font-black text-zinc-200">Voting Title</span>
              <input value={title} onChange={event => { setTitle(event.target.value); setSlug(makeSlug(event.target.value)); }} className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-zinc-200">Hidden Link Slug</span>
              <input value={slug} onChange={event => setSlug(makeSlug(event.target.value))} className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-zinc-200">Ends In Hours</span>
              <input type="number" min={1} value={durationHours} onChange={event => setDurationHours(Number(event.target.value))} className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500" />
            </label>
          </div>

          <div className="space-y-5">
            {options.map((option, index) => (
              <div key={option.id} className="border border-white/10 bg-black/40 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-black">Option {index + 1}</h3>
                  <button onClick={() => removeOption(option.id)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-zinc-400 hover:bg-white/5 hover:text-white">
                    <X className="h-4 w-4" /> Remove
                  </button>
                </div>

                <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                  <div>
                    <p className="mb-2 text-sm font-black text-zinc-200">Game Image</p>
                    <ImageCropper currentImage={option.image} onImageCropped={image => updateOption(option.id, { image })} aspectRatio={16 / 9} />
                  </div>

                  <div className="grid gap-4">
                    <label>
                      <span className="mb-2 block text-sm font-black text-zinc-200">Script / Game Name</span>
                      <input value={option.title} onChange={event => updateOption(option.id, { title: event.target.value })} placeholder="e.g., Bloxburg Auto Farm" className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500" />
                    </label>
                    <label>
                      <span className="mb-2 block text-sm font-black text-zinc-200">Roblox Game Link</span>
                      <input value={option.gameLink} onChange={event => updateOption(option.id, { gameLink: event.target.value })} placeholder="https://www.roblox.com/games/..." className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500" />
                    </label>
                    <label>
                      <span className="mb-2 block text-sm font-black text-zinc-200">Description</span>
                      <textarea value={option.description} onChange={event => updateOption(option.id, { description: event.target.value })} placeholder="Explain what this script would include..." className="min-h-28 w-full resize-y border border-white/10 bg-black p-4 text-white outline-none focus:border-red-500" />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={addOption} className="inline-flex items-center gap-2 border border-white/10 px-4 py-3 text-sm font-black text-zinc-300 hover:bg-white/5">
              <Plus className="h-4 w-4" /> Add Option ({options.length}/5)
            </button>
            <button onClick={createPoll} disabled={saving} className="inline-flex min-w-56 items-center justify-center gap-2 bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-500 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Creating...' : 'Create Voting'}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Voting Results</h2>
          <span className="text-sm font-bold text-zinc-500">{polls.length} total</span>
        </div>

        {loading ? (
          <div className="h-40 animate-pulse border border-white/10 bg-white/5" />
        ) : polls.length === 0 ? (
          <div className="border border-dashed border-white/10 bg-black/30 p-10 text-center text-zinc-500">
            <Vote className="mx-auto mb-3 h-8 w-8" />
            No voting pages yet.
          </div>
        ) : polls.map(poll => <PollResult key={poll.id} poll={poll} copied={copiedId === poll.id} onCopy={() => copyLink(poll)} onClose={() => closePoll(poll)} />)}
      </section>
    </div>
  );
}

function PollResult({ poll, copied, onCopy, onClose }: { poll: any; copied: boolean; onCopy: () => void; onClose: () => void }) {
  const total = Number(poll.totalVotes || 0);
  const winner = poll.options?.reduce((best: any, option: any) => {
    const bestVotes = Number(poll.voteCounts?.[best.id] || 0);
    const optionVotes = Number(poll.voteCounts?.[option.id] || 0);
    return optionVotes > bestVotes ? option : best;
  }, poll.options?.[0]);
  const isActive = poll.status === 'active' && Number(poll.endsAt || 0) > Date.now();

  return (
    <div className="border border-white/10 bg-[#08080b] p-5">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-black">{poll.title}</h3>
            <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wide ${isActive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-zinc-400/10 text-zinc-400'}`}>
              {isActive ? 'Active' : 'Closed'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Ends {formatDate(poll.endsAt)}</span>
            <span>{total} votes</span>
            {winner && <span className="inline-flex items-center gap-1 text-red-300"><Trophy className="h-3.5 w-3.5" /> {winner.title}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={onCopy} className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5">
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <a href={`/vote/${poll.slug || poll.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5">
            <LinkIcon className="h-4 w-4" /> Open
          </a>
          {isActive && (
            <button onClick={onClose} className="inline-flex items-center gap-2 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20">
              Close
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {poll.options?.map((option: any) => {
          const votes = Number(poll.voteCounts?.[option.id] || 0);
          const percent = total ? Math.round((votes / total) * 100) : 0;
          return (
            <div key={option.id} className="grid gap-3 border border-white/10 bg-black/40 p-3 sm:grid-cols-[96px_1fr]">
              {option.image && <img src={option.image} alt={option.title} className="aspect-[16/9] w-full object-cover" />}
              <div>
                <div className="flex items-center justify-between gap-4">
                  <p className="font-black text-white">{option.title}</p>
                  <p className="text-sm font-black text-zinc-300">{votes} votes</p>
                </div>
                <div className="mt-2 h-2 bg-white/10">
                  <div className="h-full bg-red-500" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span className="line-clamp-1">{option.description}</span>
                  <span className="font-bold">{percent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
        <BarChart3 className="h-4 w-4" /> Results update after users vote
      </div>
    </div>
  );
}
