import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

const SCOPES = [
  'user-library-read',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
  'user-read-email',
].join(' ');

export function GET() {
  // PKCE: generate a random verifier and its SHA-256 challenge
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  const response = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`,
  );

  // Store verifier in httpOnly cookie so the callback route can finish the exchange
  response.cookies.set('pkce_verifier', verifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes — long enough to complete the login
    path: '/',
  });

  return response;
}
