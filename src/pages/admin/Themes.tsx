import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Check, Palette, Save, Sparkles } from 'lucide-react';
import { db } from '../../firebase';
import SEO from '../../components/SEO';

type ThemeOption = {
  id: string;
  name: string;
  description: string;
  preview: string;
  accent: string;
  button: string;
  panel: string;
  text: string;
  eyebrow: string;
};

type LayoutStyle = {
  id: string;
  name: string;
  description: string;
  previewLayout: 'image' | 'left' | 'center' | 'split' | 'showcase' | 'poster' | 'compact' | 'editorial';
};

const themes: ThemeOption[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The original storefront: background image first, products below.',
    preview: 'bg-[linear-gradient(180deg,rgba(11,14,20,0)_0%,rgba(11,14,20,.25)_55%,#0B0E14_100%)]',
    accent: 'text-indigo-300',
    button: 'bg-indigo-600 text-white',
    panel: 'bg-slate-950/72 border-white/10',
    text: 'text-white',
    eyebrow: 'Original background image storefront'
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'A bold hero with store copy and direct action buttons.',
    preview: 'bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,.45),transparent_45%),linear-gradient(90deg,#070a12,#111827)]',
    accent: 'text-indigo-200',
    button: 'bg-indigo-600 text-white',
    panel: 'bg-slate-950/72 border-indigo-300/20',
    text: 'text-white',
    eyebrow: 'Bold conversion-focused hero'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Centered, calmer hero text with a cleaner landing feel.',
    preview: 'bg-[linear-gradient(135deg,#0B0E14,#1f2937_55%,#111827)]',
    accent: 'text-slate-200',
    button: 'bg-indigo-600 text-white',
    panel: 'bg-slate-900/72 border-slate-500/20',
    text: 'text-white',
    eyebrow: 'Centered and calm'
  },
  {
    id: 'pulse',
    name: 'Pulse',
    description: 'More colorful hero lighting with pink and indigo energy.',
    preview: 'bg-[radial-gradient(circle_at_75%_20%,rgba(236,72,153,.45),transparent_35%),radial-gradient(circle_at_25%_30%,rgba(99,102,241,.45),transparent_40%),#0B0E14]',
    accent: 'text-pink-200',
    button: 'bg-pink-500 text-white',
    panel: 'bg-slate-950/70 border-pink-300/20',
    text: 'text-white',
    eyebrow: 'Pink and indigo energy'
  },
  {
    id: 'vault',
    name: 'Vault',
    description: 'Premium dark storefront with emerald glow and sharper contrast.',
    preview: 'bg-[radial-gradient(circle_at_78%_24%,rgba(16,185,129,.38),transparent_36%),linear-gradient(135deg,#05070c,#0f172a_60%,#020617)]',
    accent: 'text-emerald-200',
    button: 'bg-emerald-500 text-black',
    panel: 'bg-slate-950/76 border-emerald-300/20',
    text: 'text-white',
    eyebrow: 'Premium secured vault'
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Clean blue-cyan atmosphere with centered hero content.',
    preview: 'bg-[radial-gradient(circle_at_30%_18%,rgba(34,211,238,.38),transparent_34%),radial-gradient(circle_at_75%_18%,rgba(59,130,246,.35),transparent_38%),#07111f]',
    accent: 'text-cyan-200',
    button: 'bg-cyan-400 text-slate-950',
    panel: 'bg-slate-950/70 border-cyan-200/20',
    text: 'text-white',
    eyebrow: 'Clean cyan atmosphere'
  },
  {
    id: 'arcade',
    name: 'Arcade',
    description: 'High-energy neon style for a louder gaming storefront.',
    preview: 'bg-[linear-gradient(135deg,rgba(236,72,153,.45),transparent_30%),radial-gradient(circle_at_65%_35%,rgba(139,92,246,.5),transparent_38%),#080711]',
    accent: 'text-fuchsia-200',
    button: 'bg-pink-500 text-white',
    panel: 'bg-[#100a1f]/78 border-fuchsia-300/20',
    text: 'text-white',
    eyebrow: 'Loud gaming neon'
  },
  {
    id: 'monolith',
    name: 'Monolith',
    description: 'Editorial black-and-white theme with sharp metallic lines.',
    preview: 'bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.08)_0_1px,transparent_1px_18px),linear-gradient(135deg,#030712,#111827_55%,#050505)]',
    accent: 'text-zinc-200',
    button: 'bg-white text-black',
    panel: 'bg-black/72 border-white/20',
    text: 'text-white',
    eyebrow: 'Sharp monochrome editorial'
  },
  {
    id: 'gridline',
    name: 'Gridline',
    description: 'Cyber grid theme with a clean digital horizon.',
    preview: 'bg-[repeating-linear-gradient(90deg,rgba(34,211,238,.2)_0_1px,transparent_1px_28px),repeating-linear-gradient(0deg,rgba(34,211,238,.16)_0_1px,transparent_1px_28px),linear-gradient(180deg,#020617,#08111f)]',
    accent: 'text-cyan-200',
    button: 'bg-cyan-400 text-slate-950',
    panel: 'bg-slate-950/72 border-cyan-300/20',
    text: 'text-white',
    eyebrow: 'Cyber grid horizon'
  },
  {
    id: 'frost',
    name: 'Frost',
    description: 'Cold glass style with bright cyan highlights and soft contrast.',
    preview: 'bg-[linear-gradient(135deg,#dbeafe_0%,#93c5fd_35%,#0f172a_100%)]',
    accent: 'text-sky-100',
    button: 'bg-sky-300 text-slate-950',
    panel: 'bg-white/18 border-white/35',
    text: 'text-white',
    eyebrow: 'Bright glassy cold theme'
  },
  {
    id: 'crimson',
    name: 'Crimson',
    description: 'Dark red cinematic theme with aggressive diagonal energy.',
    preview: 'bg-[repeating-linear-gradient(135deg,rgba(248,113,113,.16)_0_2px,transparent_2px_20px),linear-gradient(135deg,#120408,#450a0a_48%,#08070a)]',
    accent: 'text-red-200',
    button: 'bg-red-500 text-white',
    panel: 'bg-red-950/44 border-red-300/20',
    text: 'text-white',
    eyebrow: 'Aggressive cinematic red'
  },
  {
    id: 'circuit',
    name: 'Circuit',
    description: 'Techy green linework theme without the image background.',
    preview: 'bg-[repeating-linear-gradient(90deg,rgba(52,211,153,.14)_0_1px,transparent_1px_34px),linear-gradient(135deg,#020617,#052e2b_58%,#020617)]',
    accent: 'text-emerald-200',
    button: 'bg-emerald-400 text-slate-950',
    panel: 'bg-emerald-950/34 border-emerald-300/20',
    text: 'text-white',
    eyebrow: 'Encrypted circuit board'
  },
  {
    id: 'solar',
    name: 'Solar',
    description: 'Bright amber sunrise style with a cleaner premium feel.',
    preview: 'bg-[radial-gradient(circle_at_22%_18%,rgba(251,191,36,.62),transparent_32%),linear-gradient(135deg,#fffbeb_0%,#f59e0b_35%,#111827_100%)]',
    accent: 'text-amber-100',
    button: 'bg-amber-300 text-slate-950',
    panel: 'bg-slate-950/60 border-amber-200/25',
    text: 'text-white',
    eyebrow: 'Warm premium sunrise'
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Soft pink glass theme for a smoother boutique storefront.',
    preview: 'bg-[radial-gradient(circle_at_75%_20%,rgba(244,114,182,.48),transparent_34%),linear-gradient(135deg,#fff1f2_0%,#be185d_42%,#160818_100%)]',
    accent: 'text-rose-100',
    button: 'bg-rose-300 text-slate-950',
    panel: 'bg-white/14 border-rose-100/30',
    text: 'text-white',
    eyebrow: 'Soft boutique glass'
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Matrix-inspired hacker console with clean green contrast.',
    preview: 'bg-[repeating-linear-gradient(0deg,rgba(132,204,22,.14)_0_1px,transparent_1px_18px),linear-gradient(135deg,#020403,#052e16_48%,#020617)]',
    accent: 'text-lime-200',
    button: 'bg-lime-300 text-slate-950',
    panel: 'bg-black/72 border-lime-300/25',
    text: 'text-white',
    eyebrow: 'Console-style product drop'
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep luxury navy with gold highlights and calm spacing.',
    preview: 'bg-[radial-gradient(circle_at_70%_28%,rgba(250,204,21,.28),transparent_30%),linear-gradient(135deg,#020617,#111827_45%,#312e81_100%)]',
    accent: 'text-yellow-100',
    button: 'bg-yellow-300 text-slate-950',
    panel: 'bg-slate-950/70 border-yellow-200/20',
    text: 'text-white',
    eyebrow: 'Luxury midnight gold'
  },
  {
    id: 'daylight',
    name: 'Daylight',
    description: 'Clean light storefront with strong black text and blue action.',
    preview: 'bg-[linear-gradient(135deg,#f8fafc_0%,#dbeafe_48%,#1d4ed8_100%)]',
    accent: 'text-blue-800',
    button: 'bg-blue-600 text-white',
    panel: 'bg-white/82 border-blue-200/80',
    text: 'text-slate-950',
    eyebrow: 'Clean light storefront'
  }
];

const layoutStyles: LayoutStyle[] = [
  {
    id: 'image',
    name: 'Full Image',
    description: 'Old clean homepage: full-screen background image, then products below.',
    previewLayout: 'image'
  },
  {
    id: 'left',
    name: 'Left Hero',
    description: 'Big text on the left with direct action buttons.',
    previewLayout: 'left'
  },
  {
    id: 'centered',
    name: 'Centered',
    description: 'Balanced centered landing page with calm spacing.',
    previewLayout: 'center'
  },
  {
    id: 'split',
    name: 'Split Product',
    description: 'Hero text plus a featured product panel on the right.',
    previewLayout: 'split'
  },
  {
    id: 'showcase',
    name: 'Showcase',
    description: 'Centered hero with quick product tiles under the buttons.',
    previewLayout: 'showcase'
  },
  {
    id: 'poster',
    name: 'Poster',
    description: 'Huge cinematic brand title near the bottom of the first screen.',
    previewLayout: 'poster'
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Shorter hero so customers see products faster.',
    previewLayout: 'compact'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine-style hero with a side rail and strong headline.',
    previewLayout: 'editorial'
  }
];

export default function AdminThemes() {
  const [themeId, setThemeId] = useState('classic');
  const [homeStyle, setHomeStyle] = useState('image');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const selectedTheme = themes.find(theme => theme.id === themeId) || themes[0];
  const selectedLayout = layoutStyles.find(style => style.id === homeStyle) || layoutStyles[0];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadTheme = async () => {
      const snap = await getDoc(doc(db, 'settings', 'theme'));
      if (snap.exists()) {
        const themeData = snap.data();
        setThemeId(themeData.themeId || 'classic');
        setHomeStyle(themeData.homeStyle || 'image');
      }
    };
    loadTheme();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'theme'), {
        themeId,
        homeStyle,
        updatedAt: Date.now()
      }, { merge: true });
      showToast('Theme and style saved.');
    } catch (error) {
      console.error(error);
      showToast('Failed to save theme and style.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6 text-white pb-12">
      <SEO title="Themes | Rumble Hub Admin" description="Choose the storefront theme." />
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-3">
          <Palette className="w-3.5 h-3.5" />
          Settings
        </div>
        <h1 className="text-2xl font-bold">Themes</h1>
        <p className="text-sm text-slate-400 mt-1">Select your theme and change how the storefront homepage opens.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-indigo-300" />
              Preview Theme
            </div>
            <p className="mt-1 text-xs text-slate-400">Quick storefront mockup for the selected theme and homepage style.</p>
          </div>
          <div className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
            {selectedTheme.name} / {selectedLayout.name}
          </div>
        </div>

        <div className={`${selectedTheme.preview} min-h-[430px] p-4 sm:p-6`}>
          <div className={`mx-auto max-w-4xl overflow-hidden border border-white/10 bg-black/18 shadow-2xl shadow-black/30 backdrop-blur-sm ${selectedLayout.previewLayout === 'image' ? 'rounded-none' : 'rounded-2xl'}`}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className={`text-sm font-black ${selectedTheme.text}`}>Rumble Hub</div>
              <div className="hidden items-center gap-4 text-[11px] font-semibold text-white/65 sm:flex">
                <span>Home</span>
                <span>Products</span>
                <span>Profile</span>
              </div>
              <div className={`h-7 rounded px-3 py-1 text-[11px] font-bold ${selectedTheme.button}`}>
                Sign In
              </div>
            </div>

            <div className={`p-5 sm:p-7 ${
              selectedLayout.previewLayout === 'split'
                ? 'grid gap-4 sm:grid-cols-[1.05fr_.95fr]'
                : selectedLayout.previewLayout === 'image'
                  ? 'flex min-h-72 items-end'
                  : selectedLayout.previewLayout === 'compact'
                    ? 'min-h-56'
                    : 'min-h-72'
            }`}>
              {selectedLayout.previewLayout === 'image' ? (
                <div className="w-full">
                  <div className="mb-4 h-20" />
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(item => (
                      <div key={item} className={`rounded-lg border p-3 ${selectedTheme.panel}`}>
                        <div className="aspect-[4/3] rounded bg-white/12" />
                        <div className={`mt-3 h-2 w-16 rounded ${selectedTheme.text === 'text-slate-950' ? 'bg-slate-800' : 'bg-white/80'}`} />
                        <div className="mt-2 h-2 w-10 rounded bg-white/30" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className={`flex flex-col ${
                    selectedLayout.previewLayout === 'center' || selectedLayout.previewLayout === 'showcase'
                      ? 'items-center text-center'
                      : selectedLayout.previewLayout === 'poster'
                        ? 'justify-end'
                        : selectedLayout.previewLayout === 'editorial'
                          ? 'border-l border-white/20 pl-5'
                          : 'justify-end'
                  } ${selectedLayout.previewLayout === 'compact' ? 'min-h-44' : 'min-h-56'}`}>
                    <div className={`mb-3 inline-flex w-fit border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${selectedTheme.accent}`}>
                      {selectedTheme.eyebrow}
                    </div>
                    <h3 className={`max-w-md font-black uppercase leading-[0.88] ${
                      selectedLayout.previewLayout === 'poster' ? 'text-6xl sm:text-7xl' : 'text-4xl sm:text-5xl'
                    } ${selectedTheme.text}`}>
                      Rumble Hub
                    </h3>
                    <p className={`mt-3 max-w-md text-sm ${selectedTheme.text === 'text-slate-950' ? 'text-slate-700' : 'text-white/70'}`}>
                      Browse products, pay securely, and receive your items instantly.
                    </p>
                    <div className={`mt-5 flex flex-wrap gap-2 ${
                      selectedLayout.previewLayout === 'center' || selectedLayout.previewLayout === 'showcase' ? 'justify-center' : ''
                    }`}>
                      <div className={`rounded px-4 py-2 text-xs font-bold ${selectedTheme.button}`}>Browse Products</div>
                      <div className={`rounded border px-4 py-2 text-xs font-bold ${selectedTheme.text === 'text-slate-950' ? 'border-slate-900/20 text-slate-900' : 'border-white/15 text-white'}`}>
                        Reviews
                      </div>
                    </div>

                    {selectedLayout.previewLayout === 'showcase' && (
                      <div className="mt-5 grid w-full max-w-xl grid-cols-3 gap-2">
                        {['ZXCHUB', 'Rumble', 'Keys'].map(item => (
                          <div key={item} className={`border px-3 py-2 text-left text-[11px] font-bold ${selectedTheme.panel} ${selectedTheme.text}`}>
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedLayout.previewLayout === 'split' && (
                    <div className={`self-end rounded-xl border p-4 ${selectedTheme.panel}`}>
                      <div className="aspect-[4/3] rounded-lg bg-white/12" />
                      <div className={`mt-4 text-sm font-black ${selectedTheme.text}`}>ZXCHUB</div>
                      <div className={`mt-1 text-xs ${selectedTheme.text === 'text-slate-950' ? 'text-slate-600' : 'text-white/55'}`}>Premium digital product</div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`text-lg font-black ${selectedTheme.text}`}>$1.80</span>
                        <span className={`rounded px-3 py-1 text-xs font-bold ${selectedTheme.button}`}>View</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold">Homepage Style</h2>
          <p className="mt-1 text-sm text-slate-400">Choose the structure of the main page. Themes change colors, styles change layout.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {layoutStyles.map(style => {
            const selected = homeStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setHomeStyle(style.id)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-[#111827] hover:border-slate-700'
                }`}
              >
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  selected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-700 text-transparent'
                }`}>
                  <Check className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-white">{style.name}</div>
                  <div className="mt-1 text-sm text-slate-400">{style.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map(theme => {
          const selected = themeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setThemeId(theme.id)}
              className={`overflow-hidden rounded-xl border text-left transition-colors ${
                selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-[#111827] hover:border-slate-700'
              }`}
            >
              <div className={`h-36 ${theme.preview} relative`}>
                <div className="absolute inset-x-4 bottom-4">
                  <div className="h-3 w-28 rounded bg-white/80 mb-2" />
                  <div className="h-2 w-44 rounded bg-white/35" />
                </div>
                {selected && (
                  <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="font-semibold text-white">{theme.name}</div>
                <div className="mt-1 text-sm text-slate-400">{theme.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end border-t border-slate-800 pt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Theme'}
        </button>
      </div>
    </div>
  );
}
