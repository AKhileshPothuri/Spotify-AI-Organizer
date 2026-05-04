'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

interface JwtPayload {
  userId: string;
  spotifyId: string;
  displayName?: string;
  exp: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.push(`/?error=${error}`);
      return;
    }

    const raw = token ?? localStorage.getItem('spotify_organizer_token');
    if (!raw) {
      router.push('/');
      return;
    }

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

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  function logout() {
    localStorage.removeItem('spotify_organizer_token');
    router.push('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="mb-2 text-5xl font-bold">🎵 Spotify AI Organizer</h1>
        <p className="mb-8 text-lg text-green-600 font-medium">
          Welcome, {user.displayName ?? user.spotifyId}!
        </p>

        <div className="mt-8 grid grid-cols-3 gap-8">
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="mb-2 font-semibold">🎯 Classify</h3>
            <p className="text-sm text-gray-600">AI-powered classification</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="mb-2 font-semibold">👀 Review</h3>
            <p className="text-sm text-gray-600">Human-in-the-loop approval</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="mb-2 font-semibold">✅ Create</h3>
            <p className="text-sm text-gray-600">Auto-create playlists</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-10 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Logout
        </button>
      </div>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>}>
      <DashboardContent />
    </Suspense>
  );
}
