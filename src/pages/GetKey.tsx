import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, ExternalLink, Gamepad2, KeyRound, Play, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import { PAID_WEB_KEY_PLANS, ZXCHUB_KEY_PLANS } from '../keyPlans';
import BrandName from '../components/BrandName';
import { useAuth } from '../AuthContext';

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
  funpay: 'https://funpay.com/users/1862044/',
  discord: 'https://discord.gg/zxchub'
};

const methodDescriptions: Record<Method, string> = {
  free: 'Generate a temporary key through the ad gateway.',
  robux: 'Buy inside the Roblox experience.',
  paypal: 'Fast checkout with PayPal balance or card.',
  card: 'Secure Stripe checkout for card and wallet payments.',
  funpay: 'Pay through the RU FunPay shop.'
};

function DiscordLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 127.14 96.36" aria-hidden="true" className={className} fill="currentColor">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0 105.89 105.89 0 0 0 19.39 8.09C2.79 32.65-1.71 56.6.54 80.21A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.35 2.66-2.06a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.4 2.66 2.06a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69c-6.29 0-11.46-5.77-11.46-12.85S36.05 40 42.45 40s11.57 5.82 11.46 12.84-5.08 12.85-11.46 12.85Zm42.24 0c-6.29 0-11.46-5.77-11.46-12.85S78.29 40 84.69 40s11.57 5.82 11.46 12.84-5.07 12.85-11.46 12.85Z" />
    </svg>
  );
}

export default function GetKey() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, login, linkDiscord } = useAuth();
  const requestedMethod = params.get('method') as Method | null;
  const [activeMethod, setActiveMethod] = useState<Method>(requestedMethod || 'free');
  const [selectedPlanId, setSelectedPlanId] = useState(ZXCHUB_KEY_PLANS[1].id);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (requestedMethod && methods.some(method => method.id === requestedMethod)) {
      setActiveMethod(requestedMethod);
    }
  }, [requestedMethod]);

  const updateMethod = (method: Method) => {
    setActiveMethod(method);
    setParams({ method });
  };

  const selectedPlan = PAID_WEB_KEY_PLANS.find(plan => plan.id === selectedPlanId) || PAID_WEB_KEY_PLANS[0];
  const isPaidWebMethod = activeMethod === 'paypal' || activeMethod === 'card';
  const accent = activeMethod === 'paypal' || activeMethod === 'funpay' ? 'text-sky-400' : 'text-red-400';
  const activeMethodConfig = methods.find(method => method.id === activeMethod) || methods[0];
  const ActiveMethodIcon = activeMethodConfig.icon;

  const ensureDiscord = async () => {
    setAuthError('');
    setAuthBusy(true);
    try {
      if (!user) {
        await login();
      }
      if (!profile?.discordId) {
        await linkDiscord();
      }
      return true;
    } catch (error: any) {
      setAuthError(error.message || 'Discord authorization failed.');
      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const openExternal = async (url: string) => {
    if (await ensureDiscord()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const goToCheckout = async () => {
    if (await ensureDiscord()) {
      navigate(`/checkout/key/${selectedPlan.id}?method=${activeMethod}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <SEO title="Get Key | ZXCHUB" description="Choose a free, Robux, PayPal, card, or FunPay method to get a ZXCHUB key." />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <section className="relative mb-8 overflow-hidden border border-white/10 bg-[#08080b] p-6 shadow-[0_22px_90px_rgba(0,0,0,.35)] sm:p-9 lg:p-11">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-red-500/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_330px] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Instant key delivery
              </div>
              <h1 className="max-w-3xl text-5xl font-black uppercase leading-none tracking-tight sm:text-7xl">
                Get <BrandName /> Key
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                One key unlocks access to every supported <BrandName className="inline" /> script. Choose a payment method, authorize Discord, and receive your key after checkout.
              </p>
            </div>

            <div className="grid gap-3 border border-white/10 bg-black/35 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-red-500/15 text-red-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase">All scripts included</p>
                  <p className="text-xs text-zinc-500">No separate script purchases.</p>
                </div>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-red-500/15 text-red-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase">Fresh stock</p>
                  <p className="text-xs text-zinc-500">Each sold key is reserved once.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          {methods.map(method => {
            const Icon = method.icon;
            const active = activeMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => updateMethod(method.id)}
                className={`group min-h-28 border p-4 text-left transition ${
                  active
                    ? 'border-red-500 bg-red-500/10 text-white shadow-[0_18px_60px_rgba(239,68,68,.12)]'
                    : 'border-white/10 bg-[#08080b] text-zinc-500 hover:border-white/25 hover:bg-[#101016] hover:text-white'
                }`}
              >
                <span className={`mb-4 flex h-9 w-9 items-center justify-center border transition ${active ? 'border-red-400/50 bg-red-500/15 text-red-300' : 'border-white/10 bg-black/30 text-zinc-500 group-hover:text-white'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="block text-xs font-black uppercase tracking-wide">{method.label}</span>
                <span className="mt-2 hidden text-xs leading-5 text-zinc-500 sm:block">{methodDescriptions[method.id]}</span>
              </button>
            );
          })}
        </div>

        <section className="grid overflow-hidden border border-white/10 bg-[#08080b] shadow-[0_22px_90px_rgba(0,0,0,.35)] lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-white/10 bg-black/30 p-6 lg:border-b-0 lg:border-r">
            <div className="flex h-14 w-14 items-center justify-center bg-red-500/15 text-red-300">
              <ActiveMethodIcon className="h-7 w-7" />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-red-400">Selected method</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">{activeMethodConfig.label}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{methodDescriptions[activeMethod]}</p>
            <div className="mt-8 space-y-3 text-sm text-zinc-300">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Discord authorization first
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Key access for all scripts
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Support through tickets
              </div>
            </div>
          </aside>

          <div className="p-6 sm:p-9">
          {authError && <div className="mb-6 border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{authError}</div>}
          {!profile?.discordId && (
            <div className="mb-6 flex gap-3 border border-indigo-400/20 bg-indigo-400/10 p-4 text-sm text-indigo-100">
              <DiscordLogo className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
              <p>To get a key, sign in and link Discord first. If you are not in the server, the Discord bot will add you during authorization.</p>
            </div>
          )}
          {activeMethod === 'free' && (
            <div className="py-6">
              <h2 className="text-3xl font-black uppercase tracking-wide">Free Key System</h2>
              <p className="mt-5 max-w-2xl text-zinc-400">
                Watch a few ads through the gateway and generate a temporary <BrandName className="inline" /> key.
              </p>
              <button
                type="button"
                onClick={() => openExternal(externalLinks.free)}
                disabled={authBusy}
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authBusy ? 'Authorizing...' : 'Generate Free Key'} <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )}

          {activeMethod === 'robux' && (
            <div>
              <h2 className="text-3xl font-black uppercase tracking-wide">Robux Pricing</h2>
              <div className="my-7 grid gap-3 sm:grid-cols-4">
                {ZXCHUB_KEY_PLANS.map(plan => (
                  <div key={plan.id} className="border border-white/10 bg-black/60 px-4 py-4 text-center">
                    <p className="text-xs font-black uppercase tracking-wide text-zinc-500">{plan.name}</p>
                    <p className="mt-2 font-mono text-sm text-emerald-300">{plan.robux}</p>
                  </div>
                ))}
              </div>
              <div className="border border-white/10 bg-black/40 p-6">
                <h3 className="mb-4 text-lg font-black uppercase">Instructions</h3>
                <ol className="space-y-3 text-zinc-300">
                  <li>1. Click Buy Now below.</li>
                  <li>2. Join the Roblox game and select the duration for your <BrandName className="inline" /> key.</li>
                  <li>3. After purchase, open a ticket in Discord if you need help activating your key.</li>
                </ol>
              </div>
              <button
                type="button"
                onClick={() => openExternal(externalLinks.robux)}
                disabled={authBusy}
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-emerald-600 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authBusy ? 'Authorizing...' : 'Buy Now'} <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )}

          {isPaidWebMethod && (
            <div>
              <h2 className={`text-3xl font-black uppercase tracking-[0.18em] ${accent}`}>
                {activeMethod === 'paypal' ? 'PayPal Pricing' : 'Bank Card / Google Pay / Apple Pay'}
              </h2>

              <div className="my-7 grid gap-3 sm:grid-cols-4">
                {PAID_WEB_KEY_PLANS.map(plan => {
                  const active = selectedPlan.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`border px-4 py-4 text-center transition ${
                        active ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/10 bg-black/60 text-zinc-400 hover:border-white/30'
                      }`}
                    >
                      <span className="block text-xs font-black uppercase tracking-wide">{plan.name}</span>
                      <span className="mt-2 block font-mono text-sm">${plan.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="border border-white/10 bg-black/40 p-6">
                <h3 className="mb-4 text-lg font-black uppercase">Instructions</h3>
                <ol className="space-y-3 text-zinc-300">
                  <li>1. Select the duration for your <BrandName className="inline" /> key.</li>
                  <li>2. Complete payment through {activeMethod === 'paypal' ? 'PayPal' : 'Stripe secure checkout'}.</li>
                  <li>3. After successful purchase, your <BrandName className="inline" /> key appears instantly on the order page.</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={goToCheckout}
                disabled={authBusy}
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-white px-8 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authBusy ? 'Authorizing...' : `Buy ${selectedPlan.name} Key`} <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )}

          {activeMethod === 'funpay' && (
            <div>
              <h2 className="text-3xl font-black uppercase tracking-[0.18em] text-sky-400">FunPay RU Cards</h2>
              <div className="my-7 grid gap-3 sm:grid-cols-4">
                {ZXCHUB_KEY_PLANS.map(plan => (
                  <div key={plan.id} className="border border-white/10 bg-black/60 px-4 py-4 text-center">
                    <p className="text-xs font-black uppercase tracking-wide text-zinc-500">{plan.name}</p>
                    <p className="mt-2 font-mono text-sm text-sky-300">{plan.funpay}</p>
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
              <button
                type="button"
                onClick={() => openExternal(externalLinks.funpay)}
                disabled={authBusy}
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-sky-500 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authBusy ? 'Authorizing...' : 'Buy Now'} <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )}
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-5 border border-indigo-400/20 bg-[#5865F2]/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-[#5865F2] text-white shadow-[0_18px_55px_rgba(88,101,242,.28)]">
              <DiscordLogo className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-black text-white">Need help activating your key?</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-300">
                After purchase, join our Discord server and open a ticket if you need help activating your key.
              </p>
            </div>
          </div>
          <a
            href={externalLinks.discord}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#5865F2] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#6975ff]"
          >
            <DiscordLogo className="h-4 w-4" />
            Join Server
          </a>
        </div>
      </main>
    </div>
  );
}
