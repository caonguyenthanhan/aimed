import os
import uuid
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.types.json import Jsonb


def get_database_url() -> str:
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        raise RuntimeError("Missing DATABASE_URL")
    return url


def db_connect():
    return psycopg.connect(get_database_url(), autocommit=True)


def ensure_auth_schema() -> None:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS auth_users (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  username TEXT NOT NULL UNIQUE,
                  password_salt TEXT,
                  password_hash TEXT,
                  role TEXT NOT NULL DEFAULT 'PATIENT',
                  token_version INT NOT NULL DEFAULT 0,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_consents (
                  user_id UUID PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
                  share_scores BOOLEAN NOT NULL DEFAULT false,
                  share_chat_content BOOLEAN NOT NULL DEFAULT false,
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
                  title TEXT NOT NULL DEFAULT '',
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  last_active TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS conversations_user_id_last_active_idx ON conversations (user_id, last_active DESC)")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS conversation_messages (
                  id BIGSERIAL PRIMARY KEY,
                  conv_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                  role TEXT NOT NULL,
                  content TEXT NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS conversation_messages_conv_id_id_idx ON conversation_messages (conv_id, id)")


def ensure_knowledge_schema() -> None:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            except Exception:
                pass
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS medical_entities (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  name TEXT NOT NULL UNIQUE,
                  category TEXT NOT NULL,
                  specialty TEXT NOT NULL DEFAULT 'Both',
                  description TEXT NOT NULL DEFAULT '',
                  aliases JSONB,
                  embedding vector(1536),
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  search_tsv tsvector GENERATED ALWAYS AS (
                    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,''))
                  ) STORED
                )
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS medical_entities_search_tsv_idx ON medical_entities USING GIN (search_tsv)")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS medical_relations (
                  id BIGSERIAL PRIMARY KEY,
                  source_id UUID NOT NULL REFERENCES medical_entities(id) ON DELETE CASCADE,
                  target_id UUID NOT NULL REFERENCES medical_entities(id) ON DELETE CASCADE,
                  relation_type TEXT NOT NULL,
                  evidence_level INT,
                  evidence_note TEXT,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS medical_relations_source_id_idx ON medical_relations (source_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS medical_relations_target_id_idx ON medical_relations (target_id)")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS intervention_content (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  entity_id UUID NOT NULL REFERENCES medical_entities(id) ON DELETE CASCADE,
                  title TEXT NOT NULL,
                  content_markdown TEXT NOT NULL,
                  target_care_level INT NOT NULL DEFAULT 1,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS intervention_content_entity_id_idx ON intervention_content (entity_id)")


def ensure_clinical_memory_schema() -> None:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS conversation_summaries (
                  conv_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
                  summary TEXT NOT NULL DEFAULT '',
                  metadata JSONB,
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )


def now_iso(cur) -> str:
    cur.execute("SELECT now()::timestamptz")
    return str(cur.fetchone()[0].isoformat())


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    u = (username or "").strip().lower()
    if not u:
        return None
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute("SELECT * FROM auth_users WHERE username = %s", (u,))
            return cur.fetchone()


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    try:
        uid = uuid.UUID(str(user_id))
    except Exception:
        return None
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute("SELECT * FROM auth_users WHERE id = %s", (uid,))
            return cur.fetchone()


def create_user(username: str, password_salt: str, password_hash: str, role: str = "PATIENT") -> Dict[str, Any]:
    u = (username or "").strip().lower()
    if not u:
        raise ValueError("Invalid username")
    role_norm = (role or "").strip().upper() or "PATIENT"
    if role_norm not in ("PATIENT", "DOCTOR", "ADMIN"):
        role_norm = "PATIENT"
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                INSERT INTO auth_users (username, password_salt, password_hash, role)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (u, password_salt, password_hash, role_norm),
            )
            user = cur.fetchone()
            cur.execute("INSERT INTO user_consents (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING", (user["id"],))
            return user


def bump_token_version(user_id: str) -> None:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE auth_users SET token_version = token_version + 1 WHERE id = %s", (user_id,))


def update_username(user_id: str, username: str) -> None:
    u = (username or "").strip().lower()
    if not u:
        return
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE auth_users SET username = %s WHERE id = %s", (u, user_id))


def set_password(user_id: str, password_salt: str, password_hash: str) -> None:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE auth_users SET password_salt = %s, password_hash = %s WHERE id = %s",
                (password_salt, password_hash, user_id),
            )


def get_consent(user_id: str) -> Dict[str, Any]:
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                SELECT user_id, share_scores, share_chat_content, updated_at
                FROM user_consents
                WHERE user_id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if row:
                return row
            cur.execute("INSERT INTO user_consents (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING", (user_id,))
            cur.execute(
                "SELECT user_id, share_scores, share_chat_content, updated_at FROM user_consents WHERE user_id = %s",
                (user_id,),
            )
            return cur.fetchone()


def set_consent(user_id: str, share_scores: bool, share_chat_content: bool) -> Dict[str, Any]:
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                INSERT INTO user_consents (user_id, share_scores, share_chat_content, updated_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (user_id)
                DO UPDATE SET share_scores = EXCLUDED.share_scores, share_chat_content = EXCLUDED.share_chat_content, updated_at = now()
                RETURNING user_id, share_scores, share_chat_content, updated_at
                """,
                (user_id, share_scores, share_chat_content),
            )
            return cur.fetchone()


def create_conversation(user_id: str, title: str = "") -> Dict[str, Any]:
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                INSERT INTO conversations (user_id, title)
                VALUES (%s, %s)
                RETURNING id, title, last_active
                """,
                (user_id, title or ""),
            )
            return cur.fetchone()


def touch_conversation(conv_id: str) -> None:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE conversations SET last_active = now() WHERE id = %s", (conv_id,))


def append_message(conv_id: str, role: str, content: str) -> None:
    r = (role or "").strip().lower()
    if r not in ("user", "assistant", "system"):
        r = "user"
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO conversation_messages (conv_id, role, content) VALUES (%s, %s, %s)", (conv_id, r, content or ""))
            cur.execute("UPDATE conversations SET last_active = now() WHERE id = %s", (conv_id,))


def list_conversations(user_id: str):
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                "SELECT id, title, last_active FROM conversations WHERE user_id = %s ORDER BY last_active DESC",
                (user_id,),
            )
            return cur.fetchall()


def get_conversation(user_id: str, conv_id: str):
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                "SELECT id, title, last_active FROM conversations WHERE id = %s AND user_id = %s",
                (conv_id, user_id),
            )
            return cur.fetchone()


def get_conversation_messages(conv_id: str, page: int, page_size: int):
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 50
    if page_size > 200:
        page_size = 200
    offset = (page - 1) * page_size
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                SELECT role, content, created_at
                FROM conversation_messages
                WHERE conv_id = %s
                ORDER BY id ASC
                OFFSET %s LIMIT %s
                """,
                (conv_id, offset, page_size),
            )
            rows = cur.fetchall()
            return [{"role": r["role"], "content": r["content"], "created_at": r["created_at"].isoformat()} for r in rows]


def get_recent_conversation_messages(conv_id: str, limit: int = 200):
    if limit < 1:
        limit = 1
    if limit > 500:
        limit = 500
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                SELECT role, content
                FROM conversation_messages
                WHERE conv_id = %s
                ORDER BY id DESC
                LIMIT %s
                """,
                (conv_id, limit),
            )
            rows = cur.fetchall()
            rows.reverse()
            return [{"role": r["role"], "content": r["content"]} for r in rows]


def update_conversation_title(user_id: str, conv_id: str, title: str) -> bool:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE conversations SET title = %s WHERE id = %s AND user_id = %s",
                (title or "", conv_id, user_id),
            )
            return cur.rowcount > 0


def delete_conversation(user_id: str, conv_id: str) -> bool:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM conversations WHERE id = %s AND user_id = %s", (conv_id, user_id))
            return cur.rowcount > 0


def offboard_user_data(user_id: str) -> Dict[str, int]:
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM conversations WHERE user_id = %s", (user_id,))
            conv_count = int(cur.fetchone()[0] or 0)
            cur.execute(
                """
                SELECT COUNT(*)
                FROM conversation_messages m
                JOIN conversations c ON c.id = m.conv_id
                WHERE c.user_id = %s
                """,
                (user_id,),
            )
            msg_count = int(cur.fetchone()[0] or 0)
            cur.execute("DELETE FROM conversations WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM user_consents WHERE user_id = %s", (user_id,))
            return {"conversations_deleted": conv_count, "messages_deleted": msg_count}


def upsert_medical_entity(name: str, category: str, specialty: str, description: str, aliases: Optional[dict] = None) -> Dict[str, Any]:
    n = (name or "").strip()
    if not n:
        raise ValueError("Invalid name")
    cat = (category or "").strip().upper() or "SYMPTOM"
    spec = (specialty or "").strip() or "Both"
    desc = (description or "").strip()
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                INSERT INTO medical_entities (name, category, specialty, description, aliases)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name)
                DO UPDATE SET category = EXCLUDED.category, specialty = EXCLUDED.specialty, description = EXCLUDED.description, aliases = EXCLUDED.aliases
                RETURNING *
                """,
                (n, cat, spec, desc, Jsonb(aliases) if aliases is not None else None),
            )
            return cur.fetchone()


def get_medical_entity_by_name(name: str) -> Optional[Dict[str, Any]]:
    n = (name or "").strip()
    if not n:
        return None
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute("SELECT * FROM medical_entities WHERE name = %s", (n,))
            return cur.fetchone()


def upsert_medical_relation(source_id: str, target_id: str, relation_type: str, evidence_level: Optional[int] = None, evidence_note: Optional[str] = None) -> Dict[str, Any]:
    rt = (relation_type or "").strip().upper()
    if not rt:
        raise ValueError("Invalid relation_type")
    level = int(evidence_level) if evidence_level is not None else None
    note = (evidence_note or "").strip() or None
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                INSERT INTO medical_relations (source_id, target_id, relation_type, evidence_level, evidence_note)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (source_id, target_id, rt, level, note),
            )
            return cur.fetchone()


def upsert_intervention(entity_id: str, title: str, content_markdown: str, target_care_level: int) -> Dict[str, Any]:
    t = (title or "").strip()
    c = (content_markdown or "").strip()
    lvl = int(target_care_level) if target_care_level is not None else 1
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                INSERT INTO intervention_content (entity_id, title, content_markdown, target_care_level)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (entity_id, t, c, lvl),
            )
            return cur.fetchone()


def search_medical_entities(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []
    lim = int(limit or 8)
    if lim < 1:
        lim = 1
    if lim > 20:
        lim = 20
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                SELECT id, name, category, specialty, description
                FROM medical_entities
                WHERE search_tsv @@ plainto_tsquery('simple', %s)
                ORDER BY ts_rank(search_tsv, plainto_tsquery('simple', %s)) DESC
                LIMIT %s
                """,
                (q, q, lim),
            )
            rows = cur.fetchall()
            if rows:
                return rows
            cur.execute(
                """
                SELECT id, name, category, specialty, description
                FROM medical_entities
                WHERE name ILIKE %s OR description ILIKE %s
                ORDER BY name ASC
                LIMIT %s
                """,
                (f"%{q}%", f"%{q}%", lim),
            )
            return cur.fetchall()


def get_entity_neighbors(entity_ids: List[str], limit: int = 50) -> List[Dict[str, Any]]:
    ids = [str(x) for x in (entity_ids or []) if str(x)]
    if not ids:
        return []
    lim = int(limit or 50)
    if lim < 1:
        lim = 1
    if lim > 200:
        lim = 200
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                SELECT
                  r.source_id,
                  r.target_id,
                  r.relation_type,
                  r.evidence_level,
                  r.evidence_note,
                  s.name AS source_name,
                  t.name AS target_name,
                  s.category AS source_category,
                  t.category AS target_category
                FROM medical_relations r
                JOIN medical_entities s ON s.id = r.source_id
                JOIN medical_entities t ON t.id = r.target_id
                WHERE r.source_id = ANY(%s::uuid[]) OR r.target_id = ANY(%s::uuid[])
                ORDER BY r.id DESC
                LIMIT %s
                """,
                (ids, ids, lim),
            )
            return cur.fetchall()


def get_interventions_for_entities(entity_ids: List[str], limit: int = 20) -> List[Dict[str, Any]]:
    ids = [str(x) for x in (entity_ids or []) if str(x)]
    if not ids:
        return []
    lim = int(limit or 20)
    if lim < 1:
        lim = 1
    if lim > 100:
        lim = 100
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                SELECT i.id, i.entity_id, e.name AS entity_name, i.title, i.target_care_level, i.content_markdown
                FROM intervention_content i
                JOIN medical_entities e ON e.id = i.entity_id
                WHERE i.entity_id = ANY(%s::uuid[])
                ORDER BY i.created_at DESC
                LIMIT %s
                """,
                (ids, lim),
            )
            return cur.fetchall()


def get_conversation_summary(conv_id: str) -> Optional[Dict[str, Any]]:
    try:
        cid = str(uuid.UUID(str(conv_id)))
    except Exception:
        return None
    with db_connect() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute("SELECT conv_id, summary, metadata, updated_at FROM conversation_summaries WHERE conv_id = %s", (cid,))
            return cur.fetchone()


def upsert_conversation_summary(conv_id: str, summary: str, metadata: Optional[dict] = None) -> None:
    cid = str(uuid.UUID(str(conv_id)))
    s = (summary or "").strip()
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO conversation_summaries (conv_id, summary, metadata, updated_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (conv_id)
                DO UPDATE SET summary = EXCLUDED.summary, metadata = EXCLUDED.metadata, updated_at = now()
                """,
                (cid, s, Jsonb(metadata) if metadata is not None else None),
            )
