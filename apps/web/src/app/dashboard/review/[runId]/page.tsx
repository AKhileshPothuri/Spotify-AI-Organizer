'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Loader2, Music2, Globe, Zap,
  Calendar, Clock, Sparkles, ExternalLink, ListMusic, X,
  AlertCircle, Search,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GroupItem { value: string; count: number }
interface Summary {
  genre: GroupItem[]; mood: GroupItem[]; language: GroupItem[];
  occasion: GroupItem[]; era: GroupItem[]; energyLevel: GroupItem[];
}
interface ClassifiedTrack {
  id: string;
  genres: string[];
  moods: string[];
  language: string;
  occasions: string[];
  era: string | null;
  energyLevel: string;
  _removing?: boolean;
  track: {
    name: string; artist: string; album: string;
    imageUrl: string | null; spotifyUrl: string | null; releaseYear: number | null;
  };
}
interface Run { id: string; status: string; totalTracks: number; processedTracks: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const DIMS = {
  genre:       { label: 'Genre',    Icon: Music2,    accent: 'text-violet-400', barBg: 'bg-violet-400',  panelBg: 'bg-violet-500/10' },
  mood:        { label: 'Mood',     Icon: Sparkles,  accent: 'text-blue-400',   barBg: 'bg-blue-400',    panelBg: 'bg-blue-500/10' },
  language:    { label: 'Language', Icon: Globe,     accent: 'text-amber-400',  barBg: 'bg-amber-400',   panelBg: 'bg-amber-500/10' },
  era:         { label: 'Era',      Icon: Calendar,  accent: 'text-cyan-400',   barBg: 'bg-cyan-400',    panelBg: 'bg-cyan-500/10' },
  energyLevel: { label: 'Energy',   Icon: Zap,       accent: 'text-orange-400', barBg: 'bg-orange-400',  panelBg: 'bg-orange-500/10' },
  occasion:    { label: 'Occasion', Icon: Clock,     accent: 'text-pink-400',   barBg: 'bg-pink-400',    panelBg: 'bg-pink-500/10' },
} as const;

type DimKey = keyof typeof DIMS;

const ERA_OPTIONS = ['Pre-80s', '80s', '90s', '2000s', '2010s', '2020s'];
const ENERGY_OPTIONS = ['Low', 'Medium', 'High'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL!;
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('spotify_organizer_token') : null;
const authH = () => ({ Authorization: `Bearer ${getToken()}` } as Record<string, string>);

function getDimValues(ct: ClassifiedTrack, dim: DimKey): string[] {
  if (dim === 'genre')       return ct.genres;
  if (dim === 'mood')        return ct.moods;
  if (dim === 'occasion')    return ct.occasions;
  if (dim === 'language')    return ct.language ? [ct.language] : [];
  if (dim === 'era')         return ct.era ? [ct.era] : [];
  if (dim === 'energyLevel') return ct.energyLevel ? [ct.energyLevel] : [];
  return [];
}

function energyCls(e: string) {
  return e === 'High' ? 'bg-red-500/15 text-red-300'
    : e === 'Low'  ? 'bg-green-500/15 text-green-300'
    : 'bg-yellow-500/15 text-yellow-300';
}

// ─── Chip: removable (for array fields) ──────────────────────────────────────

function RemovableChip({ value, cls, onRemove }: { value: string; cls: string; onRemove: () => void }) {
  return (
    <span className={`group/chip inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded select-none cursor-default ${cls}`}>
      {value}
      <button
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover/chip:opacity-60 hover:!opacity-100 transition-opacity ml-0.5 flex-shrink-0"
        title={`Remove "${value}"`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ─── Chip: click-to-change (for single-value fields) ─────────────────────────

function SelectChip({ value, options, cls, onChange }: {
  value: string; options: string[]; cls: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer select-none hover:brightness-110 transition-all ${cls}`}
        title="Click to change"
      >
        {value} <span className="opacity-50">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-[#282828] border border-white/10 rounded-lg shadow-2xl z-50 min-w-28 max-h-48 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left text-xs px-3 py-1.5 hover:bg-white/10 transition-colors ${opt === value ? 'text-spotify-green font-semibold' : 'text-white'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tag adder: "+" button → inline autocomplete ─────────────────────────────

function TagAdder({ suggestions, existing, placeholder = 'Add…', onAdd }: {
  suggestions: string[]; existing: string[]; placeholder?: string; onAdd: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const handle = (e: MouseEvent) => { if (!containerRef.current?.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const filtered = suggestions
    .filter(s => !existing.includes(s) && s.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8);

  if (!open) {
    return (
      <button
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center justify-center w-4 h-4 rounded border border-dashed border-white/20 text-white/30 hover:text-white/70 hover:border-white/50 transition-all text-[11px] flex-shrink-0"
        title="Add tag"
      >+</button>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <input
        ref={inputRef}
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && q.trim()) { onAdd(q.trim()); setOpen(false); setQ(''); }
          if (e.key === 'Escape')            { setOpen(false); setQ(''); }
        }}
        placeholder={placeholder}
        className="text-[10px] px-1.5 py-0.5 rounded bg-spotify-elevated text-white border border-spotify-green/60 outline-none w-24"
      />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-0.5 bg-[#282828] border border-white/10 rounded-lg shadow-2xl z-50 min-w-36 max-h-40 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onAdd(s); setOpen(false); setQ(''); }}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-white/10 text-white transition-colors"
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

export default function ReviewPage() {
  const { runId } = useParams() as { runId: string };
  const router = useRouter();

  const [run, setRun]                     = useState<Run | null>(null);
  const [summary, setSummary]             = useState<Summary | null>(null);
  const [activeDim, setActiveDim]         = useState<DimKey>('genre');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupTracks, setGroupTracks]     = useState<ClassifiedTrack[]>([]);
  const [trackLoading, setTrackLoading]   = useState(false);
  const [trackSearch, setTrackSearch]     = useState('');
  const [approveState, setApproveState]   = useState<'idle' | 'loading' | 'done'>('idle');
  const [proposalCount, setProposalCount] = useState<number | null>(null);
  const [saveState, setSaveState]         = useState<'saved' | 'saving' | 'error'>('saved');
  const [changeCount, setChangeCount]     = useState(0);

  // Refs to avoid stale closures in debounced save
  const groupTracksRef  = useRef<ClassifiedTrack[]>([]);
  const activeDimRef    = useRef<DimKey>('genre');
  const selectedGrpRef  = useRef<string | null>(null);
  const pendingRef      = useRef<Map<string, ClassifiedTrack>>(new Map());
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { groupTracksRef.current  = groupTracks;  }, [groupTracks]);
  useEffect(() => { activeDimRef.current    = activeDim;    }, [activeDim]);
  useEffect(() => { selectedGrpRef.current  = selectedGroup; }, [selectedGroup]);

  // ── Load run + summary ────────────────────────────────────────────────────
  useEffect(() => {
    if (!runId) return;
    Promise.all([
      fetch(`${API}/api/classify/${runId}`,         { headers: authH() }),
      fetch(`${API}/api/classify/${runId}/summary`, { headers: authH() }),
    ]).then(async ([runRes, sumRes]) => {
      if (!runRes.ok) { router.push('/dashboard'); return; }
      const runData = await runRes.json() as Run;
      setRun(runData);
      if (runData.status === 'APPROVED') setApproveState('done');
      if (sumRes.ok) setSummary(await sumRes.json() as Summary);
    });
  }, [runId, router]);

  // ── Load tracks for selected group ───────────────────────────────────────
  useEffect(() => {
    if (!selectedGroup) return;
    setTrackLoading(true);
    setGroupTracks([]);
    setTrackSearch('');
    fetch(
      `${API}/api/classify/${runId}/tracks?dimension=${activeDim}&value=${encodeURIComponent(selectedGroup)}&limit=200`,
      { headers: authH() },
    )
      .then(r => r.json())
      .then((data: { items: ClassifiedTrack[] }) => { setGroupTracks(data.items ?? []); setTrackLoading(false); })
      .catch(() => setTrackLoading(false));
  }, [selectedGroup, activeDim, runId]);

  // ── Cleanup timer on unmount ──────────────────────────────────────────────
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // ── Auto-save (debounced, reads from ref — no stale closure) ─────────────
  const flushSaves = useCallback(async () => {
    const entries = [...pendingRef.current.entries()];
    if (!entries.length) { setSaveState('saved'); return; }
    pendingRef.current.clear();

    try {
      await Promise.all(entries.map(([id, ct]) =>
        fetch(`${API}/api/classify/${runId}/classifications/${id}`, {
          method: 'PATCH',
          headers: { ...authH(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genres: ct.genres, moods: ct.moods, language: ct.language,
            occasions: ct.occasions, era: ct.era, energyLevel: ct.energyLevel,
          }),
        })
      ));
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [runId]);

  function scheduleSave(id: string, ct: ClassifiedTrack) {
    pendingRef.current.set(id, ct);
    setSaveState('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushSaves, 800);
    setChangeCount(n => n + 1);
  }

  // Remove track from list if it no longer belongs to the current group
  function maybeFilterOut(tracks: ClassifiedTrack[], id: string): ClassifiedTrack[] {
    const dim   = activeDimRef.current;
    const group = selectedGrpRef.current;
    if (!group) return tracks;
    return tracks.filter(ct => ct.id !== id || getDimValues(ct, dim).includes(group));
  }

  // ── Edit handlers ─────────────────────────────────────────────────────────

  function removeArrayTag(id: string, field: 'genres' | 'moods' | 'occasions', value: string) {
    const track = groupTracksRef.current.find(ct => ct.id === id);
    if (!track) return;
    const updated: ClassifiedTrack = { ...track, [field]: (track[field] as string[]).filter(v => v !== value) };
    setGroupTracks(prev => maybeFilterOut(prev.map(ct => ct.id === id ? updated : ct), id));
    scheduleSave(id, updated);
  }

  function addArrayTag(id: string, field: 'genres' | 'moods' | 'occasions', value: string) {
    const track = groupTracksRef.current.find(ct => ct.id === id);
    if (!track) return;
    const existing = track[field] as string[];
    if (existing.includes(value)) return;
    const updated: ClassifiedTrack = { ...track, [field]: [...existing, value] };
    setGroupTracks(prev => prev.map(ct => ct.id === id ? updated : ct));
    scheduleSave(id, updated);
  }

  function changeSingleField(id: string, field: 'language' | 'era' | 'energyLevel', value: string) {
    const track = groupTracksRef.current.find(ct => ct.id === id);
    if (!track) return;
    const updated: ClassifiedTrack = { ...track, [field]: value };
    setGroupTracks(prev => maybeFilterOut(prev.map(ct => ct.id === id ? updated : ct), id));
    scheduleSave(id, updated);
  }

  const handleDimChange = useCallback((dim: DimKey) => {
    setActiveDim(dim);
    setSelectedGroup(null);
    setGroupTracks([]);
    setTrackSearch('');
  }, []);

  async function handleApprove() {
    setApproveState('loading');
    const res = await fetch(`${API}/api/classify/${runId}/approve`, { method: 'POST', headers: authH() });
    if (res.ok) {
      const data = await res.json() as { proposalCount: number };
      setProposalCount(data.proposalCount);
      setApproveState('done');
      setRun(r => r ? { ...r, status: 'APPROVED' } : r);
    } else {
      setApproveState('idle');
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!run || !summary) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-spotify-green animate-spin" />
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const groups     = summary[activeDim] ?? [];
  const { Icon, accent, barBg, panelBg } = DIMS[activeDim];
  const totalGroups = Object.values(summary).reduce((n, a) => n + a.length, 0);
  const isApproved  = approveState === 'done' || run.status === 'APPROVED';

  // Autocomplete sources from already-loaded summary
  const genreSugs    = summary.genre.map(g => g.value);
  const moodSugs     = summary.mood.map(m => m.value);
  const occSugs      = summary.occasion.map(o => o.value);
  const langOptions  = [...new Set([...summary.language.map(l => l.value),
    'English', 'Tamil', 'Hindi', 'Korean', 'Spanish', 'French', 'Portuguese', 'Instrumental'])];
  const eraOptions   = [...new Set([...summary.era.map(e => e.value), ...ERA_OPTIONS])];

  // Local search filter (pure, no debounce needed)
  const visibleTracks = trackSearch
    ? groupTracks.filter(ct =>
        ct.track.name.toLowerCase().includes(trackSearch.toLowerCase()) ||
        ct.track.artist.toLowerCase().includes(trackSearch.toLowerCase()))
    : groupTracks;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-spotify-black flex flex-col">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">

          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-spotify-text-subdued hover:text-white transition-colors text-sm flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm">Classification Review</h1>
            <p className="text-xs text-spotify-text-muted">
              {run.totalTracks.toLocaleString()} tracks · {totalGroups} groups · click any tag to edit
            </p>
          </div>

          {/* Auto-save indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs flex-shrink-0">
            {saveState === 'saving' && (
              <><Loader2 className="w-3 h-3 animate-spin text-spotify-text-muted" />
                <span className="text-spotify-text-muted">Saving…</span></>
            )}
            {saveState === 'saved' && changeCount > 0 && (
              <><CheckCircle2 className="w-3 h-3 text-spotify-green" />
                <span className="text-spotify-text-subdued">{changeCount} change{changeCount !== 1 ? 's' : ''} saved</span></>
            )}
            {saveState === 'error' && (
              <><AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-red-400">Save failed — retry</span></>
            )}
          </div>

          {!isApproved && (
            <button
              onClick={handleApprove}
              disabled={approveState === 'loading'}
              className="flex items-center gap-2 bg-spotify-green hover:bg-spotify-green-bright disabled:opacity-50 text-black text-sm font-bold px-5 py-2 rounded-full transition-all flex-shrink-0"
            >
              {approveState === 'loading'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</>
                : <><CheckCircle2 className="w-4 h-4" /> Approve All</>
              }
            </button>
          )}

          {isApproved && (
            <div className="flex items-center gap-2 text-spotify-green text-sm font-semibold flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">{proposalCount ?? totalGroups} playlists ready</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex gap-6">

        {/* ── Left: dimension nav + group list ── */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">

          {/* Dimension grid */}
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(DIMS) as DimKey[]).map(dim => {
              const { label, Icon: DI, accent: da } = DIMS[dim];
              const cnt = summary[dim]?.length ?? 0;
              const active = activeDim === dim;
              return (
                <button
                  key={dim}
                  onClick={() => handleDimChange(dim)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    active ? 'bg-spotify-elevated text-white' : 'text-spotify-text-subdued hover:text-white hover:bg-spotify-surface'
                  }`}
                >
                  <DI className={`w-3.5 h-3.5 ${active ? da : ''}`} />
                  <span className="text-[10px] font-bold leading-none">{label}</span>
                  <span className={`text-[9px] tabular-nums ${active ? 'text-spotify-text-subdued' : 'text-spotify-text-muted'}`}>{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* Group list */}
          <div className="overflow-y-auto space-y-0.5 pr-0.5" style={{ maxHeight: 'calc(100vh - 188px)' }}>
            {groups.map(({ value, count }) => {
              const isSel = selectedGroup === value;
              const pct   = groups[0]?.count > 0 ? Math.round((count / groups[0].count) * 100) : 0;
              return (
                <button
                  key={value}
                  onClick={() => setSelectedGroup(p => p === value ? null : value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${isSel ? 'bg-spotify-elevated' : 'hover:bg-spotify-surface'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-semibold truncate mr-2 ${isSel ? 'text-white' : 'text-spotify-text-base group-hover:text-white'}`}>
                      {value}
                    </span>
                    <span className="text-xs text-spotify-text-muted flex-shrink-0">{count}</span>
                  </div>
                  <div className="h-px bg-spotify-highlight rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isSel ? barBg : 'bg-spotify-text-muted'}`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: track panel ── */}
        <div className="flex-1 min-w-0 flex flex-col">

          {!selectedGroup && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-24">
              <div className={`w-16 h-16 ${panelBg} rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className={`w-7 h-7 ${accent}`} />
              </div>
              <p className="text-sm font-semibold text-spotify-text-subdued mb-1">
                Select a {DIMS[activeDim].label.toLowerCase()} group
              </p>
              <p className="text-xs text-spotify-text-muted max-w-xs leading-relaxed">
                Browse and edit track classifications before approving. Hover a tag to remove it, click <strong>+</strong> to add, or click single-value tags to change them.
              </p>
            </div>
          )}

          {selectedGroup && (
            <>
              {/* Panel header + search */}
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <div className={`w-11 h-11 ${panelBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg leading-tight">{selectedGroup}</h2>
                  <p className="text-xs text-spotify-text-muted">
                    {trackLoading ? 'Loading…' : `${groupTracks.length} track${groupTracks.length !== 1 ? 's' : ''}`}
                    {trackSearch && ` · ${visibleTracks.length} matching`}
                    {' · '}{DIMS[activeDim].label}
                  </p>
                </div>
                {/* Search */}
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-spotify-text-muted pointer-events-none" />
                  <input
                    value={trackSearch}
                    onChange={e => setTrackSearch(e.target.value)}
                    placeholder="Search tracks…"
                    className="text-xs pl-7 pr-3 py-1.5 rounded-full bg-spotify-elevated border border-white/10 text-white placeholder:text-spotify-text-muted outline-none focus:border-white/25 w-36 transition-all"
                  />
                </div>
              </div>

              {trackLoading ? (
                <div className="flex items-center gap-2 text-spotify-text-muted py-8">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading tracks…</span>
                </div>
              ) : (
                <div className="overflow-y-auto space-y-0.5" style={{ maxHeight: 'calc(100vh - 210px)' }}>
                  {visibleTracks.map((ct, idx) => (
                    <div
                      key={ct.id}
                      className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-spotify-surface transition-colors group"
                    >
                      {/* Index */}
                      <span className="text-xs text-spotify-text-muted w-5 text-right flex-shrink-0 mt-1 tabular-nums">
                        {idx + 1}
                      </span>

                      {/* Album art */}
                      {ct.track.imageUrl ? (
                        <img src={ct.track.imageUrl} alt="" className="w-10 h-10 rounded flex-shrink-0 object-cover bg-spotify-elevated mt-0.5" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-spotify-elevated flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ListMusic className="w-4 h-4 text-spotify-text-muted" />
                        </div>
                      )}

                      {/* Track info + editable tags */}
                      <div className="flex-1 min-w-0">
                        {/* Title + Spotify link */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm font-semibold truncate">{ct.track.name}</p>
                          {ct.track.spotifyUrl && (
                            <a
                              href={ct.track.spotifyUrl} target="_blank" rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity flex-shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3 text-spotify-text-subdued" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-spotify-text-subdued truncate mb-2">
                          {ct.track.artist}{ct.track.releaseYear ? ` · ${ct.track.releaseYear}` : ''}
                        </p>

                        {/* ── Genre row ── */}
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {ct.genres.map(g => (
                            <RemovableChip key={g} value={g}
                              cls="bg-spotify-elevated text-spotify-text-subdued hover:bg-spotify-highlight"
                              onRemove={() => removeArrayTag(ct.id, 'genres', g)} />
                          ))}
                          <TagAdder suggestions={genreSugs} existing={ct.genres} placeholder="genre…"
                            onAdd={v => addArrayTag(ct.id, 'genres', v)} />
                        </div>

                        {/* ── Mood row ── */}
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {ct.moods.map(m => (
                            <RemovableChip key={m} value={m}
                              cls="bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                              onRemove={() => removeArrayTag(ct.id, 'moods', m)} />
                          ))}
                          <TagAdder suggestions={moodSugs} existing={ct.moods} placeholder="mood…"
                            onAdd={v => addArrayTag(ct.id, 'moods', v)} />
                        </div>

                        {/* ── Single-value + occasions row ── */}
                        <div className="flex flex-wrap items-center gap-1">
                          {ct.language && ct.language !== 'Unknown' && (
                            <SelectChip value={ct.language} options={langOptions}
                              cls="bg-amber-500/15 text-amber-300"
                              onChange={v => changeSingleField(ct.id, 'language', v)} />
                          )}
                          {ct.era && (
                            <SelectChip value={ct.era} options={eraOptions}
                              cls="bg-cyan-500/15 text-cyan-300"
                              onChange={v => changeSingleField(ct.id, 'era', v)} />
                          )}
                          {ct.energyLevel && (
                            <SelectChip value={ct.energyLevel} options={ENERGY_OPTIONS}
                              cls={energyCls(ct.energyLevel)}
                              onChange={v => changeSingleField(ct.id, 'energyLevel', v)} />
                          )}
                          {ct.occasions.map(o => (
                            <RemovableChip key={o} value={o}
                              cls="bg-pink-500/10 text-pink-300 hover:bg-pink-500/20"
                              onRemove={() => removeArrayTag(ct.id, 'occasions', o)} />
                          ))}
                          <TagAdder suggestions={occSugs} existing={ct.occasions} placeholder="occasion…"
                            onAdd={v => addArrayTag(ct.id, 'occasions', v)} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {visibleTracks.length === 0 && !trackLoading && (
                    <div className="text-center py-12 text-spotify-text-muted text-sm">
                      {trackSearch ? 'No tracks match your search.' : 'All tracks have been moved to other groups.'}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
