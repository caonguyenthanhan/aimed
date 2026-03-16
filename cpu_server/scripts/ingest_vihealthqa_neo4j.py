import argparse
import json
import os
import re
import sys
from typing import Any, Dict, Iterable, List, Optional, Tuple

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))


def _iter_jsonl(path: str) -> Iterable[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            t = line.strip()
            if not t:
                continue
            yield json.loads(t)


_ENTITY_RE = re.compile(r"\b[A-Z][a-zA-Z0-9\-]{2,}\b")


def _extract_entities(text: str, limit: int = 12) -> List[str]:
    t = (text or "").strip()
    if not t:
        return []
    found = _ENTITY_RE.findall(t)
    out: List[str] = []
    seen = set()
    for x in found:
        k = x.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(x)
        if len(out) >= limit:
            break
    return out


def _pick_qa(row: Dict[str, Any]) -> Tuple[str, str, Dict[str, Any]]:
    q = str(row.get("question") or row.get("query") or row.get("prompt") or "").strip()
    a = str(row.get("answer") or row.get("response") or row.get("completion") or "").strip()
    meta = {}
    for k in ("category", "source", "specialty", "tags", "id", "uid"):
        if k in row:
            meta[k] = row.get(k)
    if not q and isinstance(row.get("messages"), list):
        msgs = row.get("messages") or []
        for m in msgs:
            if isinstance(m, dict) and str(m.get("role") or "").lower() == "user":
                q = str(m.get("content") or "").strip()
                break
        for m in reversed(msgs):
            if isinstance(m, dict) and str(m.get("role") or "").lower() == "assistant":
                a = str(m.get("content") or "").strip()
                break
    return q, a, meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--neo4j-uri", default=os.environ.get("NEO4J_URI", "bolt://localhost:7687"))
    ap.add_argument("--neo4j-user", default=os.environ.get("NEO4J_USER", "neo4j"))
    ap.add_argument("--neo4j-password", default=os.environ.get("NEO4J_PASSWORD", "neo4j"))
    ap.add_argument("--database", default=os.environ.get("NEO4J_DATABASE", "neo4j"))
    args = ap.parse_args()

    from neo4j import GraphDatabase

    driver = GraphDatabase.driver(args.neo4j_uri, auth=(args.neo4j_user, args.neo4j_password))
    created = {"qa": 0, "entity": 0, "mention": 0}

    with driver.session(database=args.database) as sess:
        sess.run("CREATE CONSTRAINT vihealthqa_qa_id IF NOT EXISTS FOR (n:QA) REQUIRE n.qa_id IS UNIQUE")
        sess.run("CREATE CONSTRAINT vihealthqa_entity_name IF NOT EXISTS FOR (n:Entity) REQUIRE n.name IS UNIQUE")
        sess.run("CREATE INDEX vihealthqa_qa_text IF NOT EXISTS FOR (n:QA) ON (n.question)")

        def upsert_batch(batch: List[Dict[str, Any]]):
            cy = """
            UNWIND $rows AS r
            MERGE (q:QA {qa_id: r.qa_id})
              ON CREATE SET q.question = r.question, q.answer = r.answer, q.meta = r.meta, q.created_at = datetime()
              ON MATCH SET q.question = r.question, q.answer = r.answer, q.meta = r.meta, q.updated_at = datetime()
            WITH q, r
            UNWIND r.entities AS en
              MERGE (e:Entity {name: en})
              MERGE (q)-[:MENTIONS]->(e)
            RETURN count(q) AS c
            """
            sess.run(cy, rows=batch)

        batch: List[Dict[str, Any]] = []
        i = 0
        for row in _iter_jsonl(args.input):
            q, a, meta = _pick_qa(row)
            if not q or not a:
                continue
            qa_id = str(meta.get("id") or meta.get("uid") or f"qa-{i+1}")
            text_blob = f"{q}\n{a}"
            entities = _extract_entities(text_blob, 12)
            batch.append({"qa_id": qa_id, "question": q, "answer": a, "meta": meta, "entities": entities})
            i += 1
            if args.limit and i >= args.limit:
                break
            if len(batch) >= 200:
                upsert_batch(batch)
                created["qa"] += len(batch)
                batch = []
        if batch:
            upsert_batch(batch)
            created["qa"] += len(batch)

    driver.close()
    print(json.dumps({"ok": True, "ingested": created, "neo4j_uri": args.neo4j_uri, "database": args.database}, ensure_ascii=False))


if __name__ == "__main__":
    main()

