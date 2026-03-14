import json
from fastapi.testclient import TestClient
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import server

client = TestClient(server.app)

def run():
    r = client.get("/v1/runtime/state")
    assert r.status_code == 200
    g = r.json()
    assert "model" in g or "target" in g
    r2 = client.post("/v1/runtime/state", json={"model": "pro"})
    assert r2.status_code == 200
    r3 = client.get("/v1/runtime/state")
    assert r3.status_code == 200
    s = r3.json()
    assert s.get("model") in ("pro", "flash")
    r4 = client.post("/v1/runtime/state", json={"target": "cpu"})
    assert r4.status_code == 200
    r5 = client.get("/v1/runtime/state")
    assert r5.status_code == 200
    s2 = r5.json()
    assert s2.get("target") in ("cpu", "gpu")
    print("ok", json.dumps({"initial": g, "after": s2}))

if __name__ == "__main__":
    run()
