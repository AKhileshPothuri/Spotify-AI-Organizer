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

/** Returns the Spotify user ID for the authenticated user. */
export async function getSpotifyUserId(accessToken: string): Promise<string> {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Spotify /me failed: ${res.status}`);
  const data = await res.json() as { id: string };
  return data.id;
}

/** Creates an empty Spotify playlist and returns its ID and URL. */
export async function createSpotifyPlaylist(
  accessToken: string,
  spotifyUserId: string,
  name: string,
  description: string,
): Promise<{ id: string; url: string }> {
  const res = await fetch(`https://api.spotify.com/v1/users/${spotifyUserId}/playlists`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, public: false }),
  });
  if (!res.ok) throw new Error(`Create playlist failed: ${res.status}`);
  const data = await res.json() as { id: string; external_urls: { spotify: string } };
  return { id: data.id, url: data.external_urls.spotify };
}

/** Adds up to 100 tracks per batch to a Spotify playlist (Spotify API limit). */
export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  spotifyTrackIds: string[],
): Promise<void> {
  const uris = spotifyTrackIds.map(id => `spotify:track:${id}`);
  // Spotify allows max 100 URIs per request
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: batch }),
    });
    if (!res.ok) throw new Error(`Add tracks failed: ${res.status}`);
  }
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
