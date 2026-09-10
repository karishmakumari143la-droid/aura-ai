"""
AURA AI — Persistent Memory Engine
Provides long-term contextual memory, user preferences, and goal tracking across sessions.
"""

import sqlite3
import os
import json
import time
from typing import Dict, Any, List, Optional

class PersistentMemory:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.path.join(os.getcwd(), "data", "aura_memory.db")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memory_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    category TEXT NOT NULL,  -- 'preference', 'fact', 'goal', 'project_history'
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    tags TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    UNIQUE(user_id, category, key)
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    timestamp REAL NOT NULL
                )
            """)
            conn.commit()

    def set_memory(self, user_id: str, category: str, key: str, value: Any, tags: Optional[List[str]] = None):
        now = time.time()
        val_str = json.dumps(value) if not isinstance(value, str) else value
        tags_str = ",".join(tags) if tags else ""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO memory_items (user_id, category, key, value, tags, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, category, key) DO UPDATE SET
                    value = excluded.value,
                    tags = excluded.tags,
                    updated_at = excluded.updated_at
            """, (user_id, category, key, val_str, tags_str, now, now))
            conn.commit()

    def get_memory(self, user_id: str, category: str, key: str) -> Optional[Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM memory_items WHERE user_id = ? AND category = ? AND key = ?", (user_id, category, key))
            row = cursor.fetchone()
            if not row:
                return None
            try:
                return json.loads(row[0])
            except Exception:
                return row[0]

    def search_memories(self, user_id: str, query: str = "", category: Optional[str] = None) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            params = [user_id]
            sql = "SELECT * FROM memory_items WHERE user_id = ?"
            if category:
                sql += " AND category = ?"
                params.append(category)
            if query:
                sql += " AND (key LIKE ? OR value LIKE ? OR tags LIKE ?)"
                q_like = f"%{query}%"
                params.extend([q_like, q_like, q_like])
            sql += " ORDER BY updated_at DESC LIMIT 50"
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                try:
                    item["value"] = json.loads(item["value"])
                except Exception:
                    pass
                results.append(item)
            return results

    semantic_search = search_memories

    def add_conversation_turn(self, user_id: str, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None):
        now = time.time()
        meta_str = json.dumps(metadata) if metadata else None
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO conversation_history (user_id, session_id, role, content, metadata, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, session_id, role, content, meta_str, now))
            conn.commit()

    def delete_memory(self, user_id: str, category: str, key: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM memory_items WHERE user_id = ? AND category = ? AND key = ?", (user_id, category, key))
            conn.commit()
            return cursor.rowcount > 0

    def forget(self, user_id: str, key: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM memory_items WHERE user_id = ? AND (key = ? OR key LIKE ?)", (user_id, key, f"%{key}%"))
            conn.commit()
            return cursor.rowcount > 0

    def clear_user_memories(self, user_id: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM memory_items WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM conversation_history WHERE user_id = ?", (user_id,))
            conn.commit()

    def get_recent_conversation(self, user_id: str, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT role, content, metadata, timestamp
                FROM (
                    SELECT id, role, content, metadata, timestamp
                    FROM conversation_history
                    WHERE user_id = ? AND session_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                ) ORDER BY id ASC
            """, (user_id, session_id, limit))
            rows = cursor.fetchall()
            res = []
            for r in rows:
                item = dict(r)
                if item.get("metadata"):
                    try:
                        item["metadata"] = json.loads(item["metadata"])
                    except Exception:
                        pass
                res.append(item)
            return res
