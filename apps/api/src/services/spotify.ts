import prisma from '../db.js';
import { config } from '../config/index.js';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; release_date: string; images: { url: string }[] };
  duration_ms: number;
  external_urls: { spotify: string };
}

/** Returns a valid access token, refreshing via Spotify if expired. */
export async function getValidToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const hasExpired = user.expiresAt && user.expiresAt < Math.floor(Date.now() / 1000) + 60;
  if (!hasExpired) return user.accessToken;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.refreshToken,
      client_id: config.SPOTIFY_CLIENT_ID,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const data = await res.json() as { access_token: string; expires_in: number };

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  });

  return data.access_token;
}

/** Fetches the total liked-songs count from Spotify without downloading all tracks. */
export async function fetchLikedSongsCount(accessToken: string): Promise<number> {
  const res = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Spotify /me/tracks failed: ${res.status}`);
  const data = await res.json() as { total: number };
  return data.total;
}

/** Yields all liked songs page by page (50 per page). */
export async function* streamLikedSongs(
  accessToken: string,
): AsyncGenerator<SpotifyTrack[]> {
  let url: string | null = 'https://api.spotify.com/v1/me/tracks?limit=50&market=from_token';

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Spotify page fetch failed: ${res.status}`);

    const page = await res.json() as {
      items: { track: SpotifyTrack }[];
      next: string | null;
    };

    yield page.items.map(i => i.track).filter(Boolean);
    url = page.next;
  }
}
