import csv
import os
import re
import sys
from pathlib import Path

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from neo4j import GraphDatabase


REPO_ROOT = Path(__file__).resolve().parents[2]


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


_load_dotenv_file(str(REPO_ROOT / "cpu_server" / ".env"))
_load_dotenv_file(str(REPO_ROOT / ".env.local"))
_load_dotenv_file(str(REPO_ROOT / "medical-consultation-app" / ".env.local"))


def _rel_type(s: str) -> str:
    raw = str(s or "").strip().upper()
    raw = re.sub(r"[^A-Z0-9_]", "_", raw)
    raw = re.sub(r"_+", "_", raw).strip("_")
    return raw or "RELATED_TO"


def ingest():
    uri = (os.environ.get("GRAPH_BOLT_URL") or os.environ.get("NEO4J_URI") or "bolt://127.0.0.1:7687").strip()
    user = (os.environ.get("GRAPH_USER") or os.environ.get("NEO4J_USER") or "").strip()
    password = (os.environ.get("GRAPH_PASSWORD") or os.environ.get("NEO4J_PASSWORD") or "").strip()
    auth = (user, password) if (user and password) else None

    entities_csv = REPO_ROOT / "medical-consultation-app" / "data" / "demo" / "MedicalEntities.csv"
    rels_csv = REPO_ROOT / "medical-consultation-app" / "data" / "demo" / "MedicalRelations.csv"
    if not entities_csv.exists() or not rels_csv.exists():
        raise RuntimeError("missing_demo_csv")

    driver = GraphDatabase.driver(uri, auth=auth)
    try:
        with driver.session() as s:
            with open(entities_csv, "r", encoding="utf-8-sig", newline="") as f:
                r = csv.DictReader(f)
                for row in r:
                    name = str(row.get("Name") or "").strip()
                    if not name:
                        continue
                    category = str(row.get("Category") or "").strip()
                    specialty = str(row.get("Specialty") or "").strip()
                    description = str(row.get("Description") or "").strip()
                    aliases = str(row.get("Aliases") or "").strip()
                    s.run(
                        """
                        MERGE (e:Entity {name: $name})
                        SET e.category = $category,
                            e.specialty = $specialty,
                            e.description = $description,
                            e.aliases = $aliases,
                            e.collection = 'demo'
                        """,
                        name=name,
                        category=category,
                        specialty=specialty,
                        description=description,
                        aliases=aliases,
                    ).consume()

            with open(rels_csv, "r", encoding="utf-8-sig", newline="") as f:
                r = csv.DictReader(f)
                for row in r:
                    src = str(row.get("Source Name") or "").strip()
                    dst = str(row.get("Target Name") or "").strip()
                    if not src or not dst:
                        continue
                    rel = _rel_type(row.get("Relation Type") or "")
                    note = str(row.get("Evidence/Note") or "").strip()
                    level = None
                    try:
                        level = int(str(row.get("Evidence Level") or "").strip())
                    except Exception:
                        level = None

                    cypher = f"""
                    MERGE (a:Entity {{name: $src}})
                    MERGE (b:Entity {{name: $dst}})
                    MERGE (a)-[r:{rel}]->(b)
                    SET r.evidence = $note,
                        r.evidence_level = $level
                    """
                    s.run(cypher, src=src, dst=dst, note=note, level=level).consume()

        return {"ok": True, "uri": uri, "entities_csv": str(entities_csv), "rels_csv": str(rels_csv)}
    finally:
        driver.close()


if __name__ == "__main__":
    import json

    print(json.dumps(ingest(), ensure_ascii=False, indent=2))
