import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save } from 'lucide-react';

export default function AdminDiscord() {
  const [token, setToken] = useState('');
  const [appId, setAppId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [guildId, setGuildId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
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
        webhookUrl,
        updatedAt: Date.now()
      }, { merge: true });
      showToast('Discord settings saved successfully!');
    } catch (e) {
      console.error(e);
      showToast('Failed to save settings', 'error');
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
