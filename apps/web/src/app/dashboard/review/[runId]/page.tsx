'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Loader2, Music2, Globe, Zap,
  Calendar, Clock, Sparkles, ExternalLink, ListMusic,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GroupItem { value: string; count: number }

interface Summary {
  genre: GroupItem[];
  mood: GroupItem[];
  language: GroupItem[];
  occasion: GroupItem[];
  era: GroupItem[];
  energyLevel: GroupItem[];
}

interface ClassifiedTrack {
  id: string;
  genres: string[];
  moods: string[];
  language: string;
  occasions: string[];
  era: string | null;
  energyLevel: string;
  track: {
    name: string;
    artist: string;
    album: string;
    imageUrl: string | null;
    spotifyUrl: string | null;
    releaseYear: number | null;
  };
}

interface Run {
  id: string;
  status: string;
  totalTracks: number;
  processedTracks: number;
}

// ─── Dimension config ─────────────────────────────────────────────────────────

const DIMS = {
  genre:       { label: 'Genre',    Icon: Music2,    accent: 'text-violet-400', barBg: 'bg-violet-400',  panelBg: 'bg-violet-500/10' },
  mood:        { label: 'Mood',     Icon: Sparkles,  accent: 'text-blue-400',   barBg: 'bg-blue-400',    panelBg: 'bg-blue-500/10' },
  language:    { label: 'Language', Icon: Globe,     accent: 'text-amber-400',  barBg: 'bg-amber-400',   panelBg: 'bg-amber-500/10' },
  era:         { label: 'Era',      Icon: Calendar,  accent: 'text-cyan-400',   barBg: 'bg-cyan-400',    panelBg: 'bg-cyan-500/10' },
  energyLevel: { label: 'Energy',   Icon: Zap,       accent: 'text-orange-400', barBg: 'bg-orange-400',  panelBg: 'bg-orange-500/10' },
  occasion:    { label: 'Occasion', Icon: Clock,     accent: 'text-pink-400',   barBg: 'bg-pink-400',    panelBg: 'bg-pink-500/10' },
} as const;

type DimKey = keyof typeof DIMS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL!;
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('spotify_organizer_token') : null; }
function authHeaders() { return { Authorization: `Bearer ${getToken()}` } as Record<string, string>; }

// Tag chip colours
function langChip(lang: string) {
  if (!lang || lang === 'Unknown') return null;
  return <span key={lang} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">{lang}</span>;
}
function eraChip(era: string | null) {
  if (!era) return null;
  return <span key={era} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300">{era}</span>;
}
function energyChip(e: string) {
  if (!e) return null;
  const cls = e === 'High' ? 'bg-red-500/15 text-red-300' : e === 'Low' ? 'bg-green-500/15 text-green-300' : 'bg-yellow-500/15 text-yellow-300';
  return <span key={e} className={`text-[10px] px-1.5 py-0.5 rounded ${cls}`}>{e}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { runId } = useParams() as { runId: string };
  const router = useRouter();

  const [run, setRun]                       = useState<Run | null>(null);
  const [summary, setSummary]               = useState<Summary | null>(null);
  const [activeDim, setActiveDim]           = useState<DimKey>('genre');
  const [selectedGroup, setSelectedGroup]   = useState<string | null>(null);
  const [groupTracks, setGroupTracks]       = useState<ClassifiedTrack[]>([]);
  const [trackLoading, setTrackLoading]     = useState(false);
  const [approveState, setApproveState]     = useState<'idle' | 'loading' | 'done'>('idle');
  const [proposalCount, setProposalCount]   = useState<number | null>(null);

  // Load run + summary
  useEffect(() => {
    if (!runId) return;
    Promise.all([
      fetch(`${API}/api/classify/${runId}`, { headers: authHeaders() }),
      fetch(`${API}/api/classify/${runId}/summary`, { headers: authHeaders() }),
    ]).then(async ([runRes, sumRes]) => {
      if (!runRes.ok) { router.push('/dashboard'); return; }
      const runData = await runRes.json() as Run;
      setRun(runData);
      if (runData.status === 'APPROVED') setApproveState('done');
      if (sumRes.ok) setSummary(await sumRes.json() as Summary);
    });
  }, [runId, router]);

  // Load tracks when group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    setTrackLoading(true);
    setGroupTracks([]);
    fetch(
      `${API}/api/classify/${runId}/tracks?dimension=${activeDim}&value=${encodeURIComponent(selectedGroup)}&limit=200`,
      { headers: authHeaders() },
    )
      .then(r => r.json())
      .then((data: { items: ClassifiedTrack[] }) => { setGroupTracks(data.items ?? []); setTrackLoading(false); })
      .catch(() => setTrackLoading(false));
  }, [selectedGroup, activeDim, runId]);

  const handleDimChange = useCallback((dim: DimKey) => {
    setActiveDim(dim);
    setSelectedGroup(null);
    setGroupTracks([]);
  }, []);

  const handleSelectGroup = useCallback((value: string) => {
    setSelectedGroup(prev => (prev === value ? null : value));
    setGroupTracks([]);
  }, []);

  async function handleApprove() {
    setApproveState('loading');
    const res = await fetch(`${API}/api/classify/${runId}/approve`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json() as { proposalCount: number };
      setProposalCount(data.proposalCount);
      setApproveState('done');
      setRun(r => r ? { ...r, status: 'APPROVED' } : r);
    } else {
      setApproveState('idle');
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (!run || !summary) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-spotify-green animate-spin" />
      </div>
    );
  }

  const groups = summary[activeDim] ?? [];
  const { Icon, accent, barBg, panelBg } = DIMS[activeDim];
  const totalProposedPlaylists = Object.values(summary).reduce((acc, arr) => acc + arr.length, 0);
  const isApproved = approveState === 'done' || run.status === 'APPROVED';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-spotify-black flex flex-col">

      {/* ── Header ── */}
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
              {run.totalTracks.toLocaleString()} tracks · {totalProposedPlaylists} playlist groups
            </p>
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
              <span>{proposalCount ?? totalProposedPlaylists} playlists ready</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex gap-6 min-h-0">

        {/* Left: dimension tabs + group list */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">

          {/* Dimension grid */}
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(DIMS) as DimKey[]).map(dim => {
              const { label, Icon: DimIcon, accent: dimAccent } = DIMS[dim];
              const cnt = summary[dim]?.length ?? 0;
              const active = activeDim === dim;
              return (
                <button
                  key={dim}
                  onClick={() => handleDimChange(dim)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-150 ${
                    active
                      ? 'bg-spotify-elevated text-white'
                      : 'text-spotify-text-subdued hover:text-white hover:bg-spotify-surface'
                  }`}
                >
                  <DimIcon className={`w-3.5 h-3.5 ${active ? dimAccent : ''}`} />
                  <span className="text-[10px] font-bold leading-none">{label}</span>
                  <span className={`text-[9px] tabular-nums ${active ? 'text-spotify-text-subdued' : 'text-spotify-text-muted'}`}>{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* Group list */}
          <div className="overflow-y-auto flex-1 space-y-0.5 pr-1" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {groups.map(({ value, count }) => {
              const isSelected = selectedGroup === value;
              const pct = groups[0]?.count > 0 ? Math.round((count / groups[0].count) * 100) : 0;
              return (
                <button
                  key={value}
                  onClick={() => handleSelectGroup(value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                    isSelected ? 'bg-spotify-elevated' : 'hover:bg-spotify-surface'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-semibold truncate mr-2 ${isSelected ? 'text-white' : 'text-spotify-text-base group-hover:text-white'}`}>
                      {value}
                    </span>
                    <span className="text-xs text-spotify-text-muted flex-shrink-0">{count}</span>
                  </div>
                  <div className="h-px bg-spotify-highlight rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isSelected ? barBg : 'bg-spotify-text-muted'}`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: track panel */}
        <div className="flex-1 min-w-0 overflow-hidden">

          {/* Empty state */}
          {!selectedGroup && (
            <div className="h-full flex flex-col items-center justify-center text-center py-24">
              <div className={`w-16 h-16 ${panelBg} rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className={`w-7 h-7 ${accent}`} />
              </div>
              <p className="text-sm font-semibold text-spotify-text-subdued mb-1">
                Select a {DIMS[activeDim].label.toLowerCase()} group
              </p>
              <p className="text-xs text-spotify-text-muted max-w-xs leading-relaxed">
                Click any group on the left to preview the tracks that would go into that playlist.
              </p>
            </div>
          )}

          {/* Track list */}
          {selectedGroup && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-5 flex-shrink-0">
                <div className={`w-11 h-11 ${panelBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">{selectedGroup}</h2>
                  <p className="text-xs text-spotify-text-muted">
                    {trackLoading ? 'Loading…' : `${groupTracks.length} tracks`} · {DIMS[activeDim].label} playlist
                  </p>
                </div>
              </div>

              {trackLoading ? (
                <div className="flex items-center gap-2 text-spotify-text-muted py-8">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading tracks…</span>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 space-y-0.5" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  {groupTracks.map((ct, idx) => (
                    <div
                      key={ct.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-spotify-surface transition-colors group"
                    >
                      <span className="text-xs text-spotify-text-muted w-5 text-right flex-shrink-0 tabular-nums">
                        {idx + 1}
                      </span>

                      {ct.track.imageUrl ? (
                        <img
                          src={ct.track.imageUrl}
                          alt=""
                          className="w-9 h-9 rounded flex-shrink-0 object-cover bg-spotify-elevated"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-spotify-elevated flex items-center justify-center flex-shrink-0">
                          <ListMusic className="w-4 h-4 text-spotify-text-muted" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm font-semibold truncate">{ct.track.name}</p>
                          {ct.track.spotifyUrl && (
                            <a
                              href={ct.track.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0"
                            >
                              <ExternalLink className="w-3 h-3 text-spotify-text-subdued" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-spotify-text-subdued truncate mb-1">
                          {ct.track.artist}{ct.track.releaseYear ? ` · ${ct.track.releaseYear}` : ''}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {ct.genres.slice(0, 3).map(g => (
                            <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-spotify-elevated text-spotify-text-subdued">{g}</span>
                          ))}
                          {ct.moods.slice(0, 2).map(m => (
                            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">{m}</span>
                          ))}
                          {langChip(ct.language)}
                          {eraChip(ct.era)}
                          {energyChip(ct.energyLevel)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
