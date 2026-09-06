import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface GitHubConnectionRecord {
  userId: string;
  githubUserId: number | string;
  githubUsername: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  encryptedAccessToken: string;
  iv: string;
  tag: string;
  tokenType: string;
  scope: string;
  connectedAt: string;
  updatedAt: string;
}

export interface PublicGitHubConnection {
  githubUserId: number | string;
  githubUsername: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  scope: string;
  connectedAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'github-connections.json');

// Memory cache of active connections keyed by userId
const connectionsByUserId = new Map<string, GitHubConnectionRecord>();

// Derive a 32-byte encryption key for token vaulting
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.GITHUB_CLIENT_SECRET || 'aura-ai-secure-vault-token-key-32b!';
  return crypto.scryptSync(secret, 'aura-salt-github-oauth-vault', 32);
}

function encryptToken(token: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag
  };
}

function decryptToken(encrypted: string, ivHex: string, tagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[GitHubStore] Failed to create data directory:', err);
  }
}

function loadConnections(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(CONNECTIONS_FILE)) {
      const raw = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
      const list: GitHubConnectionRecord[] = JSON.parse(raw);
      connectionsByUserId.clear();
      for (const item of list) {
        if (item.userId) {
          connectionsByUserId.set(item.userId, item);
        }
      }
    }
  } catch (err) {
    console.warn('[GitHubStore] Could not load persisted connections, starting empty:', err);
  }
}

loadConnections();

function persistConnections(): void {
  try {
    ensureDataDir();
    const array = Array.from(connectionsByUserId.values());
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.error('[GitHubStore] Failed to persist connections to disk:', err);
  }
}

export class GitHubStore {
  /**
   * Save or update a user's GitHub connection with an encrypted access token.
   */
  static async saveConnection(data: {
    userId: string;
    githubUserId: number | string;
    githubUsername: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    accessToken: string;
    tokenType?: string;
    scope?: string;
  }): Promise<GitHubConnectionRecord> {
    const { encrypted, iv, tag } = encryptToken(data.accessToken);
    const now = new Date().toISOString();
    const existing = connectionsByUserId.get(data.userId);

    const record: GitHubConnectionRecord = {
      userId: data.userId,
      githubUserId: data.githubUserId,
      githubUsername: data.githubUsername,
      name: data.name || data.githubUsername,
      email: data.email,
      avatarUrl: data.avatarUrl,
      encryptedAccessToken: encrypted,
      iv,
      tag,
      tokenType: data.tokenType || 'bearer',
      scope: data.scope || 'read:user user:email repo',
      connectedAt: existing?.connectedAt || now,
      updatedAt: now
    };

    connectionsByUserId.set(data.userId, record);
    persistConnections();
    return record;
  }

  /**
   * Get public connection information synchronously from memory cache.
   */
  static getConnectionSync(userId: string): PublicGitHubConnection | null {
    const record = connectionsByUserId.get(userId);
    if (!record) return null;

    return {
      githubUserId: record.githubUserId,
      githubUsername: record.githubUsername,
      name: record.name,
      email: record.email,
      avatarUrl: record.avatarUrl,
      scope: record.scope,
      connectedAt: record.connectedAt,
      updatedAt: record.updatedAt
    };
  }

  /**
   * Get public connection information (no secret or token data).
   */
  static async getConnection(userId: string): Promise<PublicGitHubConnection | null> {
    const record = connectionsByUserId.get(userId);
    if (!record) return null;

    return {
      githubUserId: record.githubUserId,
      githubUsername: record.githubUsername,
      name: record.name,
      email: record.email,
      avatarUrl: record.avatarUrl,
      scope: record.scope,
      connectedAt: record.connectedAt,
      updatedAt: record.updatedAt
    };
  }

  /**
   * Retrieve decrypted access token for server-side GitHub API actions.
   */
  static async getDecryptedAccessToken(userId: string): Promise<string | null> {
    const record = connectionsByUserId.get(userId);
    if (!record) return null;
    try {
      return decryptToken(record.encryptedAccessToken, record.iv, record.tag);
    } catch (err) {
      console.error(`[GitHubStore] Failed to decrypt token for user ${userId}:`, err);
      return null;
    }
  }

  /**
   * Delete GitHub connection for a user (disconnect).
   */
  static async deleteConnection(userId: string): Promise<boolean> {
    const had = connectionsByUserId.delete(userId);
    if (had) {
      persistConnections();
    }
    return had;
  }

  /**
   * Check if a user has an active connected GitHub account.
   */
  static hasConnection(userId: string): boolean {
    return connectionsByUserId.has(userId);
  }

  static async isGitHubConnected(userId: string): Promise<boolean> {
    return connectionsByUserId.has(userId);
  }

  /**
   * Clear all records (used for test isolation).
   */
  static async clearAll(): Promise<void> {
    connectionsByUserId.clear();
    try {
      if (fs.existsSync(CONNECTIONS_FILE)) {
        fs.unlinkSync(CONNECTIONS_FILE);
      }
    } catch (err) {
      console.error('[GitHubStore] Failed to unlink file:', err);
    }
  }
}
