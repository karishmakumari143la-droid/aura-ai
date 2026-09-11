import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { User, MemoryItem, ProjectQuotaStatus, WebsiteProject } from '../../types';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'aura.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency and resilience
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_owner INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS credentials (
    user_id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS google_identities (
    google_sub TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_google_identities_user
    ON google_identities(user_id);

  CREATE INDEX IF NOT EXISTS idx_google_identities_email
    ON google_identities(email);

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_active TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    last_user_message TEXT,
    last_aura_response TEXT,
    pending_clarification TEXT,
    website_business TEXT,
    website_name TEXT,
    website_requirements TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    files_json TEXT NOT NULL,
    verification_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'RUNNING',
    priority TEXT NOT NULL DEFAULT 'normal',
    nodes_json TEXT NOT NULL,
    edges_json TEXT NOT NULL,
    messages_json TEXT NOT NULL,
    logs_json TEXT NOT NULL,
    error TEXT,
    result TEXT,
    verification TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tool_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROCESSING',
    response_json TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memories (
    memory_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.9,
    source TEXT NOT NULL DEFAULT 'user_instruction',
    tags_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    risk TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'ask_each_time',
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, permission),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS executions (
    execution_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    input_json TEXT NOT NULL,
    output_json TEXT,
    status TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    event TEXT NOT NULL,
    user_id TEXT,
    ip TEXT,
    details_json TEXT NOT NULL,
    status TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_idempotency ON tasks(idempotency_key);
  CREATE INDEX IF NOT EXISTS idx_tool_idempotency_user
    ON tool_idempotency(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_tool_idempotency_status
    ON tool_idempotency(status, created_at);
  CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
  CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
`);

console.log('[SQLite] Persistent AURA Database initialized successfully at:', DB_PATH);

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  businessType: string;
  status: string;
  files: Array<{ name: string; path: string; content: string; language: string; size: string }>;
  verification?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationContext {
  id: string;
  userId: string;
  language: 'en' | 'hi' | 'hinglish';
  lastUserMessage?: string;
  lastAuraResponse?: string;
  pendingClarification?: string;
  websiteBusiness?: string;
  websiteName?: string;
  websiteRequirements?: string[];
  updatedAt: string;
}

export class AuraDB {
  // ==================== USERS & AUTH ====================
  static getUserById(id: string): User | null {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
      isOwner: Boolean(row.is_owner)
    };
  }

  static getUserByEmail(email: string): User | null {
    const cleanEmail = email.toLowerCase().trim();
    const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
      isOwner: Boolean(row.is_owner)
    };
  }

  static getAllUsers(): User[] {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as any[];
    return rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
      isOwner: Boolean(row.is_owner)
    }));
  }

  static upsertUser(user: User): void {
    db.prepare(`
      INSERT INTO users (id, email, name, role, created_at, is_owner)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        role = excluded.role,
        is_owner = excluded.is_owner
    `).run(
      user.id,
      user.email.toLowerCase().trim(),
      user.name,
      user.role,
      user.createdAt || new Date().toISOString(),
      user.isOwner ? 1 : 0
    );
  }

  static setCredential(userId: string, passwordHash: string): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO credentials (user_id, password_hash, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        password_hash = excluded.password_hash,
        updated_at = excluded.updated_at
    `).run(userId, passwordHash, now);
  }

  static getCredential(userId: string): string | null {
    const row = db.prepare('SELECT password_hash FROM credentials WHERE user_id = ?').get(userId) as any;
    return row ? row.password_hash : null;
  }

  // ==================== GOOGLE IDENTITY ====================
  static getUserByGoogleSub(googleSub: string): User | null {
    const row = db.prepare(`
      SELECT u.*
      FROM google_identities g
      JOIN users u ON g.user_id = u.id
      WHERE g.google_sub = ?
    `).get(googleSub) as any;

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
      isOwner: Boolean(row.is_owner)
    };
  }

  static createGoogleIdentity(
    googleSub: string,
    userId: string,
    email: string
  ): void {
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO google_identities
        (google_sub, user_id, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      googleSub,
      userId,
      email.toLowerCase().trim(),
      now,
      now
    );
  }

  static getGoogleIdentityByUserId(userId: string): {
    googleSub: string;
    email: string;
  } | null {
    const row = db.prepare(`
      SELECT google_sub, email
      FROM google_identities
      WHERE user_id = ?
    `).get(userId) as any;

    if (!row) return null;

    return {
      googleSub: row.google_sub,
      email: row.email
    };
  }

  // ==================== SESSIONS ====================
  static createSession(token: string, userId: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000): void {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + maxAgeMs).toISOString();
    db.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at, last_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(token, userId, now, expiresAt, now);
  }

  static getSessionUser(token: string): User | null {
    if (!token) return null;
    const now = new Date().toISOString();
    const row = db.prepare(`
      SELECT u.* FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as any;

    if (!row) return null;

    // Update last_active timestamp asynchronously
    try {
      db.prepare('UPDATE sessions SET last_active = ? WHERE token = ?').run(now, token);
    } catch {}

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
      isOwner: Boolean(row.is_owner)
    };
  }

  static deleteSession(token: string): void {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  static pruneExpiredSessions(): void {
    const now = new Date().toISOString();
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  }

  // ==================== CONVERSATION CONTEXT ====================
  static getConversationContext(userId: string): ConversationContext {
    const row = db.prepare('SELECT * FROM conversations WHERE user_id = ?').get(userId) as any;
    if (row) {
      return {
        id: row.id,
        userId: row.user_id,
        language: (row.language as any) || 'en',
        lastUserMessage: row.last_user_message,
        lastAuraResponse: row.last_aura_response,
        pendingClarification: row.pending_clarification,
        websiteBusiness: row.website_business,
        websiteName: row.website_name,
        websiteRequirements: row.website_requirements ? JSON.parse(row.website_requirements) : [],
        updatedAt: row.updated_at
      };
    }

    const newContext: ConversationContext = {
      id: 'conv-' + Math.random().toString(36).substring(2, 9),
      userId,
      language: 'en',
      updatedAt: new Date().toISOString()
    };
    AuraDB.saveConversationContext(newContext);
    return newContext;
  }

  static saveConversationContext(ctx: ConversationContext): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO conversations (id, user_id, language, last_user_message, last_aura_response, pending_clarification, website_business, website_name, website_requirements, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        language = excluded.language,
        last_user_message = excluded.last_user_message,
        last_aura_response = excluded.last_aura_response,
        pending_clarification = excluded.pending_clarification,
        website_business = excluded.website_business,
        website_name = excluded.website_name,
        website_requirements = excluded.website_requirements,
        updated_at = excluded.updated_at
    `).run(
      ctx.id,
      ctx.userId,
      ctx.language || 'en',
      ctx.lastUserMessage || null,
      ctx.lastAuraResponse || null,
      ctx.pendingClarification || null,
      ctx.websiteBusiness || null,
      ctx.websiteName || null,
      ctx.websiteRequirements ? JSON.stringify(ctx.websiteRequirements) : '[]',
      now
    );
  }

  // ==================== TASK COMPATIBILITY ====================

  static upsertTask(task: any, idempotencyKey?: string): void {
    const now = new Date().toISOString();
    const key = idempotencyKey || task.idempotencyKey || task.taskId;

    db.prepare(`
      INSERT INTO tasks (
        task_id,
        user_id,
        project_id,
        title,
        description,
        status,
        priority,
        nodes_json,
        edges_json,
        messages_json,
        logs_json,
        error,
        result,
        verification,
        idempotency_key,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id) DO UPDATE SET
        project_id = excluded.project_id,
        title = excluded.title,
        description = excluded.description,
        status = excluded.status,
        priority = excluded.priority,
        nodes_json = excluded.nodes_json,
        edges_json = excluded.edges_json,
        messages_json = excluded.messages_json,
        logs_json = excluded.logs_json,
        error = excluded.error,
        result = excluded.result,
        verification = excluded.verification,
        idempotency_key = excluded.idempotency_key,
        updated_at = excluded.updated_at
    `).run(
      task.taskId,
      task.userId,
      task.projectId || null,
      task.title || 'AURA Task',
      task.description || null,
      task.status || 'RUNNING',
      task.priority || 'normal',
      JSON.stringify(task.nodes || []),
      JSON.stringify(task.edges || []),
      JSON.stringify(task.messages || []),
      JSON.stringify(task.logs || []),
      task.error || null,
      task.result == null
        ? null
        : typeof task.result === 'string'
          ? task.result
          : JSON.stringify(task.result),
      task.verification == null
        ? null
        : typeof task.verification === 'string'
          ? task.verification
          : JSON.stringify(task.verification),
      key,
      task.createdAt || now,
      task.updatedAt || now
    );
  }

  static getTaskByIdempotencyKey(idempotencyKey: string): any | null {
    const row = db.prepare(`
      SELECT *
      FROM tasks
      WHERE idempotency_key = ?
      LIMIT 1
    `).get(idempotencyKey) as any;

    if (!row) return null;

    const parseJson = (value: any, fallback: any) => {
      if (value == null || value === '') return fallback;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    };

    return {
      taskId: row.task_id,
      userId: row.user_id,
      projectId: row.project_id || undefined,
      title: row.title,
      description: row.description || undefined,
      status: row.status,
      priority: row.priority,
      nodes: parseJson(row.nodes_json, []),
      edges: parseJson(row.edges_json, []),
      messages: parseJson(row.messages_json, []),
      logs: parseJson(row.logs_json, []),
      error: row.error || undefined,
      result: row.result == null
        ? undefined
        : parseJson(row.result, row.result),
      verification: row.verification == null
        ? undefined
        : parseJson(row.verification, row.verification),
      idempotencyKey: row.idempotency_key || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // ==================== PROJECTS & QUOTA ====================
  static saveProject(project: ProjectRecord): void {
    db.prepare(`
      INSERT INTO projects (id, user_id, name, business_type, status, files_json, verification_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        business_type = excluded.business_type,
        status = excluded.status,
        files_json = excluded.files_json,
        verification_json = excluded.verification_json,
        updated_at = excluded.updated_at
    `).run(
      project.id,
      project.userId,
      project.name,
      project.businessType,
      project.status,
      JSON.stringify(project.files),
      project.verification ? JSON.stringify(project.verification) : null,
      project.createdAt,
      project.updatedAt
    );
  }

  static getProject(id: string): ProjectRecord | null {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      businessType: row.business_type,
      status: row.status,
      files: JSON.parse(row.files_json || '[]'),
      verification: row.verification_json ? JSON.parse(row.verification_json) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static getUserProjects(userId: string): ProjectRecord[] {
    const rows = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      businessType: row.business_type,
      status: row.status,
      files: JSON.parse(row.files_json || '[]'),
      verification: row.verification_json ? JSON.parse(row.verification_json) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  static countNewProjectsCreatedToday(userId: string): number {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const isoStart = startOfDay.toISOString();
    const row = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND created_at >= ?').get(userId, isoStart) as any;
    return row?.count || 0;
  }

  static getProjectQuotaStatus(user: User): ProjectQuotaStatus {
    const isOwner = user.role === 'OWNER';
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const resetAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0
      )
    ).toISOString();

    const usedToday = AuraDB.countNewProjectsCreatedToday(user.id);

    if (isOwner) {
      return {
        userId: user.id,
        date,
        isOwner: true,
        limit: 5,
        used: usedToday,
        remaining: 5,
        resetAt,
        projectsCreatedToday: usedToday,
        totalProjects: AuraDB.getUserProjects(user.id).length,
        allowed: true,
        message: 'Owner access: unlimited project creations.'
      };
    }

    const freeLimit = 5;
    const remaining = Math.max(0, freeLimit - usedToday);

    return {
      userId: user.id,
      date,
      isOwner: false,
      limit: freeLimit,
      used: usedToday,
      remaining,
      resetAt,
      projectsCreatedToday: usedToday,
      totalProjects: AuraDB.getUserProjects(user.id).length,
      allowed: remaining > 0,
      message:
        remaining > 0
          ? `${remaining} project creations remaining today.`
          : "Today's 5-project limit reached."
    };
  }

  // ==================== TOOL IDEMPOTENCY ====================

  /**
   * Atomically claim a tool execution.
   *
   * Returns:
   *   { acquired: true } for the request that owns execution.
   *   { acquired: false, response } when a completed result exists.
   *   { acquired: false, processing: true } when another request owns it.
   *
   * The idempotency key is scoped to the authenticated user.
   */
  static acquireToolIdempotency(
    key: string,
    userId: string,
    tool: string,
    ttlSeconds = 300
  ): {
    acquired: boolean;
    processing?: boolean;
    response?: any;
    error?: string;
  } {
    if (!key || !userId || !tool) {
      return { acquired: true };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const cutoff = new Date(now.getTime() - ttlSeconds * 1000).toISOString();

    db.exec('BEGIN IMMEDIATE');

    try {
      const existing = db.prepare(`
        SELECT idempotency_key, user_id, tool, status,
               response_json, error, created_at
        FROM tool_idempotency
        WHERE idempotency_key = ?
      `).get(key) as any;

      if (existing) {
        // Never return or reuse another user's execution.
        if (existing.user_id !== userId) {
          db.exec('COMMIT');
          return {
            acquired: false,
            error: 'IDEMPOTENCY_KEY_OWNERSHIP_MISMATCH'
          };
        }

        if (existing.status === 'COMPLETED' && existing.response_json) {
          let response: any = null;

          try {
            response = JSON.parse(existing.response_json);
          } catch {
            response = {
              success: false,
              error: 'Stored idempotency response is invalid JSON.'
            };
          }

          db.exec('COMMIT');
          return {
            acquired: false,
            response
          };
        }

        if (
          existing.status === 'PROCESSING' &&
          existing.created_at > cutoff
        ) {
          db.exec('COMMIT');
          return {
            acquired: false,
            processing: true
          };
        }

        // Expired PROCESSING/FAILED record can be reclaimed.
        db.prepare(`
          UPDATE tool_idempotency
          SET user_id = ?,
              tool = ?,
              status = 'PROCESSING',
              response_json = NULL,
              error = NULL,
              created_at = ?,
              completed_at = NULL,
              updated_at = ?
          WHERE idempotency_key = ?
            AND user_id = ?
        `).run(
          userId,
          tool,
          nowIso,
          nowIso,
          key,
          userId
        );

        return { acquired: true };
      }

      db.prepare(`
        INSERT INTO tool_idempotency (
          idempotency_key,
          user_id,
          tool,
          status,
          response_json,
          error,
          created_at,
          completed_at,
          updated_at
        )
        VALUES (?, ?, ?, 'PROCESSING', NULL, NULL, ?, NULL, ?)
      `).run(
        key,
        userId,
        tool,
        nowIso,
        nowIso
      );

      db.exec('COMMIT');
      return { acquired: true };
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Preserve the original database error.
      }
      throw error;
    }
  }

  static completeToolIdempotency(
    key: string,
    userId: string,
    response: any
  ): void {
    if (!key || !userId) return;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tool_idempotency
      SET status = 'COMPLETED',
          response_json = ?,
          error = NULL,
          completed_at = ?,
          updated_at = ?
      WHERE idempotency_key = ?
        AND user_id = ?
    `).run(
      JSON.stringify(response),
      now,
      now,
      key,
      userId
    );
  }

  static failToolIdempotency(
    key: string,
    userId: string,
    error: string,
    response?: any
  ): void {
    if (!key || !userId) return;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tool_idempotency
      SET status = 'FAILED',
          response_json = ?,
          error = ?,
          completed_at = ?,
          updated_at = ?
      WHERE idempotency_key = ?
        AND user_id = ?
    `).run(
      response === undefined ? null : JSON.stringify(response),
      error || 'Tool execution failed',
      now,
      now,
      key,
      userId
    );
  }

  static getToolIdempotency(
    key: string,
    userId: string
  ): any | null {
    if (!key || !userId) return null;

    const row = db.prepare(`
      SELECT *
      FROM tool_idempotency
      WHERE idempotency_key = ?
        AND user_id = ?
    `).get(key, userId) as any;

    if (!row) return null;

    return {
      idempotencyKey: row.idempotency_key,
      userId: row.user_id,
      tool: row.tool,
      status: row.status,
      response: row.response_json
        ? JSON.parse(row.response_json)
        : null,
      error: row.error,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at
    };
  }

  // ==================== MEMORY ====================
  static getMemories(userId: string): MemoryItem[] {
    const rows = db.prepare('SELECT * FROM memories WHERE user_id = ? AND is_active = 1 ORDER BY updated_at DESC').all(userId) as any[];
    return rows.map(r => ({
      memoryId: r.memory_id,
      userId: r.user_id,
      category: r.category,
      title: r.title || 'User Memory',
      content: r.content,
      confidence: r.confidence || 0.9,
      source: r.source || 'user_command',
      importance: (r.importance || 'medium') as 'low' | 'medium' | 'high',
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString()
    }));
  }

  static addMemory(memory: Partial<MemoryItem> & { memoryId: string; userId: string; category: any; content: string }): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO memories (memory_id, user_id, category, content, confidence, source, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      memory.memoryId,
      memory.userId,
      memory.category,
      memory.content,
      memory.confidence || 0.9,
      memory.source || 'user_command',
      memory.createdAt || now,
      now
    );
  }

  static updateMemory(memoryId: string, userId: string, content: string, category?: string): boolean {
    const now = new Date().toISOString();
    const res = db.prepare(`
      UPDATE memories SET content = ?, category = COALESCE(?, category), updated_at = ?
      WHERE memory_id = ? AND user_id = ?
    `).run(content, category || null, now, memoryId, userId);
    return res.changes > 0;
  }

  static deleteMemory(memoryId: string, userId: string): boolean {
    const res = db.prepare('UPDATE memories SET is_active = 0 WHERE memory_id = ? AND user_id = ?').run(memoryId, userId);
    return res.changes > 0;
  }

  // ==================== PERMISSIONS ====================
  static getPermissions(userId: string): any[] {
    const rows = db.prepare('SELECT * FROM permissions WHERE user_id = ?').all(userId) as any[];
    return rows.map(r => ({
      permission: r.permission,
      label: r.label,
      description: r.description,
      risk: r.risk,
      state: r.state,
      updatedAt: r.updated_at
    }));
  }

  static setPermission(userId: string, permission: string, state: 'allowed' | 'ask_each_time' | 'denied'): void {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE permissions SET state = ?, updated_at = ?
      WHERE user_id = ? AND permission = ?
    `).run(state, now, userId, permission);
  }

  static initDefaultPermissions(userId: string): void {
    const defaults = [
      { permission: 'FILES_READ', label: 'Read Local Files', description: 'Allow reading files in selected project directories', risk: 'low', state: 'allowed' },
      { permission: 'FILES_WRITE', label: 'Write & Edit Files', description: 'Create and update code files and assets in workspace', risk: 'medium', state: 'allowed' },
      { permission: 'FILES_DELETE', label: 'Delete Files', description: 'Remove files or cleanup test directories', risk: 'high', state: 'ask_each_time' },
      { permission: 'BROWSER_CONTROL', label: 'Browser Automation', description: 'Navigate, inspect DOM, and extract research data', risk: 'medium', state: 'ask_each_time' },
      { permission: 'TERMINAL_EXECUTION', label: 'Execute Shell Commands', description: 'Run build scripts, tests, and package installations', risk: 'high', state: 'ask_each_time' },
      { permission: 'APP_LAUNCH', label: 'Launch Local Applications', description: 'Open VS Code, browsers, or terminal windows', risk: 'medium', state: 'ask_each_time' },
      { permission: 'SCREEN_CAPTURE', label: 'Screen Capture & Visual QA', description: 'Capture screenshot of active application window', risk: 'low', state: 'allowed' },
      { permission: 'CLIPBOARD_READ', label: 'Read Clipboard', description: 'Access copied text when requested', risk: 'low', state: 'ask_each_time' },
      { permission: 'CLIPBOARD_WRITE', label: 'Write to Clipboard', description: 'Copy generated code or URLs to clipboard', risk: 'low', state: 'allowed' },
      { permission: 'GIT_ACCESS', label: 'Git Repositories', description: 'Inspect commits, branches, and push to authorized repos', risk: 'medium', state: 'allowed' }
    ];

    const now = new Date().toISOString();
    for (const p of defaults) {
      db.prepare(`
        INSERT INTO permissions (id, user_id, permission, label, description, risk, state, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, permission) DO NOTHING
      `).run(`perm-${userId}-${p.permission}`, userId, p.permission, p.label, p.description, p.risk, p.state, now);
    }
  }

  // ==================== EXECUTIONS & AUDIT LOGS ====================
  static logExecution(exec: {
    executionId: string;
    userId: string;
    toolName: string;
    input: any;
    output?: any;
    status: 'SUCCESS' | 'FAILED' | 'VERIFIED';
    verified: boolean;
    durationMs: number;
    error?: string;
  }): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO executions (execution_id, user_id, tool_name, input_json, output_json, status, verified, duration_ms, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exec.executionId,
      exec.userId,
      exec.toolName,
      JSON.stringify(exec.input),
      exec.output ? JSON.stringify(exec.output) : null,
      exec.status,
      exec.verified ? 1 : 0,
      exec.durationMs,
      exec.error || null,
      now
    );
  }

  static addAuditLog(event: string, userId?: string, ip?: string, details?: any, status = 'INFO'): void {
    const id = 'aud-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, event, user_id, ip, details_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, now, event, userId || null, ip || null, JSON.stringify(details || {}), status);
  }

  static getAuditLogs(limit = 100): any[] {
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      event: r.event,
      userId: r.user_id,
      ip: r.ip,
      details: JSON.parse(r.details_json || '{}'),
      status: r.status
    }));
  }
}
