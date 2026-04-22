import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import BrandName from './BrandName';

function Toast({ toast }: { toast: { message: string; type: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 z-[100] px-6 py-3 font-medium text-white shadow-xl ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {toast.message}
    </div>
  );
}

const normalizeExternalUrl = (url?: string) => {
  const trimmed = url?.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

export default function Navbar() {
  const { user, profile, login, logout } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [announcement, setAnnouncement] = useState<any>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const getSignInErrorMessage = (error: unknown) => {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';

    if (code === 'auth/unauthorized-domain') {
      return `Firebase blocks this domain: ${window.location.hostname}. Add it in Authentication > Settings > Authorized domains.`;
    }

    if (code === 'auth/popup-blocked') return 'The sign-in popup was blocked by your browser.';
    if (code === 'auth/popup-closed-by-user') return 'The sign-in popup was closed before login finished.';
    if (code === 'auth/operation-not-allowed') return 'Google sign-in is not enabled in Firebase Authentication.';
    if (error instanceof Error) return error.message;
    return 'Sign in failed. Check Firebase Authentication settings.';
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Sign in failed:', error);
      showToast(getSignInErrorMessage(error), 'error');
    }
  };

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'announcement'));
        if (snap.exists() && snap.data().enabled && snap.data().message) {
          setAnnouncement(snap.data());
        }
      } catch (error) {
        console.error('Failed to load announcement', error);
      }
    };
    fetchAnnouncement();
  }, []);

  const announcementDuration = Math.max(1, Math.min(100, Number(announcement?.loopDuration || 38)));
  const announcementUrl = normalizeExternalUrl(announcement?.linkUrl);

  return (
    <>
      <Toast toast={toast} />
      {announcement && (
        <div
          className="relative z-40 overflow-hidden border-b border-white/10"
          style={{ backgroundColor: announcement.backgroundColor || '#4f46e5', color: announcement.textColor || '#ffffff' }}
        >
          <div className="h-9 whitespace-nowrap">
            <div className="relative h-9 overflow-hidden text-sm font-medium">
              {announcementUrl ? (
                <a
                  href={announcementUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute left-0 top-0 inline-flex h-9 items-center gap-3 px-4 animate-marquee-ltr hover:opacity-90"
                  style={{ '--marquee-duration': `${announcementDuration}s` } as React.CSSProperties}
                >
                  <span>{announcement.message}</span>
                  {announcement.linkText && (
                    <span className="underline decoration-current/50 underline-offset-4 hover:decoration-current">
                      {announcement.linkText}
                    </span>
                  )}
                </a>
              ) : (
                <span
                  className="absolute left-0 top-0 inline-flex h-9 items-center gap-3 px-4 animate-marquee-ltr"
                  style={{ '--marquee-duration': `${announcementDuration}s` } as React.CSSProperties}
                >
                  <span>{announcement.message}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#050507]/88 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="ZXCHUB" className="h-8 w-8 object-contain" />
              <BrandName className="text-xl" />
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <Link to="/scripts" className="font-medium text-zinc-300 transition-colors hover:text-white">Scripts</Link>
              <Link to="/get-key" className="font-medium text-zinc-300 transition-colors hover:text-white">Get Key</Link>
              <a href="https://discord.gg/zxchub" target="_blank" rel="noreferrer" className="font-medium text-zinc-300 transition-colors hover:text-white">
                Discord
              </a>
            </div>

            <div className="flex items-center gap-4">
              {user && profile ? (
                <>
                  {profile.role === 'admin' && (
                    <Link to="/admin" className="hidden bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 sm:flex">
                      Admin Panel
                    </Link>
                  )}
                  <Link to="/profile" className="block" title="Profile">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Avatar" className="h-9 w-9 rounded-full object-cover ring-2 ring-transparent transition hover:ring-red-500" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 font-bold text-white">
                        {profile.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <button onClick={logout} className="p-2 text-zinc-400 transition-colors hover:text-white" title="Logout">
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <button onClick={handleLogin} className="bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-500">
                  Sign In
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 border-t border-zinc-800/50 py-2 text-sm md:hidden">
            <Link to="/scripts" className="font-medium text-zinc-300 transition-colors hover:text-white">Scripts</Link>
            <Link to="/get-key" className="font-medium text-zinc-300 transition-colors hover:text-white">Get Key</Link>
            <a href="https://discord.gg/zxchub" target="_blank" rel="noreferrer" className="font-medium text-zinc-300 transition-colors hover:text-white">Discord</a>
          </div>
        </div>
      </nav>
    </>
  );
}
