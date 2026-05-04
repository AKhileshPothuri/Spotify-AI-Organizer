import prisma from '../db.js';
import { getValidToken, streamLikedSongs } from './spotify.js';

export interface SyncResult {
  synced: number;
}

/**
 * Fetches all liked songs from Spotify and upserts them into the Track table.
 * Runs to completion — call without await to run in the background.
 */
export async function syncLibrary(userId: string): Promise<SyncResult> {
  const accessToken = await getValidToken(userId);
  let synced = 0;

  for await (const page of streamLikedSongs(accessToken)) {
    await Promise.all(
      page.map(track => {
        const releaseYear = track.album.release_date
          ? parseInt(track.album.release_date.split('-')[0], 10)
          : null;

        return prisma.track.upsert({
          where: { userId_spotifyId: { userId, spotifyId: track.id } },
          update: {
            name: track.name,
            artist: track.artists[0]?.name ?? 'Unknown',
            album: track.album.name,
            releaseYear,
            durationMs: track.duration_ms,
            spotifyUrl: track.external_urls.spotify,
            imageUrl: track.album.images[0]?.url ?? null,
          },
          create: {
            userId,
            spotifyId: track.id,
            name: track.name,
            artist: track.artists[0]?.name ?? 'Unknown',
            album: track.album.name,
            releaseYear,
            durationMs: track.duration_ms,
            spotifyUrl: track.external_urls.spotify,
            imageUrl: track.album.images[0]?.url ?? null,
            spotifyGenres: [],
          },
        });
      }),
    );
    synced += page.length;
  }

  return { synced };
}
