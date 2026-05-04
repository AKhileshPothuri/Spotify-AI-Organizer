import { Brain, CheckCircle, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-spotify-black" />
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-spotify-green/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-3xl mx-auto text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-full bg-spotify-green flex items-center justify-center shadow-lg shadow-spotify-green/30">
            <SpotifyIcon className="w-5 h-5 fill-black" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Spotify AI Organizer</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-5">
          Your music,{' '}
          <span className="text-spotify-green">intelligently organized</span>
        </h1>

        <p className="text-lg text-spotify-text-subdued mb-10 max-w-xl mx-auto leading-relaxed">
          AI classifies your liked songs by genre, mood, language, and occasion.
          Review every suggestion — playlists are created only after your approval.
        </p>

        {/* CTA */}
        <a
          href="/api/auth/login"
          className="inline-flex items-center gap-3 bg-spotify-green hover:bg-spotify-green-bright text-black font-bold px-8 py-4 rounded-full text-sm tracking-wide transition-all duration-150 shadow-lg shadow-spotify-green/20 hover:scale-[1.03]"
        >
          <SpotifyIcon className="w-5 h-5 fill-current" />
          Connect with Spotify
        </a>

        {/* Feature cards — Spotify surface style */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {[
            {
              icon: Brain,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
              title: 'AI Classification',
              body: 'Claude, GPT-4o, or Gemini classifies your tracks by genre, mood, language, occasion, era, and energy.',
            },
            {
              icon: CheckCircle,
              color: 'text-spotify-green',
              bg: 'bg-spotify-green/10',
              title: 'Human-in-the-Loop',
              body: 'Review every AI suggestion before anything is saved. Edit, merge, or reject — you stay in control.',
            },
            {
              icon: Zap,
              color: 'text-sky-400',
              bg: 'bg-sky-500/10',
              title: 'Auto-Sync',
              body: 'Keep playlists fresh as you like new songs — automatically or on demand.',
            },
          ].map(({ icon: Icon, color, bg, title, body }) => (
            <div
              key={title}
              className="bg-spotify-surface hover:bg-spotify-elevated rounded-card p-5 transition-colors duration-150 cursor-default"
            >
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <h3 className="font-bold text-sm text-white mb-2">{title}</h3>
              <p className="text-xs text-spotify-text-subdued leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
