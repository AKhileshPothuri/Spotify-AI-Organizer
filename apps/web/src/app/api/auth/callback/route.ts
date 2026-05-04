import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const base = new URL('/', request.url);

  if (error || !code) {
    base.searchParams.set('error', error ?? 'missing_code');
    return NextResponse.redirect(base);
  }

  const verifier = request.cookies.get('pkce_verifier')?.value;
  if (!verifier) {
    base.searchParams.set('error', 'missing_verifier');
    return NextResponse.redirect(base);
  }

  // Exchange code using PKCE verifier — no client_secret needed or sent
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      code_verifier: verifier,
    }).toString(),
  });

  if (!tokenRes.ok) {
    base.searchParams.set('error', 'token_exchange_failed');
    return NextResponse.redirect(base);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Hand tokens to the Fastify backend (server-to-server)
  const apiRes = await fetch(`${process.env.API_BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    }),
  });

  if (!apiRes.ok) {
    base.searchParams.set('error', 'account_setup_failed');
    return NextResponse.redirect(base);
  }

  const { token } = (await apiRes.json()) as { token: string };

  const dashboard = new URL('/dashboard', request.url);
  dashboard.searchParams.set('token', token);

  const response = NextResponse.redirect(dashboard);
  // Clear the PKCE verifier cookie
  response.cookies.delete('pkce_verifier');
  return response;
}
