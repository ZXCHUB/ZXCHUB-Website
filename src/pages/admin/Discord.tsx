import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { AlertTriangle, ExternalLink, Save, UserPlus } from 'lucide-react';
import { useAuth } from '../../AuthContext';

type ForceRejoinResponse = {
  guildInvite?: string;
  summary?: {
    joined: number;
    skipped: number;
    failed: number;
  };
  results?: Array<{
    userId: string;
    discordUsername?: string;
    status: 'joined' | 'skipped' | 'failed';
    reason?: string;
  }>;
};

export default function AdminDiscord() {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [appId, setAppId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [guildId, setGuildId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [guildInvite, setGuildInvite] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [forceBusy, setForceBusy] = useState(false);
  const [forceResult, setForceResult] = useState<ForceRejoinResponse | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const d = await getDoc(doc(db, 'settings', 'discord'));
        if (d.exists()) {
          const data = d.data();
          setToken(data.token || '');
          setAppId(data.appId || '');
          setClientSecret(data.clientSecret || '');
          setGuildId(data.guildId || '');
          setRoleId(data.roleId || '');
          setGuildInvite(data.guildInvite || 'https://discord.gg/zxchub');
          setWebhookUrl(data.webhookUrl || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'discord'), {
        token,
        appId,
        clientSecret,
        guildId,
        roleId,
        guildInvite,
        webhookUrl,
        updatedAt: Date.now()
      }, { merge: true });
      showToast('Discord settings saved successfully!');
    } catch (e) {
      console.error(e);
      showToast('Failed to save settings', 'error');
    }
  };

  const handleForceRejoin = async () => {
    if (!user) {
      showToast('Sign in as admin first.', 'error');
      return;
    }

    const confirmed = window.confirm(
      'Force all Rejoin will ask the bot to add every user who authorized Discord with Guilds Join. Continue?'
    );

    if (!confirmed) return;

    setForceBusy(true);
    setForceResult(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/discord/force-rejoin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Force rejoin failed.');
      }

      setForceResult(data);
      showToast(`Force rejoin finished: ${data.summary?.joined || 0} joined, ${data.summary?.failed || 0} failed.`);
    } catch (error: any) {
      showToast(error.message || 'Force rejoin failed.', 'error');
    } finally {
      setForceBusy(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading...</div>;

  return (
    <div className="max-w-3xl space-y-6 text-white pb-12">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Discord Integration</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your Discord bot and OAuth settings.</p>
      </div>

      <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Bot Token</label>
          <input 
            type="password" 
            value={token}
            onChange={e => setToken(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            placeholder="Enter your Discord Bot Token"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Application ID</label>
          <input 
            type="text" 
            value={appId}
            onChange={e => setAppId(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            placeholder="Enter your Application ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Client Secret</label>
          <input 
            type="password" 
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            placeholder="Enter your Client Secret"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Server ID</label>
          <input
            type="text"
            value={guildId}
            onChange={e => setGuildId(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            placeholder="Enter your Discord Server ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Customer Role ID</label>
          <input
            type="text"
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            placeholder="Enter the role ID to assign after purchase"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Guild Invite URL</label>
          <input
            type="url"
            value={guildInvite}
            onChange={e => setGuildInvite(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            placeholder="https://discord.gg/zxchub"
          />
          <p className="text-xs text-slate-500 mt-2">Used as a fallback invite when Discord cannot add someone automatically.</p>
        </div>

        <div className="pt-6 border-t border-[#222b3d]">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white">Force all Rejoin</h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">
                    Adds every user who authorized Discord with <span className="font-semibold text-slate-200">Guilds Join</span> to your server again.
                    Users without a saved OAuth token will be skipped.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleForceRejoin}
                disabled={forceBusy}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {forceBusy ? 'Running...' : 'Force all Rejoin'}
              </button>
            </div>

            <div className="mt-4 flex gap-2 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Discord rate limits may slow this down if you have many users. The action only works for users who linked Discord after Guilds Join was enabled.</p>
            </div>

            {forceResult?.summary && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                    <p className="text-xs font-bold uppercase text-emerald-300">Joined</p>
                    <p className="mt-1 text-2xl font-black text-white">{forceResult.summary.joined}</p>
                  </div>
                  <div className="rounded-lg border border-slate-400/15 bg-slate-400/10 p-3">
                    <p className="text-xs font-bold uppercase text-slate-300">Skipped</p>
                    <p className="mt-1 text-2xl font-black text-white">{forceResult.summary.skipped}</p>
                  </div>
                  <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-3">
                    <p className="text-xs font-bold uppercase text-red-300">Failed</p>
                    <p className="mt-1 text-2xl font-black text-white">{forceResult.summary.failed}</p>
                  </div>
                </div>

                {(forceResult.guildInvite || guildInvite) && (
                  <a
                    href={forceResult.guildInvite || guildInvite}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-indigo-200"
                  >
                    Open Guild Invite <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                {!!forceResult.results?.length && (
                  <div className="max-h-52 overflow-auto rounded-lg border border-[#222b3d] bg-[#0f172a]">
                    {forceResult.results.slice(0, 12).map(item => (
                      <div key={`${item.userId}-${item.status}`} className="flex items-start justify-between gap-4 border-b border-[#222b3d] px-4 py-3 last:border-b-0">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.discordUsername || item.userId}</p>
                          {item.reason && <p className="mt-1 text-xs text-slate-500">{item.reason}</p>}
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                          item.status === 'joined'
                            ? 'bg-emerald-400/10 text-emerald-300'
                            : item.status === 'failed'
                              ? 'bg-red-400/10 text-red-300'
                              : 'bg-slate-400/10 text-slate-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-[#222b3d]">
          <label className="block text-sm font-medium text-slate-300 mb-2">Notifications Webhook URL</label>
          <input
            type="password"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            placeholder="https://discord.com/api/webhooks/..."
          />
          <p className="text-xs text-slate-500 mt-2">Used for order and support ticket notifications.</p>
        </div>

        <div className="pt-4 border-t border-[#222b3d] flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
