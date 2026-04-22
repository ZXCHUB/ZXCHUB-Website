import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Copy, Download, FileText, KeyRound, LogOut, MessageSquare, Save, Send, Settings, Ticket } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import ImageCropper from '../components/ImageCropper';

type ProfileTab = 'purchases' | 'invoices' | 'tickets' | 'settings';

function Toast({ toast }: { toast: { message: string; type: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 z-[100] px-6 py-3 font-medium text-white shadow-xl ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
      {toast.message}
    </div>
  );
}

export default function Profile() {
  const { profile, user, loading, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as ProfileTab) || 'purchases';
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) return <div className="min-h-screen bg-[#050507] flex items-center justify-center text-zinc-500">Loading...</div>;
  if (!profile || !user) return <Navigate to="/" replace />;

  const tabs = [
    { id: 'purchases', label: 'My Purchases', Icon: KeyRound },
    { id: 'invoices', label: 'Invoices', Icon: FileText },
    { id: 'tickets', label: 'Support Tickets', Icon: Ticket },
    { id: 'settings', label: 'Settings', Icon: Settings }
  ] as const;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <SEO title="My Profile | ZXCHUB" description="Manage your ZXCHUB keys and support tickets." />
      <Navbar />
      <Toast toast={toast} />

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 pt-28 md:grid-cols-[18rem_1fr] sm:px-6 lg:px-8">
        <aside className="border border-white/10 bg-[#08080b] p-4 md:sticky md:top-24 md:self-start">
          <div className="mb-5 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName || profile.email} className="h-12 w-12 rounded-full object-cover ring-2 ring-red-500/30" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-lg font-black text-white">
                  {(profile.displayName || profile.email || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-black">{profile.displayName || profile.email}</div>
                <div className="mt-1 truncate text-sm text-zinc-500">{profile.email}</div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition ${activeTab === id ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <button onClick={logout} className="mt-5 flex w-full items-center gap-3 border border-white/10 px-4 py-3 text-left text-sm font-bold text-zinc-400 hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </aside>

        <section className="min-h-[520px] border border-white/10 bg-[#08080b] p-5 sm:p-8">
          {activeTab === 'purchases' && <PurchasesTab user={user} showToast={showToast} setActiveTab={setActiveTab} />}
          {activeTab === 'invoices' && <InvoicesTab user={user} />}
          {activeTab === 'tickets' && <TicketsTab user={user} profile={profile} showToast={showToast} />}
          {activeTab === 'settings' && <SettingsTab profile={profile} showToast={showToast} />}
        </section>
      </main>
    </div>
  );
}

function PurchasesTab({ user, showToast, setActiveTab }: { user: any; showToast: any; setActiveTab: (tab: ProfileTab) => void }) {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKeys = async () => {
      const snap = await getDocs(query(collection(db, 'keys'), where('ownerId', '==', user.uid)));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a, b) => Number(b.purchasedAt || 0) - Number(a.purchasedAt || 0));
      setKeys(data);
      setLoading(false);
    };
    fetchKeys();
  }, [user.uid]);

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    showToast('Key copied.');
  };

  const downloadKey = (key: any) => {
    const text = [
      'ZXCHUB Key',
      `Plan: ${key.variantName || 'Standard'}`,
      `Purchased: ${new Date(key.purchasedAt || Date.now()).toLocaleString()}`,
      `Key: ${key.keyString}`,
      '',
      key.instructions || 'Open ZXCHUB, paste your key, and join discord.gg/zxchub if you need help.'
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zxchub-${key.variantName || 'key'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-zinc-500">Loading purchases...</div>;

  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">My Purchases</h1>
          <p className="mt-1 text-sm text-zinc-500">Your delivered ZXCHUB keys. Each key is unique and only assigned once.</p>
        </div>
      </div>

      {keys.length === 0 ? (
        <div className="border border-dashed border-white/10 bg-black/30 p-10 text-center text-zinc-500">
          No keys purchased yet.
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map(key => (
            <div key={key.id} className="border border-white/10 bg-black p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xl font-black">{key.productName || 'ZXCHUB Key'}</div>
                  <div className="mt-1 text-sm text-zinc-400">{key.variantName}</div>
                  <div className="mt-1 text-xs text-zinc-600">Purchased: {new Date(key.purchasedAt || Date.now()).toLocaleString()}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copyKey(key.keyString)} className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                  <button onClick={() => downloadKey(key)} className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  <button onClick={() => setActiveTab('tickets')} className="inline-flex items-center gap-2 border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10">
                    <Ticket className="h-3.5 w-3.5" /> Support
                  </button>
                </div>
              </div>
              <div className="mt-4 border border-white/10 bg-[#08080b] p-3 font-mono text-sm text-red-300 break-all">{key.keyString}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvoicesTab({ user }: { user: any }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      const snap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', user.uid)));
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
      setLoading(false);
    };
    fetchInvoices();
  }, [user.uid]);

  if (loading) return <div className="text-zinc-500">Loading invoices...</div>;

  return (
    <div>
      <h1 className="mb-7 text-3xl font-black">Invoices</h1>
      <div className="overflow-x-auto border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-black text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Item</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Method</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td className="px-5 py-4 font-mono text-xs text-zinc-500">{invoice.id}</td>
                <td className="px-5 py-4 font-bold">{invoice.productTitle || 'ZXCHUB Key'}</td>
                <td className="px-5 py-4 text-emerald-400">${Number(invoice.amount || 0).toFixed(2)}</td>
                <td className="px-5 py-4 text-zinc-400">{invoice.method || 'Credit Card'}</td>
                <td className="px-5 py-4 text-zinc-400">{new Date(invoice.createdAt || Date.now()).toLocaleString()}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-zinc-600">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketsTab({ user, profile, showToast }: { user: any; profile: any; showToast: any }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    const snap = await getDocs(query(collection(db, 'tickets'), where('userId', '==', user.uid)));
    setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)));
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user.uid]);

  const createTicket = async () => {
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (cleanSubject.length < 3 || cleanMessage.length < 5) return showToast('Enter a subject and message.', 'error');

    const batch = writeBatch(db);
    const ticketRef = doc(collection(db, 'tickets'));
    batch.set(ticketRef, {
      userId: user.uid,
      userEmail: profile.email,
      subject: cleanSubject,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastMessage: cleanMessage
    });
    batch.set(doc(collection(db, `tickets/${ticketRef.id}/messages`)), {
      text: cleanMessage,
      senderId: user.uid,
      senderName: profile.displayName || profile.email,
      ticketUserId: user.uid,
      isAdmin: false,
      createdAt: Date.now()
    });
    await batch.commit();
    fetch('/api/discord/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ticket_created', ticketId: ticketRef.id })
    }).catch(() => {});
    setSubject('');
    setMessage('');
    showToast('Ticket created.');
    await fetchTickets();
  };

  return (
    <div>
      <h1 className="mb-7 text-3xl font-black">Support Tickets</h1>
      <div className="mb-8 border border-white/10 bg-black p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-400"><MessageSquare className="h-4 w-4" /> New Ticket</div>
        <input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Subject" className="mb-3 w-full border border-white/10 bg-[#08080b] px-4 py-3 text-sm text-white outline-none focus:border-red-500" />
        <textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Describe your issue..." className="min-h-32 w-full resize-y border border-white/10 bg-[#08080b] p-4 text-sm text-white outline-none focus:border-red-500" />
        <button onClick={createTicket} className="mt-4 inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black uppercase text-white hover:bg-red-500">
          <Send className="h-4 w-4" /> Create Ticket
        </button>
      </div>

      {loading ? <div className="text-zinc-500">Loading tickets...</div> : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div key={ticket.id} className="border border-white/10 bg-black p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-black">{ticket.subject}</div>
                  <div className="mt-1 text-xs text-zinc-600">{new Date(ticket.updatedAt || ticket.createdAt || Date.now()).toLocaleString()}</div>
                </div>
                <span className={`px-3 py-1 text-xs font-black uppercase ${ticket.status === 'closed' ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-500/10 text-emerald-300'}`}>{ticket.status || 'active'}</span>
              </div>
              <div className="mt-3 text-sm text-zinc-400">{ticket.lastMessage}</div>
            </div>
          ))}
          {tickets.length === 0 && <div className="py-8 text-center text-sm text-zinc-600">No tickets yet.</div>}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ profile, showToast }: { profile: any; showToast: any }) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { displayName, photoURL });
      showToast('Profile updated.');
    } catch (error) {
      console.error(error);
      showToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-7 text-3xl font-black">Settings</h1>
      <div className="space-y-5">
        <div>
          <span className="mb-3 block text-sm font-bold text-zinc-400">Avatar</span>
          <div className="mb-4 flex items-center gap-4">
            {photoURL ? (
              <img src={photoURL} alt={displayName || profile.email} className="h-20 w-20 rounded-full object-cover ring-2 ring-red-500/30" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-2xl font-black text-white">
                {(displayName || profile.email || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="text-sm leading-6 text-zinc-500">
              Upload an image from your PC, crop it, and save it as your profile avatar.
            </div>
          </div>
          <ImageCropper currentImage={photoURL} onImageCropped={setPhotoURL} aspectRatio={1} circularCrop />
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-zinc-400">Display Name</span>
          <input value={displayName} onChange={event => setDisplayName(event.target.value)} className="w-full border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-red-500" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-zinc-400">Email</span>
          <input value={profile.email} disabled className="w-full border border-white/10 bg-black/40 px-4 py-3 text-zinc-600" />
        </label>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-red-600 px-6 py-3 text-sm font-black uppercase text-white hover:bg-red-500 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
