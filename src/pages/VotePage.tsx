import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc, increment, onSnapshot, runTransaction } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, Lock, Trophy, Vote } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import BrandName from '../components/BrandName';

type PollOption = {
  id: string;
  title: string;
  description: string;
  image: string;
  gameLink: string;
};

type Poll = {
  id: string;
  title: string;
  slug: string;
  status: 'active' | 'closed';
  endsAt: number;
  createdAt: number;
  options: PollOption[];
  voteCounts?: Record<string, number>;
  totalVotes?: number;
};

function formatTimeLeft(endsAt: number) {
  const diff = Math.max(0, endsAt - Date.now());
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours <= 0 && minutes <= 0) return 'Ended';
  if (hours <= 0) return `${minutes}m left`;
  return `${hours}h ${minutes}m left`;
}

function getPercent(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

export default function VotePage() {
  const { slug = '' } = useParams();
  const { user, profile, login, loading: authLoading } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [ownVote, setOwnVote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const pollRef = doc(db, 'polls', slug);
    const unsubscribe = onSnapshot(
      pollRef,
      snap => {
        setPoll(snap.exists() ? ({ id: snap.id, ...snap.data() } as Poll) : null);
        setLoading(false);
      },
      err => {
        console.error(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [slug]);

  useEffect(() => {
    if (!slug || !user) {
      setOwnVote(null);
      return;
    }

    const voteRef = doc(db, 'polls', slug, 'votes', user.uid);
    const unsubscribe = onSnapshot(voteRef, snap => {
      setOwnVote(snap.exists() ? snap.data() : null);
    });
    return unsubscribe;
  }, [slug, user]);

  const isActive = Boolean(poll && poll.status === 'active' && Number(poll.endsAt || 0) > Date.now());
  const totalVotes = Number(poll?.totalVotes || 0);
  const winningOption = useMemo(() => {
    if (!poll?.options?.length) return null;
    return poll.options.reduce((best, option) => {
      const bestVotes = Number(poll.voteCounts?.[best.id] || 0);
      const optionVotes = Number(poll.voteCounts?.[option.id] || 0);
      return optionVotes > bestVotes ? option : best;
    }, poll.options[0]);
  }, [poll]);

  const submitVote = async () => {
    setError('');

    if (!user) {
      try {
        await login();
      } catch (loginError: any) {
        setError(loginError.message || 'Sign in failed.');
      }
      return;
    }

    if (!poll || !selectedOption) return;

    setSubmitting(true);
    try {
      const pollRef = doc(db, 'polls', poll.id);
      const voteRef = doc(db, 'polls', poll.id, 'votes', user.uid);

      await runTransaction(db, async transaction => {
        const [pollSnap, voteSnap] = await Promise.all([
          transaction.get(pollRef),
          transaction.get(voteRef)
        ]);

        if (!pollSnap.exists()) throw new Error('Voting is not available.');
        const latestPoll = pollSnap.data() as Poll;
        if (latestPoll.status !== 'active' || Number(latestPoll.endsAt || 0) <= Date.now()) {
          throw new Error('Voting is closed.');
        }
        if (voteSnap.exists()) throw new Error('You already voted.');

        const optionExists = latestPoll.options?.some(option => option.id === selectedOption);
        if (!optionExists) throw new Error('Select a valid option.');

        transaction.set(voteRef, {
          userId: user.uid,
          userName: profile?.displayName || user.email || 'User',
          userPhoto: profile?.photoURL || '',
          optionId: selectedOption,
          createdAt: Date.now()
        });

        transaction.update(pollRef, {
          [`voteCounts.${selectedOption}`]: increment(1),
          totalVotes: increment(1),
          lastVoteAt: Date.now()
        });
      });
    } catch (voteError: any) {
      setError(voteError.message || 'Failed to submit vote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <SEO title="Vote | ZXCHUB" description="Vote for the next ZXCHUB script." />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to ZXCHUB
        </Link>

        {loading || authLoading ? (
          <div className="min-h-[55vh] animate-pulse border border-white/10 bg-white/5" />
        ) : !poll ? (
          <ClosedState title="Voting is not available" copy="This voting link does not exist or is no longer available." />
        ) : !isActive ? (
          <ClosedState
            title="Voting is closed"
            copy="There is no active voting needed right now. Check Discord for the next community vote."
            poll={poll}
            winningOption={winningOption}
          />
        ) : (
          <>
            <section className="mb-8 grid gap-8 border border-white/10 bg-[#08080b] p-6 sm:p-8 lg:grid-cols-[1fr_340px]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-red-300">
                  <Vote className="h-4 w-4" /> Community Vote
                </div>
                <h1 className="max-w-4xl text-4xl font-black uppercase leading-tight tracking-tight sm:text-6xl">
                  {poll.title}
                </h1>
                <p className="mt-5 max-w-2xl text-zinc-400">
                  Vote for what <BrandName className="inline" /> should build next. One account can vote one time.
                </p>
              </div>

              <div className="border border-white/10 bg-black/40 p-5">
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-400" /> Ends in
                  </span>
                  <span className="font-black text-white">{formatTimeLeft(poll.endsAt)}</span>
                </div>
                <div className="my-5 h-px bg-white/10" />
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span>Total votes</span>
                  <span className="font-black text-white">{totalVotes}</span>
                </div>
                {ownVote && (
                  <div className="mt-5 border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-200">
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    Your vote has been submitted.
                  </div>
                )}
              </div>
            </section>

            {error && <div className="mb-6 border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

            <section className="grid gap-5 lg:grid-cols-2">
              {poll.options.map(option => {
                const votes = Number(poll.voteCounts?.[option.id] || 0);
                const percent = getPercent(votes, totalVotes);
                const selected = selectedOption === option.id;
                const votedForThis = ownVote?.optionId === option.id;
                const showResults = Boolean(ownVote);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !ownVote && setSelectedOption(option.id)}
                    disabled={Boolean(ownVote)}
                    className={`group overflow-hidden border text-left transition duration-300 ${
                      selected || votedForThis
                        ? 'border-red-500 bg-red-500/10 shadow-[0_24px_70px_rgba(239,68,68,.14)]'
                        : 'border-white/10 bg-[#08080b] hover:-translate-y-1 hover:border-white/30'
                    }`}
                  >
                    <div className="grid sm:grid-cols-[220px_1fr]">
                      <div className="relative aspect-[16/9] min-h-full overflow-hidden bg-black sm:aspect-auto">
                        {option.image ? (
                          <img src={option.image} alt={option.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full min-h-44 items-center justify-center text-zinc-700">
                            <Trophy className="h-10 w-10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-2xl font-black text-white">{option.title}</h2>
                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">{option.description}</p>
                          </div>
                          {(selected || votedForThis) && <CheckCircle2 className="h-6 w-6 shrink-0 text-red-400" />}
                        </div>

                        {option.gameLink && (
                          <a
                            href={option.gameLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={event => event.stopPropagation()}
                            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-300 hover:text-red-200"
                          >
                            Game Link <ExternalLink className="h-4 w-4" />
                          </a>
                        )}

                        {showResults && (
                          <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-zinc-500">
                              <span>{votes} votes</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="h-2 bg-white/10">
                              <div className="h-full bg-red-500 transition-all" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={submitVote}
                disabled={submitting || Boolean(ownVote) || (!user && authLoading) || (!ownVote && user && !selectedOption)}
                className="inline-flex min-h-13 items-center justify-center gap-2 bg-red-600 px-8 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ownVote ? 'Vote Submitted' : !user ? 'Sign In To Vote' : submitting ? 'Submitting...' : 'Submit Vote'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ClosedState({ title, copy, poll, winningOption }: { title: string; copy: string; poll?: Poll; winningOption?: PollOption | null }) {
  const totalVotes = Number(poll?.totalVotes || 0);
  const winnerVotes = winningOption ? Number(poll?.voteCounts?.[winningOption.id] || 0) : 0;

  return (
    <section className="grid min-h-[55vh] gap-8 border border-white/10 bg-[#08080b] p-6 sm:p-10 lg:grid-cols-[1fr_360px] lg:items-center">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 border border-white/10 bg-black px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
          <Lock className="h-4 w-4" /> Closed
        </div>
        <h1 className="max-w-3xl text-4xl font-black uppercase leading-tight tracking-tight sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-xl text-zinc-400">{copy}</p>
      </div>

      {poll && winningOption && (
        <div className="border border-red-500/20 bg-red-500/10 p-5">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-red-300">
            <Trophy className="h-4 w-4" /> Result
          </div>
          {winningOption.image && <img src={winningOption.image} alt={winningOption.title} className="mb-4 aspect-[16/9] w-full object-cover" />}
          <h2 className="text-2xl font-black">{winningOption.title}</h2>
          <p className="mt-2 text-sm text-zinc-400">{winnerVotes} of {totalVotes} votes</p>
        </div>
      )}
    </section>
  );
}
