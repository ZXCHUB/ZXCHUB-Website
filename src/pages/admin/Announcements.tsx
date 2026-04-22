import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Megaphone, Save } from 'lucide-react';
import { db } from '../../firebase';
import SEO from '../../components/SEO';

const clampLoopDuration = (value: number) => Math.max(1, Math.min(100, Number.isFinite(value) ? value : 38));
const normalizeExternalUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

export default function AdminAnnouncements() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loopMessages, setLoopMessages] = useState(3);
  const [loopDuration, setLoopDuration] = useState(38);
  const [backgroundColor, setBackgroundColor] = useState('#4f46e5');
  const [textColor, setTextColor] = useState('#ffffff');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchAnnouncement = async () => {
      const snap = await getDoc(doc(db, 'settings', 'announcement'));
      if (snap.exists()) {
        const data = snap.data() as any;
        setEnabled(Boolean(data.enabled));
        setMessage(data.message || '');
        setLinkText(data.linkText || '');
        setLinkUrl(data.linkUrl || '');
        setLoopMessages(Number(data.loopMessages ?? 3));
        setLoopDuration(clampLoopDuration(Number(data.loopDuration || 38)));
        setBackgroundColor(data.backgroundColor || '#4f46e5');
        setTextColor(data.textColor || '#ffffff');
      }
    };
    fetchAnnouncement();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'announcement'), {
        enabled,
        message,
        linkText,
        linkUrl: normalizeExternalUrl(linkUrl),
        loopMessages,
        loopDuration: clampLoopDuration(loopDuration),
        backgroundColor,
        textColor,
        updatedAt: Date.now()
      }, { merge: true });
      showToast('Announcement saved.');
    } catch (error) {
      console.error(error);
      showToast('Failed to save announcement.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 text-white pb-12">
      <SEO title="Announcements | Rumble Hub Admin" description="Manage storefront announcement banner." />
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-3">
          <Megaphone className="w-3.5 h-3.5" />
          Settings
        </div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-sm text-slate-400 mt-1">Show a small banner above the navbar for sales, updates, and maintenance notices.</p>
      </div>

      <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6 space-y-5">
        <label className="flex items-center justify-between rounded-lg border border-[#222b3d] bg-[#0f172a] px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-white">Banner Enabled</span>
            <span className="text-xs text-slate-500">Turn this off to hide the announcement everywhere.</span>
          </span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
          />
        </label>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
            placeholder="New update is live. Join our Discord for support."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Link Text</label>
            <input
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Learn more"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Link URL</label>
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="discord.gg/..."
            />
            <p className="text-xs text-slate-500 mt-1">You can paste with or without https://.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Messages In One Loop</label>
            <input
              type="number"
              min="1"
              max="12"
              value={loopMessages}
              onChange={e => setLoopMessages(Math.max(1, Math.min(12, Number(e.target.value))))}
              className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">More messages means it repeats sooner with less empty space.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Loop Speed</label>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={loopDuration}
              onChange={e => setLoopDuration(clampLoopDuration(Number(e.target.value)))}
              className="w-full accent-indigo-500"
            />
            <input
              type="number"
              min="1"
              max="100"
              value={loopDuration}
              onChange={e => setLoopDuration(clampLoopDuration(Number(e.target.value)))}
              className="mt-2 w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="text-xs text-slate-500 mt-1">{loopDuration}s to travel across the screen. Higher is slower.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Background Color</label>
            <div className="flex gap-2">
              <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="h-10 w-12 rounded border border-[#222b3d] bg-[#0f172a]" />
              <input value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="flex-1 bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Text Color</label>
            <div className="flex gap-2">
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="h-10 w-12 rounded border border-[#222b3d] bg-[#0f172a]" />
              <input value={textColor} onChange={e => setTextColor(e.target.value)} className="flex-1 bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#222b3d] bg-[#0f172a] p-4">
          <div className="mb-3 text-sm font-semibold text-white">Live Preview</div>
          <div
            className="relative overflow-hidden border-b border-white/10 rounded-lg"
            style={{ backgroundColor, color: textColor }}
          >
            <div className="h-9 whitespace-nowrap">
              <div className="relative h-9 overflow-hidden text-sm font-medium">
                {normalizeExternalUrl(linkUrl) ? (
                  <a
                    href={normalizeExternalUrl(linkUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute left-0 top-0 inline-flex h-9 items-center gap-3 px-4 animate-marquee-ltr hover:opacity-90"
                    style={{ '--marquee-duration': `${clampLoopDuration(loopDuration)}s` } as React.CSSProperties}
                  >
                    <span>{message || 'Your announcement message will appear here.'}</span>
                    {linkText && <span className="underline decoration-current/50 underline-offset-4">{linkText}</span>}
                  </a>
                ) : (
                  <span
                    className="absolute left-0 top-0 inline-flex h-9 items-center gap-3 px-4 animate-marquee-ltr"
                    style={{ '--marquee-duration': `${clampLoopDuration(loopDuration)}s` } as React.CSSProperties}
                  >
                    <span>{message || 'Your announcement message will appear here.'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#222b3d] flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}
