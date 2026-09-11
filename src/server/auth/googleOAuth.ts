import { Request, Response } from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const STATE_TTL_MS = 10 * 60 * 1000;

interface GoogleOAuthState {
  createdAt: number;
  expiresAt: number;
  returnTo: string;
}

const pendingGoogleStates = new Map<string, GoogleOAuthState>();

setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingGoogleStates.entries()) {
    if (now > data.expiresAt) {
      pendingGoogleStates.delete(state);
    }
  }
}, 60_000).unref();

export function getGoogleOAuthConfig() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

  return {
    clientId,
    clientSecret,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

export function resolveGoogleCallbackUrl(req: Request): string {
  const explicit = (process.env.GOOGLE_CALLBACK_URL || '').trim();
  if (explicit) return explicit;

  const appUrl = (process.env.APP_URL || '').trim();
  if (appUrl) {
    return `${appUrl.replace(/\/+$/, '')}/api/auth/google/callback`;
  }

  const protoHeader = req.headers['x-forwarded-proto'];
  const proto =
    (typeof protoHeader === 'string'
      ? protoHeader.split(',')[0].trim()
      : req.protocol) || 'http';

  const host =
    req.headers['x-forwarded-host'] ||
    req.get('host') ||
    'localhost:3000';

  return `${proto}://${host}/api/auth/google/callback`;
}

export function createGoogleOAuthClient(req: Request): OAuth2Client {
  const config = getGoogleOAuthConfig();

  return new OAuth2Client(
    config.clientId,
    config.clientSecret,
    resolveGoogleCallbackUrl(req)
  );
}

export function createGoogleOAuthState(returnTo = '/'): string {
  const state = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  pendingGoogleStates.set(state, {
    createdAt: now,
    expiresAt: now + STATE_TTL_MS,
    returnTo: returnTo.startsWith('/') ? returnTo : '/',
  });

  return state;
}

export function validateAndConsumeGoogleState(state: string): {
  valid: boolean;
  returnTo?: string;
  reason?: string;
} {
  if (!state) {
    return { valid: false, reason: 'Missing OAuth state' };
  }

  const payload = pendingGoogleStates.get(state);

  // Consume immediately: state is single-use even if expired/invalid.
  pendingGoogleStates.delete(state);

  if (!payload) {
    return { valid: false, reason: 'Invalid or already-used OAuth state' };
  }

  if (Date.now() > payload.expiresAt) {
    return { valid: false, reason: 'OAuth state expired' };
  }

  return {
    valid: true,
    returnTo: payload.returnTo,
  };
}

export function getGoogleAuthorizationUrl(req: Request): string {
  const client = createGoogleOAuthClient(req);
  const state = createGoogleOAuthState('/');

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
}

export async function exchangeGoogleCode(
  req: Request,
  code: string
) {
  if (!code) {
    throw new Error('Missing Google authorization code');
  }

  const client = createGoogleOAuthClient(req);
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error('Google did not return an ID token');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: getGoogleOAuthConfig().clientId,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub) {
    throw new Error('Google ID token is missing subject');
  }

  if (!payload.email) {
    throw new Error('Google account email is missing');
  }

  if (payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }

  return {
    googleSub: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name?.trim() || payload.email.split('@')[0],
    avatarUrl: payload.picture || '',
  };
}

export function googleSetupResponse(res: Response) {
  return res.status(503).json({
    status: 'NOT_CONFIGURED',
    error: 'GOOGLE_AUTH_SETUP_REQUIRED',
    message: 'Google OAuth is not configured on this server.',
  });
}
