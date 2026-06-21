import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Load .env file
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

_load_dotenv_file(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "medical-consultation-app", ".env")))

def ingest_psychological_graph():
    # Read the JSON triplets
    data_path = os.path.join(os.path.dirname(__file__), "psych_graph_data.json")
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found. Please run parse_psych_data.py first.")
        sys.exit(1)
        
    with open(data_path, "r", encoding="utf-8") as f:
        graph_data = json.load(f)
        
    entities = graph_data.get("entities") or []
    relationships = graph_data.get("relationships") or []
    
    print(f"Loaded {len(entities)} entities and {len(relationships)} relationships from JSON.")
    
    from cpu_server.graph_gateway import get_graph_driver
    driver = get_graph_driver()
    if driver is None:
        print("Error: Could not connect to Graph database driver.")
        sys.exit(1)
        
    # Execute Cypher ingest queries
    with driver.session() as session:
        # 1. Ensure constraints and indexes exist
        print("Ensuring unique constraints and indexes for psychology nodes...")
        session.run("CREATE CONSTRAINT vihealthqa_entity_name IF NOT EXISTS FOR (n:Entity) REQUIRE n.name IS UNIQUE")
        
        # 2. Ingest entities
        print("Merging entities into Graph DB...")
        entity_query = """
        UNWIND $entities AS ent
        MERGE (e:Entity {name: ent.name})
        SET e:Psychology,
            e.label = ent.label,
            e.description = ent.description,
            e.collection = 'therapy',
            e.updated_at = datetime()
        RETURN count(e) AS count
        """
        res = session.run(entity_query, entities=entities)
        print(f"Merged {res.single().get('count')} entities.")
        
        # 3. Ingest relationships
        print("Merging relationships into Graph DB...")
        rel_count = 0
        for rel in relationships:
            source = rel.get("source")
            target = rel.get("target")
            rel_type = rel.get("type")
            
            # Strict validation against allowed relations
            if rel_type not in ("CAUSES", "MANIFESTS_AS", "RELIEVES", "MANAGES"):
                print(f"Warning: Skipping unknown relationship type '{rel_type}' between '{source}' and '{target}'")
                continue
                
            rel_query = f"""
            MATCH (a:Entity {{name: $source}}), (b:Entity {{name: $target}})
            MERGE (a)-[r:{rel_type}]->(b)
            SET r.collection = 'therapy',
                r.updated_at = datetime()
            RETURN count(r) AS count
            """
            res = session.run(rel_query, source=source, target=target)
            rel_count += res.single().get("count")
            
        print(f"Successfully merged {rel_count} relationships.")
        print("Psychological Graph Ingestion completed.")

if __name__ == "__main__":
    ingest_psychological_graph()
