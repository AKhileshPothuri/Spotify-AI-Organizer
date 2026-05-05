'use client';

import React, { useEffect, useRef, useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Music2, Sparkles, Globe, Clock, Calendar, Zap,
  CheckCircle2, Loader2, X, AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaxonomyConfig {
  genres: string[];
  moods: string[];
  occasions: string[];
  languages: string[];
  eras: string[];
  energyLevels: string[];
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const SUGGESTIONS: TaxonomyConfig = {
  genres:       ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Jazz', 'Classical', 'Electronic', 'Dance', 'Indie', 'Alternative', 'Metal', 'Folk', 'Country', 'Latin', 'Tamil', 'Hindi', 'Bollywood', 'K-pop', 'Carnatic', 'Reggae', 'Soul', 'Funk', 'Punk', 'Blues'],
  moods:        ['Happy', 'Melancholic', 'Energetic', 'Chill', 'Romantic', 'Angry', 'Sad', 'Nostalgic', 'Peaceful', 'Hype', 'Anxious', 'Empowering', 'Dark', 'Dreamy'],
  occasions:    ['Workout', 'Party', 'Study', 'Sleep', 'Morning', 'Road Trip', 'Dinner', 'Focus', 'Meditation', 'Commute', 'Date Night', 'Shower'],
  languages:    ['English', 'Tamil', 'Hindi', 'Korean', 'Spanish', 'French', 'Portuguese', 'Japanese', 'Arabic', 'Instrumental', 'Telugu', 'Malayalam', 'Kannada'],
  eras:         ['Pre-80s', '80s', '90s', '2000s', '2010s', '2020s'],
  energyLevels: ['Low', 'Medium', 'High'],
};

const DIMS: { key: keyof TaxonomyConfig; label: string; desc: string; icon: React.ElementType; accent: string }[] = [
  { key: 'genres',       label: 'Genres',        desc: 'Limit Claude to these genre labels only',       icon: Music2,    accent: 'text-violet-400' },
  { key: 'moods',        label: 'Moods',          desc: 'Restrict mood tags to this list',               icon: Sparkles,  accent: 'text-blue-400'   },
  { key: 'occasions',    label: 'Occasions',      desc: 'Only use these occasion categories',            icon: Clock,     accent: 'text-pink-400'   },
  { key: 'languages',    label: 'Languages',      desc: 'Restrict language classification to these',     icon: Globe,     accent: 'text-amber-400'  },
  { key: 'eras',         label: 'Eras',           desc: 'Limit era classification to these periods',     icon: Calendar,  accent: 'text-cyan-400'   },
  { key: 'energyLevels', label: 'Energy Levels',  desc: 'Restrict energy level values to this list',    icon: Zap,       accent: 'text-orange-400' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL!;
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('spotify_organizer_token') : null;
const authH = () => ({ Authorization: `Bearer ${getToken()}` } as Record<string, string>);

// ─── Inline tag adder ─────────────────────────────────────────────────────────

function TagInput({ suggestions, existing, onAdd }: {
  suggestions: string[]; existing: string[]; onAdd: (v: string) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const handle = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); setQ(''); }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const filtered = suggestions
    .filter(s => !existing.includes(s) && s.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded-full border border-dashed border-white/20 text-white/40 hover:text-white/80 hover:border-white/40 transition-all"
      >
        + Add
      </button>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <input
        ref={inputRef}
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && q.trim()) { onAdd(q.trim()); setOpen(false); setQ(''); }
          if (e.key === 'Escape')             { setOpen(false); setQ(''); }
        }}
        placeholder="Type or pick…"
        className="text-sm px-3 py-1 rounded-full bg-spotify-elevated text-white border border-spotify-green/50 outline-none w-36"
      />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-50 min-w-40 max-h-44 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onAdd(s); setOpen(false); setQ(''); }}
              className="w-full text-left text-sm px-4 py-2 hover:bg-white/10 text-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage(): JSX.Element {
  const router = useRouter();

  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig>({
    genres: [], moods: [], occasions: [], languages: [], eras: [], energyLevels: [],
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/'); return; }

    void fetch(`${API}/api/config`, { headers: authH() }).then(async res => {
      if (res.ok) {
        const data = await res.json() as { customTaxonomy?: Partial<TaxonomyConfig> | null };
        const t = data.customTaxonomy ?? {};
        setTaxonomy({
          genres:       t.genres       ?? [],
          moods:        t.moods        ?? [],
          occasions:    t.occasions    ?? [],
          languages:    t.languages    ?? [],
          eras:         t.eras         ?? [],
          energyLevels: t.energyLevels ?? [],
        });
      }
      setLoading(false);
    });
  }, [router]);

  function addValue(key: keyof TaxonomyConfig, value: string) {
    setTaxonomy(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key] : [...prev[key], value],
    }));
  }

  function removeValue(key: keyof TaxonomyConfig, value: string) {
    setTaxonomy(prev => ({ ...prev, [key]: prev[key].filter(v => v !== value) }));
  }

  function clearDimension(key: keyof TaxonomyConfig) {
    setTaxonomy(prev => ({ ...prev, [key]: [] }));
  }

  async function handleSave() {
    setSaveState('saving');
    try {
      const res = await fetch(`${API}/api/config`, {
        method: 'PUT',
        headers: { ...authH(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ customTaxonomy: taxonomy }),
      });
      setSaveState(res.ok ? 'saved' : 'error');
      if (res.ok) setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-spotify-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-black">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-spotify-text-subdued hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-sm">Classification Settings</h1>
            <p className="text-xs text-spotify-text-muted">Customize the categories Claude uses when classifying your library</p>
          </div>
          <div className="flex items-center gap-3">
            {saveState === 'saving' && (
              <span className="flex items-center gap-1.5 text-xs text-spotify-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </span>
            )}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-spotify-green">
                <CheckCircle2 className="w-3 h-3" /> Saved
              </span>
            )}
            {saveState === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" /> Save failed
              </span>
            )}
            <button
              onClick={() => { void handleSave(); }}
              disabled={saveState === 'saving'}
              className="flex items-center gap-2 bg-spotify-green hover:bg-spotify-green-bright disabled:opacity-50 text-black text-sm font-bold px-5 py-2 rounded-full transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Explanation banner */}
        <div className="bg-spotify-surface rounded-xl p-5 border border-white/5">
          <p className="text-sm text-spotify-text-subdued leading-relaxed">
            By default Claude picks any genre, mood, or occasion label it deems appropriate.
            Add values below to <strong className="text-white">constrain</strong> what it can pick for each dimension.
            Leave a section empty to let Claude choose freely.
          </p>
        </div>

        {/* Dimension sections */}
        {DIMS.map(({ key, label, desc, icon: Icon, accent }) => {
          const values = taxonomy[key];
          const suggestions = SUGGESTIONS[key];
          return (
            <div key={key} className="bg-spotify-surface rounded-xl p-6 border border-white/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${accent}`} />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white">{label}</h2>
                    <p className="text-xs text-spotify-text-muted">{desc}</p>
                  </div>
                </div>
                {values.length > 0 && (
                  <button
                    onClick={() => clearDimension(key)}
                    className="text-xs text-spotify-text-muted hover:text-red-400 transition-colors ml-4 flex-shrink-0"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {values.map(v => (
                  <span
                    key={v}
                    className="group inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-spotify-elevated text-white border border-white/10"
                  >
                    {v}
                    <button
                      onClick={() => removeValue(key, v)}
                      className="opacity-40 hover:opacity-100 transition-opacity ml-0.5"
                      title={`Remove "${v}"`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <TagInput
                  suggestions={suggestions}
                  existing={values}
                  onAdd={v => addValue(key, v)}
                />
                {values.length === 0 && (
                  <span className="text-xs text-spotify-text-muted italic">
                    No constraint — Claude chooses freely
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Save footer */}
        <div className="flex justify-end pb-4">
          <button
            onClick={() => { void handleSave(); }}
            disabled={saveState === 'saving'}
            className="flex items-center gap-2 bg-spotify-green hover:bg-spotify-green-bright disabled:opacity-50 text-black text-sm font-bold px-8 py-2.5 rounded-full transition-all"
          >
            {saveState === 'saving'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : 'Save Settings'
            }
          </button>
        </div>
      </main>
    </div>
  );
}
