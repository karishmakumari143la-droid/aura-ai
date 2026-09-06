import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { recordAuditLog } from '../audit/auditLogger';
import { GitHubStore, PublicGitHubConnection } from '../storage/githubStore';
import { User } from '../../types';

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  isConfigured: boolean;
  configuredCallbackUrl?: string;
}

export interface OAuthStatePayload {
  userId: string;
  createdAt: number;
  expiresAt: number;
  returnTo?: string;
}

// Map for active CSRF states with TTL (10 minutes)
const pendingOAuthStates = new Map<string, OAuthStatePayload>();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Periodic cleanup of expired states
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingOAuthStates.entries()) {
    if (now > data.expiresAt) {
      pendingOAuthStates.delete(state);
    }
  }
}, 60 * 1000).unref();

/**
 * Reads GitHub OAuth configuration strictly from server environment.
 * NEVER exposes clientSecret to client or logs.
 */
export function getGitHubOAuthConfig(): GitHubOAuthConfig {
  const clientId = (process.env.GITHUB_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();
  const isConfigured = Boolean(
    clientId && 
    clientSecret && 
    clientId !== 'MY_GITHUB_CLIENT_ID' && 
    clientSecret !== 'MY_GITHUB_CLIENT_SECRET'
  );

  return {
    clientId,
    clientSecret,
    isConfigured,
    configuredCallbackUrl: process.env.GITHUB_CALLBACK_URL || (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/+$/, '')}/api/auth/github/callback` : undefined)
  };
}

/**
 * Determine exact callback URL based on environment or request context.
 */
export function resolveCallbackUrl(req?: Request): string {
  // 1. Explicit GITHUB_CALLBACK_URL takes top precedence
  if (process.env.GITHUB_CALLBACK_URL?.trim()) {
    return process.env.GITHUB_CALLBACK_URL.trim();
  }

  // 2. Production APP_URL environment variable
  const appUrl = (process.env.APP_URL || '').trim();
  if (appUrl && !appUrl.includes('MY_APP_URL')) {
    return `${appUrl.replace(/\/+$/, '')}/api/auth/github/callback`;
  }

  // 3. Dynamic resolution from request headers
  if (req) {
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto = (typeof protoHeader === 'string' ? protoHeader.split(',')[0].trim() : req.protocol) || 'http';
    const hostHeader = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    return `${proto}://${hostHeader}/api/auth/github/callback`;
  }

  // 4. Default local development callback URL
  return 'http://localhost:3000/api/auth/github/callback';
}

/**
 * Generate a cryptographically secure random OAuth state and associate with request user.
 */
export function generateOAuthState(userId: string, returnTo?: string): { state: string; expiresAt: number } {
  const state = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + STATE_TTL_MS;

  pendingOAuthStates.set(state, {
    userId,
    createdAt: now,
    expiresAt,
    returnTo: returnTo && returnTo.startsWith('/') ? returnTo : '/'
  });

  return { state, expiresAt };
}

/**
 * Validate and immediately consume state to prevent replay / CSRF attacks.
 */
export function validateAndConsumeOAuthState(state: string): {
  valid: boolean;
  userId?: string;
  returnTo?: string;
  reason?: string;
} {
  if (!state || typeof state !== 'string') {
    return { valid: false, reason: 'Missing state parameter' };
  }

  const payload = pendingOAuthStates.get(state);
  if (!payload) {
    return { valid: false, reason: 'OAuth state not found, forged, or already used' };
  }

  // Single-use guarantee: delete immediately
  pendingOAuthStates.delete(state);

  if (Date.now() > payload.expiresAt) {
    return { valid: false, reason: 'OAuth state has expired' };
  }

  return {
    valid: true,
    userId: payload.userId,
    returnTo: payload.returnTo
  };
}

/**
 * Clear all states (used for test resets).
 */
export function clearOAuthStates(): void {
  pendingOAuthStates.clear();
}

/**
 * Exchange GitHub authorization code for an access token server-side.
 */
export async function exchangeGitHubCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; tokenType: string; scope: string }> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'AURA-AI-Platform'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub token exchange HTTP error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
    error_uri?: string;
  };

  if (data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token exchange returned no access token');
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || 'bearer',
    scope: data.scope || ''
  };
}

/**
 * Fetch authenticated GitHub user profile using the granted access token.
 */
export async function fetchGitHubProfile(accessToken: string): Promise<{
  id: number | string;
  login: string;
  name: string;
  email: string | null;
  avatarUrl: string;
}> {
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AURA-AI-Platform'
    }
  });

  if (!userRes.ok) {
    const errorText = await userRes.text();
    throw new Error(`GitHub user profile fetch failed (${userRes.status}): ${errorText}`);
  }

  const profile = await userRes.json() as {
    id: number | string;
    login: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };

  let primaryEmail = profile.email || null;

  // If primary email is private in profile, attempt to fetch from user/emails endpoint
  if (!primaryEmail) {
    try {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AURA-AI-Platform'
        }
      });
      if (emailsRes.ok) {
        const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primary = emails.find(e => e.primary && e.verified) || emails.find(e => e.primary) || emails[0];
        if (primary) {
          primaryEmail = primary.email;
        }
      }
    } catch {
      // Non-fatal: email remains null or from profile
    }
  }

  return {
    id: profile.id,
    login: profile.login,
    name: profile.name || profile.login,
    email: primaryEmail,
    avatarUrl: profile.avatar_url || ''
  };
}

// -------------------------------------------------------------
// EXPRESS ROUTE HANDLERS
// -------------------------------------------------------------

export interface RequestUserResolver {
  getUserFromRequest: (req: Request) => User | undefined;
  getUserById: (id: string) => User | undefined;
}

/**
 * Build the complete GitHub OAuth authorization redirect URL.
 */
export function buildGitHubAuthUrl(clientId: string, state: string, redirectUri: string): string {
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'read:user user:email repo');
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

/**
 * Initiates GitHub OAuth by generating a state, storing it, and redirecting to GitHub.
 * GET /api/auth/github
 */
export async function handleGitHubAuth(
  req: Request,
  res: Response,
  resolver: RequestUserResolver
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.get('user-agent') || undefined;

  // 1. Verify user authentication
  const user = resolver.getUserFromRequest(req);
  if (!user) {
    recordAuditLog({
      event: 'GITHUB_OAUTH_INITIATE_FAILED',
      ip,
      userAgent,
      status: 'FAILURE',
      error: 'Authentication required'
    });
    res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be signed in to connect a GitHub account to AURA AI.'
    });
    return;
  }

  // 2. Verify server-side credentials
  const config = getGitHubOAuthConfig();
  if (!config.isConfigured) {
    recordAuditLog({
      event: 'GITHUB_OAUTH_INITIATE_FAILED',
      userId: user.id,
      ip,
      userAgent,
      status: 'FAILURE',
      error: 'NOT_CONFIGURED: Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET'
    });
    res.status(501).json({
      error: 'NOT_CONFIGURED',
      message: 'GitHub OAuth credentials (GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET) are not configured on this server.'
    });
    return;
  }

  // 3. Generate CSRF state and calculate redirect URI
  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
  const { state } = generateOAuthState(user.id, returnTo);
  const callbackUrl = resolveCallbackUrl(req);

  // Set CSRF verification cookie as defense in depth
  res.setHeader(
    'Set-Cookie',
    `aura_gh_state=${state}; HttpOnly; SameSite=Lax; Path=/api/auth/github; Max-Age=600`
  );

  // 4. Build GitHub Authorization URL
  const scopes = 'read:user user:email repo';
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  recordAuditLog({
    event: 'GITHUB_OAUTH_INITIATE',
    userId: user.id,
    ip,
    userAgent,
    status: 'SUCCESS',
    details: {
      callbackUrl,
      scopes
    }
  });

  res.redirect(authUrl.toString());
}

/**
 * Handles GitHub OAuth callback, validates state, exchanges code for token, and links account.
 * GET /api/auth/github/callback
 */
export async function handleGitHubCallback(
  req: Request,
  res: Response,
  resolver: RequestUserResolver
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.get('user-agent') || undefined;
  const acceptsJson = req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html');

  // 1. Check configuration
  const config = getGitHubOAuthConfig();
  if (!config.isConfigured) {
    recordAuditLog({
      event: 'GITHUB_OAUTH_CALLBACK_FAILED',
      ip,
      userAgent,
      status: 'FAILURE',
      error: 'NOT_CONFIGURED'
    });

    if (acceptsJson) {
      res.status(501).json({
        error: 'NOT_CONFIGURED',
        message: 'GitHub OAuth credentials are not configured on this server.'
      });
      return;
    }
    res.status(501).send(renderOAuthErrorHtml('GitHub OAuth is not configured on this server.'));
    return;
  }

  // 2. Handle GitHub authorization denial or explicit errors
  const { error, error_description, code, state } = req.query;

  if (error) {
    const errorMsg = typeof error_description === 'string' ? error_description : String(error);
    recordAuditLog({
      event: 'GITHUB_OAUTH_DENIED',
      ip,
      userAgent,
      status: 'FAILURE',
      error: errorMsg
    });

    if (acceptsJson) {
      res.status(400).json({
        error: 'GITHUB_OAUTH_DENIED',
        message: errorMsg
      });
      return;
    }
    res.status(400).send(renderOAuthErrorHtml(`GitHub authorization was denied: ${errorMsg}`));
    return;
  }

  // 3. Validate state parameter (CSRF validation)
  if (!state || typeof state !== 'string') {
    recordAuditLog({
      event: 'GITHUB_OAUTH_INVALID_STATE',
      ip,
      userAgent,
      status: 'FAILURE',
      error: 'Missing state parameter'
    });

    if (acceptsJson) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'OAuth state parameter is required.'
      });
      return;
    }
    res.status(400).send(renderOAuthErrorHtml('Missing OAuth state parameter.'));
    return;
  }

  const stateValidation = validateAndConsumeOAuthState(state);
  if (!stateValidation.valid || !stateValidation.userId) {
    recordAuditLog({
      event: 'GITHUB_OAUTH_INVALID_STATE',
      ip,
      userAgent,
      status: 'FAILURE',
      error: stateValidation.reason || 'Invalid or expired state'
    });

    if (acceptsJson) {
      res.status(403).json({
        error: 'INVALID_STATE',
        message: stateValidation.reason || 'Invalid or expired OAuth state parameter (CSRF protection).'
      });
      return;
    }
    res.status(403).send(renderOAuthErrorHtml(stateValidation.reason || 'Invalid or expired OAuth state. Please try again.'));
    return;
  }

  // 4. Validate user
  const user = resolver.getUserById(stateValidation.userId);
  if (!user) {
    recordAuditLog({
      event: 'GITHUB_OAUTH_CALLBACK_FAILED',
      userId: stateValidation.userId,
      ip,
      userAgent,
      status: 'FAILURE',
      error: 'Associated AURA user not found'
    });

    if (acceptsJson) {
      res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'AURA user account associated with this OAuth session no longer exists.'
      });
      return;
    }
    res.status(404).send(renderOAuthErrorHtml('User account not found.'));
    return;
  }

  // 5. Validate authorization code
  if (!code || typeof code !== 'string') {
    recordAuditLog({
      event: 'GITHUB_OAUTH_CALLBACK_FAILED',
      userId: user.id,
      ip,
      userAgent,
      status: 'FAILURE',
      error: 'Missing authorization code'
    });

    if (acceptsJson) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Authorization code is required.'
      });
      return;
    }
    res.status(400).send(renderOAuthErrorHtml('Missing authorization code from GitHub.'));
    return;
  }

  // 6. Exchange code for access token server-side
  const callbackUrl = resolveCallbackUrl(req);
  let tokenData: { accessToken: string; tokenType: string; scope: string };

  try {
    tokenData = await exchangeGitHubCodeForToken(
      code,
      callbackUrl,
      config.clientId,
      config.clientSecret
    );
  } catch (err: any) {
    const errorMsg = err?.message || 'Token exchange failed';
    recordAuditLog({
      event: 'GITHUB_OAUTH_TOKEN_EXCHANGE_FAILED',
      userId: user.id,
      ip,
      userAgent,
      status: 'FAILURE',
      error: errorMsg
    });

    if (acceptsJson) {
      res.status(400).json({
        error: 'TOKEN_EXCHANGE_FAILED',
        message: errorMsg
      });
      return;
    }
    res.status(400).send(renderOAuthErrorHtml(`Failed to exchange token with GitHub: ${errorMsg}`));
    return;
  }

  // 7. Fetch user profile from GitHub API
  let profile: { id: number | string; login: string; name: string; email: string | null; avatarUrl: string };

  try {
    profile = await fetchGitHubProfile(tokenData.accessToken);
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to fetch profile';
    recordAuditLog({
      event: 'GITHUB_OAUTH_USER_FETCH_FAILED',
      userId: user.id,
      ip,
      userAgent,
      status: 'FAILURE',
      error: errorMsg
    });

    if (acceptsJson) {
      res.status(502).json({
        error: 'PROFILE_FETCH_FAILED',
        message: errorMsg
      });
      return;
    }
    res.status(502).send(renderOAuthErrorHtml(`Failed to fetch GitHub profile: ${errorMsg}`));
    return;
  }

  // 8. Store the GitHub identity and encrypted token in persistent storage
  const savedRecord = await GitHubStore.saveConnection({
    userId: user.id,
    githubUserId: profile.id,
    githubUsername: profile.login,
    name: profile.name,
    email: profile.email || undefined,
    avatarUrl: profile.avatarUrl,
    accessToken: tokenData.accessToken,
    tokenType: tokenData.tokenType,
    scope: tokenData.scope
  });

  // Attach to in-memory user instance
  user.github = {
    id: profile.id,
    username: profile.login,
    name: profile.name,
    email: profile.email || undefined,
    avatarUrl: profile.avatarUrl,
    connectedAt: savedRecord.connectedAt,
    scope: tokenData.scope
  };

  // Clear state cookie
  res.setHeader(
    'Set-Cookie',
    'aura_gh_state=; HttpOnly; SameSite=Lax; Path=/api/auth/github; Max-Age=0'
  );

  recordAuditLog({
    event: 'GITHUB_OAUTH_CONNECTED',
    userId: user.id,
    ip,
    userAgent,
    status: 'SUCCESS',
    details: {
      githubUsername: profile.login,
      githubUserId: profile.id,
      scopes: tokenData.scope
    }
  });

  if (acceptsJson) {
    res.json({
      success: true,
      message: 'GitHub account connected successfully',
      github: {
        username: profile.login,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        connectedAt: savedRecord.connectedAt
      }
    });
    return;
  }

  // Render success page that closes popup or redirects
  res.send(renderOAuthSuccessHtml(profile.login, stateValidation.returnTo || '/'));
}

/**
 * Disconnects GitHub account for the authenticated user.
 * POST /api/auth/github/disconnect
 */
export async function handleGitHubDisconnect(
  req: Request,
  res: Response,
  resolver: RequestUserResolver
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.get('user-agent') || undefined;

  const user = resolver.getUserFromRequest(req);
  if (!user) {
    recordAuditLog({
      event: 'GITHUB_OAUTH_DISCONNECT_FAILED',
      ip,
      userAgent,
      status: 'FAILURE',
      error: 'Authentication required'
    });
    res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required to disconnect GitHub.'
    });
    return;
  }

  const hadConnection = await GitHubStore.deleteConnection(user.id);
  user.github = undefined;

  recordAuditLog({
    event: 'GITHUB_OAUTH_DISCONNECTED',
    userId: user.id,
    ip,
    userAgent,
    status: 'SUCCESS',
    details: { hadConnection }
  });

  res.json({
    success: true,
    message: hadConnection ? 'GitHub account disconnected successfully.' : 'No active GitHub connection was found.'
  });
}

/**
 * Returns GitHub connection status for the authenticated user.
 * GET /api/auth/github/status
 */
export async function handleGitHubStatus(
  req: Request,
  res: Response,
  resolver: RequestUserResolver
): Promise<void> {
  const config = getGitHubOAuthConfig();

  if (!config.isConfigured) {
    res.json({
      configured: false,
      connected: false,
      status: 'NOT_CONFIGURED',
      message: 'GitHub OAuth credentials (GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET) are not configured on this server.'
    });
    return;
  }

  const user = resolver.getUserFromRequest(req);
  if (!user) {
    res.json({
      configured: true,
      connected: false,
      status: 'unauthenticated',
      message: 'No active user session.'
    });
    return;
  }

  const connection = await GitHubStore.getConnection(user.id);
  if (!connection) {
    res.json({
      configured: true,
      connected: false,
      status: 'needs_setup',
      message: 'GitHub is not connected for this user account.'
    });
    return;
  }

  res.json({
    configured: true,
    connected: true,
    status: 'connected',
    connection: {
      githubUserId: connection.githubUserId,
      githubUsername: connection.githubUsername,
      name: connection.name,
      email: connection.email,
      avatarUrl: connection.avatarUrl,
      scope: connection.scope,
      connectedAt: connection.connectedAt
    }
  });
}

// -------------------------------------------------------------
// HTML RENDER HELPERS (Zero Slop / Clean Minimalist Design)
// -------------------------------------------------------------

function renderOAuthSuccessHtml(username: string, returnUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AURA AI — GitHub Connected</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090D16;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #0F172A;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34D399;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; margin: 0 0 8px 0; color: #FFFFFF; }
    p { font-size: 14px; color: #94A3B8; line-height: 1.5; margin: 0 0 24px 0; }
    .btn {
      display: inline-block;
      background: #06B6D4;
      color: #04131E;
      font-weight: 700;
      font-size: 14px;
      padding: 10px 24px;
      border-radius: 8px;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn:hover { background: #22D3EE; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Connection Established</div>
    <h1>GitHub Connected</h1>
    <p>Your GitHub account <strong>@${escapeHtml(username)}</strong> has been securely linked to AURA AI.</p>
    <a href="${escapeHtml(returnUrl)}" class="btn" id="return-btn">Return to AURA AI</a>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'GITHUB_OAUTH_SUCCESS', username: '${escapeHtml(username)}' }, '*');
      setTimeout(function() { window.close(); }, 1200);
    } else {
      setTimeout(function() { window.location.href = '${escapeHtml(returnUrl)}'; }, 1500);
    }
  </script>
</body>
</html>`;
}

function renderOAuthErrorHtml(errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AURA AI — Connection Error</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090D16;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #0F172A;
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #F87171;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; margin: 0 0 8px 0; color: #FFFFFF; }
    p { font-size: 14px; color: #94A3B8; line-height: 1.5; margin: 0 0 24px 0; }
    .btn {
      display: inline-block;
      background: #334155;
      color: #F8FAFC;
      font-weight: 600;
      font-size: 14px;
      padding: 10px 24px;
      border-radius: 8px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Connection Failed</div>
    <h1>Unable to Connect GitHub</h1>
    <p>${escapeHtml(errorMessage)}</p>
    <a href="/" class="btn">Return to App</a>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
