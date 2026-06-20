from neo4j import GraphDatabase

d = GraphDatabase.driver("bolt://127.0.0.1:7687")
with d.session() as s:
    # Check total nodes
    total = s.run("MATCH (e:Entity) RETURN count(e) AS c").single()["c"]
    print(f"Total Entity nodes: {total}")

    # Sample names
    rows = list(s.run("MATCH (e:Entity) RETURN e.name LIMIT 10"))
    print("Sample names:")
    for r in rows:
        print(f"  {r['e.name']}")

    # Search for viem hong
    rows2 = list(s.run("MATCH (e:Entity) WHERE toLower(e.name) CONTAINS 'viem' OR toLower(e.name) CONTAINS 'hong' RETURN e.name LIMIT 5"))
    print("Search 'viem/hong':")
    for r in rows2:
        print(f"  {r['e.name']}")
d.close()
