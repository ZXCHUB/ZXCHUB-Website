import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save, Info } from 'lucide-react';

export default function AdminPayments() {
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeApiKey, setStripeApiKey] = useState('');
  const [stripePubKey, setStripePubKey] = useState('');

  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalSecret, setPaypalSecret] = useState('');

  const [balanceEnabled, setBalanceEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const d = await getDoc(doc(db, 'settings', 'payments'));
        if (d.exists()) {
          const data = d.data();
          setStripeEnabled(data.stripe?.enabled || false);
          setStripeApiKey(data.stripe?.apiKey || '');
          setStripePubKey(data.stripe?.pubKey || '');

          setPaypalEnabled(data.paypal?.enabled || false);
          setPaypalClientId(data.paypal?.clientId || '');
          setPaypalSecret(data.paypal?.secret || '');

          setBalanceEnabled(data.balance?.enabled || false);
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
      await setDoc(doc(db, 'settings', 'payments'), {
        stripe: { enabled: stripeEnabled, apiKey: stripeApiKey, pubKey: stripePubKey },
        paypal: { enabled: paypalEnabled, clientId: paypalClientId, secret: paypalSecret },
        balance: { enabled: balanceEnabled },
        updatedAt: Date.now()
      }, { merge: true });
      showToast('Payment settings saved successfully!');
    } catch (e) {
      console.error(e);
      showToast('Failed to save settings', 'error');
    }
  };

  if (loading) return <div className="text-slate-400">Loading...</div>;

  return (
    <div className="max-w-5xl space-y-6 text-white pb-12">
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payment Methods</h1>
          <p className="text-sm text-slate-400 mt-1">Configure your payment gateways.</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stripe */}
        <div className="lg:col-span-2 bg-[#161d2b] border border-[#222b3d] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#222b3d] pb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold">S</span>
              Stripe Integration
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={stripeEnabled} onChange={e => setStripeEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {stripeEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">API Key (Secret Key)</label>
                <input 
                  type="password" 
                  value={stripeApiKey}
                  onChange={e => setStripeApiKey(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="sk_live_..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Publishable Key (Optional)</label>
                <input 
                  type="text" 
                  value={stripePubKey}
                  onChange={e => setStripePubKey(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="pk_live_..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Stripe Help */}
        <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4 text-indigo-400">
            <Info className="w-5 h-5" /> Integration Help
          </h3>
          <ol className="list-decimal list-inside space-y-3 text-sm text-slate-400">
            <li>Open the <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">API Keys</a> page on Stripe.</li>
            <li>Generate a new key by clicking "Create a Restricted Key" or use your Secret Key.</li>
            <li>Copy the secret key (sk_live) and paste it in "API Key" field.</li>
            <li>Copy the publishable key (pk_live) and paste it in "Publishable Key" field if needed for embedded forms.</li>
          </ol>
        </div>

        {/* PayPal */}
        <div className="lg:col-span-2 bg-[#161d2b] border border-[#222b3d] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#222b3d] pb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-8 h-8 bg-[#003087] rounded flex items-center justify-center font-bold italic">P</span>
              PayPal Integration
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={paypalEnabled} onChange={e => setPaypalEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {paypalEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Client ID</label>
                <input 
                  type="text" 
                  value={paypalClientId}
                  onChange={e => setPaypalClientId(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Enter PayPal Client ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Secret Key</label>
                <input 
                  type="password" 
                  value={paypalSecret}
                  onChange={e => setPaypalSecret(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Enter PayPal Secret Key"
                />
              </div>
            </div>
          )}
        </div>

        {/* PayPal Help */}
        <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4 text-indigo-400">
            <Info className="w-5 h-5" /> Integration Help
          </h3>
          <ol className="list-decimal list-inside space-y-3 text-sm text-slate-400">
            <li>Go to the <a href="https://developer.paypal.com/dashboard/applications/live" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">PayPal Developer Dashboard</a>.</li>
            <li>Create a new App (Live or Sandbox).</li>
            <li>Copy the Client ID and paste it in the "Client ID" field.</li>
            <li>Copy the Secret and paste it in the "Secret Key" field.</li>
          </ol>
        </div>

        {/* Customer Balance */}
        <div className="lg:col-span-2 bg-[#161d2b] border border-[#222b3d] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold">$</span>
              Customer Balance
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={balanceEnabled} onChange={e => setBalanceEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>
          <p className="text-sm text-slate-400 mt-2">Allow customers to pay using their account balance.</p>
        </div>
      </div>
    </div>
  );
}
