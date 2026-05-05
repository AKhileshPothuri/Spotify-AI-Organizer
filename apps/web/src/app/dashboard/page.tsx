'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Brain, Eye, ListMusic, LogOut, RefreshCw,
  Library, Activity, Layers, Sparkles, ChevronRight,
  CheckCircle2, Loader2, AlertCircle, Settings,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface JwtPayload {
  userId: string;
  spotifyId: string;
  displayName?: string;
  exp: number;
}

interface Stats {
  trackCount: number;
  spotifyTotal: number | null;
  runCount: number;
  playlistCount: number;
  latestRun: { id: string; status: string; processedTracks: number; totalTracks: number } | null;
}

interface ClassifyRun {
  id: string;
  status: string;
  totalTracks: number;
  processedTracks: number;
  error?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return typeof window !== 'undefined'
    ? localStorage.getItem('spotify_organizer_token')
    : null;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-spotify-elevated rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-spotify-green rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:           { label: 'Queued',      cls: 'text-yellow-400 bg-yellow-400/10' },
    CLASSIFYING:       { label: 'Classifying', cls: 'text-blue-400 bg-blue-400/10' },
    AWAITING_APPROVAL: { label: 'Ready',       cls: 'text-spotify-green bg-spotify-green/10' },
    DONE:              { label: 'Done',         cls: 'text-spotify-green bg-spotify-green/10' },
    FAILED:            { label: 'Failed',       cls: 'text-red-400 bg-red-400/10' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'text-spotify-text-subdued bg-spotify-elevated' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [user, setUser]       = useState<JwtPayload | null>(null);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [run, setRun]         = useState<ClassifyRun | null>(null);
  const [classifying, setClassifying] = useState(false);

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) { router.push(`/?error=${error}`); return; }

    const raw = token ?? localStorage.getItem('spotify_organizer_token');
    if (!raw) { router.push('/'); return; }

    try {
      const payload = JSON.parse(atob(raw.split('.')[1])) as JwtPayload;
      if (payload.exp < Date.now() / 1000) {
        localStorage.removeItem('spotify_organizer_token');
        router.push('/');
        return;
      }
      if (token) {
        localStorage.setItem('spotify_organizer_token', token);
        window.history.replaceState({}, '', '/dashboard');
      }
      setUser(payload);
    } catch {
      router.push('/');
    }
  }, [searchParams, router]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/library/stats`,
      { headers: authHeaders() },
    );
    if (res.ok) {
      const data = await res.json() as Stats;
      setStats(data);
      if (data.latestRun) {
        setRun(prev => prev ?? (data.latestRun as ClassifyRun));
      }
    }
  }, []);

  useEffect(() => {
    if (user) void fetchStats();
  }, [user, fetchStats]);

  // ── Sync ──────────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true);
    setSyncCount(null);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/library/sync`, {
      method: 'POST',
      headers: authHeaders(),
    });

    // Poll DB track count until it stabilises
    syncRef.current = setInterval(() => {
      void (async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/library/sync/status`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          const { trackCount } = await res.json() as { trackCount: number };
          setSyncCount(trackCount);
        }
      })();
    }, 2000);

    // Stop polling after 5 minutes max; final stats refresh
    setTimeout(() => {
      void (async () => {
        if (syncRef.current) clearInterval(syncRef.current);
        setSyncing(false);
        await fetchStats();
      })();
    }, 5 * 60 * 1000);
  }

  // Stop sync poll when count matches Spotify total
  useEffect(() => {
    if (
      syncing &&
      syncCount !== null &&
      stats?.spotifyTotal !== null &&
      syncCount >= (stats?.spotifyTotal ?? 0)
    ) {
      if (syncRef.current) clearInterval(syncRef.current);
      setSyncing(false);
      void fetchStats();
    }
  }, [syncing, syncCount, stats, fetchStats]);

  // ── Classify ──────────────────────────────────────────────────────────────

  async function handleClassify() {
    setClassifying(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classify/run`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'unclassified' }),
    });

    if (!res.ok) {
      setClassifying(false);
      const { error } = await res.json() as { error: string };
      alert(error);
      return;
    }

    const { runId } = await res.json() as { runId: string };

    // Poll run status
    pollRef.current = setInterval(() => {
      void (async () => {
        const r = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/classify/${runId}`,
          { headers: authHeaders() },
        );
        if (r.ok) {
          const data = await r.json() as ClassifyRun;
          setRun(data);
          if (['AWAITING_APPROVAL', 'DONE', 'FAILED'].includes(data.status)) {
            if (pollRef.current) clearInterval(pollRef.current);
            setClassifying(false);
            void fetchStats();
          }
        }
      })();
    }, 3000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (syncRef.current) clearInterval(syncRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-spotify-green animate-pulse" />
      </div>
    );
  }

  const initials = (user.displayName ?? 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const firstName = user.displayName?.split(' ')[0] ?? 'there';
  const syncedCount = syncCount ?? stats?.trackCount ?? 0;
  const spotifyTotal = stats?.spotifyTotal ?? null;
  const syncDone = !syncing && syncedCount > 0;
  const runActive = run && ['PENDING', 'FETCHING_TRACKS', 'ENRICHING', 'CLASSIFYING'].includes(run.status);

  return (
    <div className="min-h-screen bg-spotify-black">

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center">
              <SpotifyIcon className="w-4 h-4 fill-black" />
            </div>
            <span className="font-bold text-sm tracking-tight">Spotify AI Organizer</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-spotify-elevated rounded-full pl-1 pr-3 py-1">
              <div className="w-7 h-7 rounded-full bg-spotify-green/20 border border-spotify-green/30 flex items-center justify-center text-[11px] font-bold text-spotify-green select-none">
                {initials}
              </div>
              <span className="text-sm font-semibold hidden sm:block">{user.displayName}</span>
            </div>
            <a
              href="/settings"
              className="p-2 rounded-full text-spotify-text-subdued hover:text-white hover:bg-spotify-elevated transition-colors"
              title="Classification settings"
            >
              <Settings className="w-4 h-4" />
            </a>
            <button
              onClick={() => { localStorage.removeItem('spotify_organizer_token'); router.push('/'); }}
              className="p-2 rounded-full text-spotify-text-subdued hover:text-white hover:bg-spotify-elevated transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Good {timeOfDay()}, {firstName}
          </h1>
          <p className="text-spotify-text-subdued text-sm">
            Your Spotify library is connected and ready to organize.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            {
              icon: Library,
              label: 'Liked Songs',
              value: spotifyTotal !== null ? spotifyTotal.toLocaleString() : '—',
              sub: syncedCount > 0 ? `${syncedCount.toLocaleString()} synced to DB` : 'not yet synced',
            },
            {
              icon: Activity,
              label: 'Classification Runs',
              value: stats?.runCount?.toString() ?? '0',
              sub: 'completed',
            },
            {
              icon: Layers,
              label: 'Playlists Created',
              value: stats?.playlistCount?.toString() ?? '0',
              sub: 'via this app',
            },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-spotify-surface hover:bg-spotify-elevated rounded-card p-5 transition-colors duration-150">
              <div className="flex items-center gap-2 text-spotify-text-subdued text-xs font-semibold mb-3 uppercase tracking-wider">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <div className="text-4xl font-bold mb-0.5 tabular-nums">{value}</div>
              <div className="text-xs text-spotify-text-muted">{sub}</div>
            </div>
          ))}
        </div>

        {/* Action section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

          {/* Sync card */}
          <div className="bg-spotify-surface rounded-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-spotify-green" />
                  <h2 className="font-bold text-white">Sync Library</h2>
                </div>
                <p className="text-sm text-spotify-text-subdued">
                  Fetch your latest liked songs from Spotify into the database.
                </p>
              </div>
              {syncedCount > 0 && !syncing && (
                <CheckCircle2 className="w-5 h-5 text-spotify-green flex-shrink-0 mt-0.5" />
              )}
            </div>

            {syncing && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-xs text-spotify-text-subdued">
                  <span>Syncing…</span>
                  <span>
                    {syncCount ?? 0}
                    {spotifyTotal ? ` / ${spotifyTotal.toLocaleString()}` : ''} tracks
                  </span>
                </div>
                <ProgressBar value={syncCount ?? 0} max={spotifyTotal ?? 100} />
              </div>
            )}

            {syncedCount > 0 && !syncing && (
              <p className="text-xs text-spotify-text-muted mb-4">
                {syncedCount.toLocaleString()} tracks in database
                {spotifyTotal && syncedCount < spotifyTotal
                  ? ` · ${spotifyTotal - syncedCount} new since last sync`
                  : ' · up to date'}
              </p>
            )}

            <button
              onClick={() => { void handleSync(); }}
              disabled={syncing}
              className="flex items-center gap-2 bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-bold px-5 py-2.5 rounded-full transition-all duration-150"
            >
              {syncing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</>
                : <><RefreshCw className="w-4 h-4" /> {syncedCount > 0 ? 'Re-sync' : 'Sync Now'}</>
              }
            </button>
          </div>

          {/* Classify card */}
          <div className="bg-spotify-surface rounded-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <h2 className="font-bold text-white">Classify with AI</h2>
                </div>
                <p className="text-sm text-spotify-text-subdued">
                  Run Claude across your synced tracks to generate genre, mood, language, and occasion tags.
                </p>
              </div>
              {run?.status === 'AWAITING_APPROVAL' && (
                <CheckCircle2 className="w-5 h-5 text-spotify-green flex-shrink-0 mt-0.5" />
              )}
            </div>

            {run && (
              <div className="mb-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-spotify-text-subdued">
                    {run.processedTracks.toLocaleString()} / {run.totalTracks.toLocaleString()} tracks
                  </span>
                  <RunStatusBadge status={run.status} />
                </div>
                <ProgressBar value={run.processedTracks} max={run.totalTracks} />
                {['AWAITING_APPROVAL', 'APPROVED', 'CREATING_PLAYLISTS', 'DONE'].includes(run.status) && (
                  <a
                    href={`/dashboard/review/${run.id}`}
                    className="flex items-center gap-1 text-xs text-spotify-green hover:text-spotify-green-bright transition-colors"
                  >
                    {run.status === 'DONE' ? 'Playlists live · View results'
                      : run.status === 'CREATING_PLAYLISTS' ? 'Pushing to Spotify…'
                      : run.status === 'APPROVED' ? 'Approved · Push to Spotify'
                      : 'Classification complete · Review results'}
                    <ChevronRight className="w-3 h-3" />
                  </a>
                )}
                {run.status === 'FAILED' && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {run.error ?? 'An error occurred'}
                  </p>
                )}
              </div>
            )}

            {!syncDone && !run && (
              <p className="text-xs text-spotify-text-muted mb-4">
                Sync your library first to enable classification.
              </p>
            )}

            <button
              onClick={() => { void handleClassify(); }}
              disabled={!syncDone || classifying || !!runActive}
              className="flex items-center gap-2 bg-spotify-green hover:bg-spotify-green-bright disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-bold px-5 py-2.5 rounded-full transition-all duration-150"
            >
              {classifying || runActive
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Classifying…</>
                : <><Sparkles className="w-4 h-4" /> {run?.status === 'AWAITING_APPROVAL' ? 'Re-classify' : 'Start Classification'}</>
              }
            </button>
          </div>
        </div>

        {/* Coming next */}
        <p className="text-xs font-bold text-spotify-text-subdued uppercase tracking-widest mb-3">
          Coming next
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Review Dashboard — live when there's a run to review */}
          {run && ['AWAITING_APPROVAL', 'APPROVED', 'CREATING_PLAYLISTS', 'DONE'].includes(run.status) ? (
            <a
              href={`/dashboard/review/${run.id}`}
              className="group bg-spotify-surface hover:bg-spotify-elevated rounded-card p-5 transition-colors duration-150"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-sky-500/10 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-sky-400" />
                </div>
                <span className="text-[11px] font-semibold text-spotify-green bg-spotify-green/10 px-2 py-0.5 rounded-full">
                  Ready
                </span>
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Review Dashboard</h3>
              <p className="text-xs text-spotify-text-subdued leading-relaxed mb-3">
                Inspect AI proposals, browse tracks by genre, mood, language and more, then approve.
              </p>
              <div className="flex items-center gap-1 text-xs text-sky-400 group-hover:text-sky-300 transition-colors">
                <span>Open review</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
            </a>
          ) : (
            <div className="group bg-spotify-surface hover:bg-spotify-elevated rounded-card p-5 transition-colors duration-150 cursor-default">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-sky-500/10 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-sky-400" />
                </div>
                <span className="text-[11px] font-semibold text-spotify-text-muted bg-spotify-elevated px-2 py-0.5 rounded-full">v0.3</span>
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Review Dashboard</h3>
              <p className="text-xs text-spotify-text-subdued leading-relaxed mb-3">
                Inspect AI proposals, edit track assignments, and approve before anything is saved to Spotify.
              </p>
              <div className="flex items-center gap-1 text-xs text-spotify-text-muted group-hover:text-spotify-text-subdued transition-colors">
                <span>Classify your library first</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
            </div>
          )}

          {/* Create Playlists — live when run is approved */}
          {run && ['APPROVED', 'CREATING_PLAYLISTS', 'DONE'].includes(run.status) ? (
            <a
              href={`/dashboard/review/${run.id}`}
              className="group bg-spotify-surface hover:bg-spotify-elevated rounded-card p-5 transition-colors duration-150"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-spotify-green/10 rounded-lg flex items-center justify-center">
                  <ListMusic className="w-4 h-4 text-spotify-green" />
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  run.status === 'DONE'
                    ? 'text-spotify-green bg-spotify-green/10'
                    : run.status === 'CREATING_PLAYLISTS'
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'text-spotify-green bg-spotify-green/10'
                }`}>
                  {run.status === 'DONE' ? 'Live' : run.status === 'CREATING_PLAYLISTS' ? 'Pushing…' : 'Ready'}
                </span>
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Create Playlists</h3>
              <p className="text-xs text-spotify-text-subdued leading-relaxed mb-3">
                {run.status === 'DONE'
                  ? `${stats?.playlistCount ?? 0} playlist${stats?.playlistCount !== 1 ? 's' : ''} are live on your Spotify account.`
                  : 'Push your approved proposals to Spotify as real playlists with one click.'}
              </p>
              <div className="flex items-center gap-1 text-xs text-spotify-green group-hover:text-spotify-green-bright transition-colors">
                <span>{run.status === 'DONE' ? 'View playlists' : 'Go to review'}</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
            </a>
          ) : (
            <div className="group bg-spotify-surface hover:bg-spotify-elevated rounded-card p-5 transition-colors duration-150 cursor-default">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-spotify-green/10 rounded-lg flex items-center justify-center">
                  <ListMusic className="w-4 h-4 text-spotify-green" />
                </div>
                <span className="text-[11px] font-semibold text-spotify-text-muted bg-spotify-elevated px-2 py-0.5 rounded-full">v0.4</span>
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Create Playlists</h3>
              <p className="text-xs text-spotify-text-subdued leading-relaxed mb-3">
                One click turns approved proposals into real Spotify playlists in your account.
              </p>
              <div className="flex items-center gap-1 text-xs text-spotify-text-muted group-hover:text-spotify-text-subdued transition-colors">
                <span>Approve classifications first</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-10 flex items-center gap-2 text-xs text-spotify-text-muted">
          <div className="w-1.5 h-1.5 rounded-full bg-spotify-green" />
          <span>Connected as</span>
          <span className="text-spotify-text-subdued font-medium">{user.displayName}</span>
          <span>·</span>
          <span>{user.spotifyId}</span>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-spotify-green animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
