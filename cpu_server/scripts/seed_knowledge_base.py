import argparse
import csv
import json
import os
import sys
from typing import Any, Dict, List, Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from cpu_server import db

def _load_dotenv_file(path: str) -> None:
    try:
        if not path or not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                key = k.strip()
                val = v.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        return


_load_dotenv_file(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))


def _read_csv(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(r) for r in reader]


def _read_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _steps_to_markdown(steps: Any) -> str:
    if isinstance(steps, list):
        items = [str(x).strip() for x in steps if str(x).strip()]
        if not items:
            return ""
        return "\n".join([f"- {x}" for x in items]).strip() + "\n"
    if isinstance(steps, str):
        return steps.strip()
    return ""


def _parse_aliases(v: Any) -> Optional[dict]:
    if v is None:
        return None
    if isinstance(v, dict):
        return v
    s = str(v).strip()
    if not s:
        return None
    try:
        obj = json.loads(s)
        if isinstance(obj, dict):
            return obj
        if isinstance(obj, list):
            return {"items": obj}
    except Exception:
        parts = [p.strip() for p in s.split("|") if p.strip()]
        if parts:
            return {"items": parts}
    return None


def seed_entities(csv_path: str) -> Dict[str, str]:
    rows = _read_csv(csv_path)
    name_to_id: Dict[str, str] = {}
    for r in rows:
        name = str(r.get("Name") or r.get("name") or "").strip()
        category = str(r.get("Category") or r.get("category") or "").strip()
        specialty = str(r.get("Specialty") or r.get("specialty") or "Both").strip() or "Both"
        description = str(r.get("Description") or r.get("description") or "").strip()
        aliases = _parse_aliases(r.get("Aliases") or r.get("aliases"))
        if not name or not category:
            continue
        e = db.upsert_medical_entity(name, category, specialty, description, aliases=aliases)
        name_to_id[str(e["name"])] = str(e["id"])
    return name_to_id


def seed_relations(csv_path: str, name_to_id: Dict[str, str]) -> int:
    rows = _read_csv(csv_path)
    n = 0
    for r in rows:
        s_name = str(r.get("Source Name") or r.get("source") or r.get("source_name") or "").strip()
        t_name = str(r.get("Target Name") or r.get("target") or r.get("target_name") or "").strip()
        rt = str(r.get("Relation Type") or r.get("relation_type") or "").strip()
        note = str(r.get("Evidence/Note") or r.get("Evidence") or r.get("Note") or r.get("evidence_note") or "").strip()
        level_raw = r.get("Evidence Level") or r.get("evidence_level")
        level = None
        if level_raw is not None and str(level_raw).strip():
            try:
                level = int(str(level_raw).strip())
            except Exception:
                level = None
        if not s_name or not t_name or not rt:
            continue
        sid = name_to_id.get(s_name) or (db.get_medical_entity_by_name(s_name) or {}).get("id")
        tid = name_to_id.get(t_name) or (db.get_medical_entity_by_name(t_name) or {}).get("id")
        if not sid or not tid:
            continue
        db.upsert_medical_relation(str(sid), str(tid), rt, evidence_level=level, evidence_note=note)
        n += 1
    return n


def seed_interventions(json_path: str, name_to_id: Dict[str, str]) -> int:
    data = _read_json(json_path)
    items = data if isinstance(data, list) else [data]
    n = 0
    for it in items:
        if not isinstance(it, dict):
            continue
        entity_name = str(it.get("entity_name") or it.get("entity") or "").strip()
        if not entity_name:
            continue
        entity_id = name_to_id.get(entity_name) or (db.get_medical_entity_by_name(entity_name) or {}).get("id")
        if not entity_id:
            continue
        title = str(it.get("title") or entity_name).strip() or entity_name
        lvl = it.get("target_care_level")
        try:
            care = int(lvl) if lvl is not None else 1
        except Exception:
            care = 1
        content_md = str(it.get("content_markdown") or "").strip()
        if not content_md:
            content_md = _steps_to_markdown(it.get("steps"))
        if not content_md:
            continue
        db.upsert_intervention(str(entity_id), title, content_md, care)
        n += 1
    return n


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--entities", required=True)
    parser.add_argument("--relations", required=False)
    parser.add_argument("--interventions", required=False)
    args = parser.parse_args()

    if not (os.environ.get("DATABASE_URL") or "").strip():
        raise RuntimeError("Missing DATABASE_URL")

    db.ensure_auth_schema()
    db.ensure_knowledge_schema()

    name_to_id = seed_entities(args.entities)
    rel_n = seed_relations(args.relations, name_to_id) if args.relations else 0
    iv_n = seed_interventions(args.interventions, name_to_id) if args.interventions else 0

    print(json.dumps({"ok": True, "entities": len(name_to_id), "relations": rel_n, "interventions": iv_n}, ensure_ascii=False))


if __name__ == "__main__":
    main()
