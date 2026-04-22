import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, ExternalLink, Gamepad2, KeyRound, Play, WalletCards } from 'lucide-react';
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
        <section className="mb-10 text-center">
          <h1 className="text-5xl font-black uppercase tracking-tight text-red-500 sm:text-7xl">
            Get <BrandName /> Key
          </h1>
          <p className="mt-4 font-mono text-sm text-zinc-400">
            Choose your preferred method to obtain <BrandName className="inline" /> access.
          </p>
        </section>

        <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-5">
          {methods.map(method => {
            const Icon = method.icon;
            const active = activeMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => updateMethod(method.id)}
                className={`flex min-h-24 flex-col items-center justify-center gap-3 bg-[#08080b] px-3 text-xs font-black uppercase tracking-wide transition ${
                  active ? 'text-red-400 shadow-[inset_0_0_40px_rgba(239,68,68,.14)]' : 'text-zinc-500 hover:bg-[#101016] hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {method.label}
              </button>
            );
          })}
        </div>

        <section className="border border-white/10 bg-[#08080b] p-6 shadow-[0_22px_90px_rgba(0,0,0,.35)] sm:p-9">
          {authError && <div className="mb-6 border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{authError}</div>}
          {!profile?.discordId && (
            <div className="mb-6 border border-white/10 bg-black/40 p-4 text-sm text-zinc-300">
              To get a key, sign in and link Discord first. If you are not in the server, the Discord bot will add you during authorization.
            </div>
          )}
          {activeMethod === 'free' && (
            <div className="py-10 text-center">
              <h2 className="text-3xl font-black uppercase tracking-wide">Free Key System</h2>
              <p className="mx-auto mt-5 max-w-2xl text-zinc-400">
                Watch a few ads through the gateway and generate a temporary <BrandName className="inline" /> key.
              </p>
              <button
                type="button"
                onClick={() => openExternal(externalLinks.free)}
                disabled={authBusy}
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-500"
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
                  <div key={plan.id} className="border border-white/10 bg-black px-4 py-4 text-center font-mono text-sm">
                    {plan.name} = {plan.robux}
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
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-emerald-600 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-500"
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
                      className={`border px-4 py-4 text-center font-mono text-sm transition ${
                        active ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/10 bg-black text-zinc-400 hover:border-white/30'
                      }`}
                    >
                      {plan.name} = ${plan.price.toFixed(2)}
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
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-white px-8 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-zinc-200"
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
                  <div key={plan.id} className="border border-white/10 bg-black px-4 py-4 text-center font-mono text-sm">
                    {plan.name} = {plan.funpay}
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
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 bg-sky-500 px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-sky-400"
              >
                {authBusy ? 'Authorizing...' : 'Buy Now'} <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        <div className="mt-10 border border-white/10 bg-[#08080b] p-6">
          <p className="text-sm font-semibold text-zinc-300">
            After purchase, join our Discord server and open a ticket if you need help activating your key.
          </p>
          <a
            href={externalLinks.discord}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-black uppercase tracking-wide text-indigo-400 hover:text-indigo-300"
          >
            Join Server
          </a>
        </div>
      </main>
    </div>
  );
}
