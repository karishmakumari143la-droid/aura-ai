import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event: string;
  action?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: Record<string, any>;
  error?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit-logs.json');

// In-memory cache of recent audit logs
const memoryAuditLogs: AuditLogEntry[] = [];

// Ensure data directory exists
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[AuditLogger] Failed to create data directory:', err);
  }
}

// Load logs on module initialization
function loadAuditLogs(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      const raw = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryAuditLogs.splice(0, memoryAuditLogs.length, ...parsed);
      }
    }
  } catch (err) {
    console.warn('[AuditLogger] Could not load persisted audit logs, starting fresh:', err);
  }
}

loadAuditLogs();

function persistAuditLogs(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(memoryAuditLogs, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AuditLogger] Failed to persist audit logs to disk:', err);
  }
}

// Sanitize details to never leak secrets, codes, or tokens
function sanitizeDetails(details?: Record<string, any>): Record<string, any> | undefined {
  if (!details) return undefined;
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['secret', 'token', 'code', 'password', 'key', 'authorization'];

  for (const [key, value] of Object.entries(details)) {
    const isSensitive = sensitiveKeys.some(s => key.toLowerCase().includes(s));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeDetails(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function recordAuditLog(entry: {
  event?: string;
  action?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: Record<string, any>;
  error?: string;
  [key: string]: any;
}): AuditLogEntry {
  const resolvedEvent = entry.event || entry.action || 'UNKNOWN_EVENT';
  const logEntry: AuditLogEntry = {
    id: `audit-${crypto.randomBytes(12).toString('hex')}`,
    timestamp: new Date().toISOString(),
    event: resolvedEvent,
    action: resolvedEvent,
    userId: entry.userId,
    ip: entry.ip,
    userAgent: entry.userAgent,
    status: entry.status,
    details: sanitizeDetails(entry.details),
    error: entry.error
  };

  memoryAuditLogs.push(logEntry);
  if (memoryAuditLogs.length > 5000) {
    memoryAuditLogs.splice(0, memoryAuditLogs.length - 5000);
  }

  persistAuditLogs();
  console.log(`[AUDIT] [${logEntry.status}] ${logEntry.event} (user: ${logEntry.userId || 'anonymous'})`);
  return logEntry;
}

export function getAuditLogs(filter?: {
  userId?: string;
  event?: string;
  limit?: number;
}): AuditLogEntry[] {
  let logs = [...memoryAuditLogs];
  if (filter?.userId) {
    logs = logs.filter(l => l.userId === filter.userId);
  }
  if (filter?.event) {
    logs = logs.filter(l => l.event === filter.event);
  }
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (filter?.limit) {
    logs = logs.slice(0, filter.limit);
  }
  return logs;
}

export function clearAuditLogs(): void {
  memoryAuditLogs.length = 0;
  try {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      fs.unlinkSync(AUDIT_LOG_FILE);
    }
  } catch (err) {
    console.error('[AuditLogger] Failed to clear audit log file:', err);
  }
}
