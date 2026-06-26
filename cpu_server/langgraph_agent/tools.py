from __future__ import annotations

import datetime
import importlib
import os
import time
from typing import Any, Dict, List, Optional

import requests
from pydantic import BaseModel, Field

class Symptom(BaseModel):
    name: str = Field(description="Tên của triệu chứng, ví dụ: 'sốt', 'đau ngực', 'khó thở'")
    label: str = "Symptom"
    description: Optional[str] = Field(None, description="Mô tả lâm sàng của triệu chứng")

class Disease(BaseModel):
    name: str = Field(description="Tên của bệnh lý hoặc hội chứng, ví dụ: 'cảm cúm', 'suy tim', 'trầm cảm'")
    label: str = "Disease"
    description: Optional[str] = Field(None, description="Mô tả chi tiết bệnh lý")

class ActiveIngredient(BaseModel):
    name: str = Field(description="Tên của hoạt chất hoặc dược chất, ví dụ: 'paracetamol', 'ibuprofen'")
    label: str = "ActiveIngredient"
    description: Optional[str] = Field(None, description="Công dụng, liều dùng và chống chỉ định của hoạt chất")


try:
    from cpu_server.graph_gateway import get_graph_driver, reset_graph_driver
except Exception:
    try:
        from graph_gateway import get_graph_driver, reset_graph_driver
    except Exception:
        get_graph_driver = lambda: None
        reset_graph_driver = lambda: None


_CACHE: Dict[str, Any] = {}


def _cache_get(key: str) -> Optional[Dict[str, Any]]:
    try:
        row = _CACHE.get(key)
        if not row:
            return None
        exp, val = row
        if float(exp) <= time.time():
            _CACHE.pop(key, None)
            return None
        return val
    except Exception:
        return None


def _cache_set(key: str, value: Dict[str, Any], ttl_s: float) -> None:
    try:
        ttl = float(ttl_s or 0.0)
        if ttl <= 0:
            return
        _CACHE[key] = (time.time() + ttl, value)
    except Exception:
        return


def _env_timeout(key: str, default: float) -> float:
    try:
        v = float(str(os.environ.get(key) or "").strip())
        if v > 0:
            return v
    except Exception:
        pass
    return default


def _http_get_json(url: str, headers: Optional[Dict[str, str]] = None, params: Optional[Dict[str, Any]] = None, timeout: float = 10.0) -> Dict[str, Any]:
    resp = requests.get(url, headers=headers, params=params, timeout=timeout)
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}
    return {"ok": resp.ok, "status": resp.status_code, "data": data}


def web_search(query: str, num: int = 5, timeout_s: float = 10.0) -> Dict[str, Any]:
    timeout_s = timeout_s if timeout_s and timeout_s > 0 else _env_timeout("LG_WEB_TIMEOUT_S", 10.0)
    key = (os.environ.get("GOOGLE_CSE_API_KEY") or "").strip()
    cx = (os.environ.get("GOOGLE_CSE_CX") or "").strip()
    q = (query or "").strip()
    if not q:
        return {"ok": True, "query": q, "results": []}
    if not key or not cx:
        return {"ok": False, "error": "missing_google_cse_env", "query": q, "results": []}
    cache_key = f"web.search|{cx}|{q}|{int(num or 5)}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    num_i = int(num or 5)
    if num_i < 1:
        num_i = 1
    if num_i > 10:
        num_i = 10
    r = _http_get_json(
        "https://www.googleapis.com/customsearch/v1",
        params={"key": key, "cx": cx, "q": q, "num": num_i},
        timeout=timeout_s,
    )
    items = []
    if r.get("ok"):
        data = r.get("data") or {}
        for it in (data.get("items") or [])[:num_i]:
            items.append(
                {
                    "title": str(it.get("title") or ""),
                    "url": str(it.get("link") or ""),
                    "snippet": str(it.get("snippet") or ""),
                }
            )
    out = {"ok": bool(r.get("ok")), "query": q, "results": items, "status": r.get("status")}
    _cache_set(cache_key, out, float(os.environ.get("LG_WEB_CACHE_TTL_S") or 300.0))
    return out


def youtube_search(query: Optional[str] = None, mood: Optional[str] = None, maxResults: int = 5, timeout_s: float = 10.0) -> Dict[str, Any]:
    timeout_s = timeout_s if timeout_s and timeout_s > 0 else _env_timeout("LG_YOUTUBE_TIMEOUT_S", 10.0)
    key = (os.environ.get("YOUTUBE_API_KEY") or "").strip()
    if not key:
        return {"ok": False, "error": "missing_youtube_api_key", "results": []}
    q = (query or "").strip()
    if not q:
        m = (mood or "").strip().lower()
        if m:
            q = f"{m} music"
        else:
            q = "relaxing music"
    n = int(maxResults or 5)
    if n < 1:
        n = 1
    if n > 10:
        n = 10
    cache_key = f"youtube.search|{q}|{n}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    r = _http_get_json(
        "https://www.googleapis.com/youtube/v3/search",
        params={"key": key, "part": "snippet", "q": q, "maxResults": n, "type": "video"},
        timeout=timeout_s,
    )
    items = []
    if r.get("ok"):
        data = r.get("data") or {}
        for it in (data.get("items") or [])[:n]:
            vid = (it.get("id") or {}).get("videoId")
            sn = it.get("snippet") or {}
            if vid:
                items.append(
                    {
                        "videoId": str(vid),
                        "title": str(sn.get("title") or ""),
                        "channelTitle": str(sn.get("channelTitle") or ""),
                        "thumbnail": ((sn.get("thumbnails") or {}).get("high") or {}).get("url"),
                    }
                )
    out = {"ok": bool(r.get("ok")), "query": q, "results": items, "status": r.get("status")}
    _cache_set(cache_key, out, float(os.environ.get("LG_YOUTUBE_CACHE_TTL_S") or 300.0))
    return out


def youtube_video(videoId: str, timeout_s: float = 10.0) -> Dict[str, Any]:
    timeout_s = timeout_s if timeout_s and timeout_s > 0 else _env_timeout("LG_YOUTUBE_TIMEOUT_S", 10.0)
    key = (os.environ.get("YOUTUBE_API_KEY") or "").strip()
    vid = (videoId or "").strip()
    if not key:
        return {"ok": False, "error": "missing_youtube_api_key"}
    if not vid:
        return {"ok": False, "error": "missing_videoId"}
    cache_key = f"youtube.video|{vid}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    r = _http_get_json(
        "https://www.googleapis.com/youtube/v3/videos",
        params={"key": key, "part": "snippet,contentDetails,statistics", "id": vid},
        timeout=timeout_s,
    )
    data = r.get("data") or {}
    items = data.get("items") or []
    item = items[0] if items else None
    out = {"ok": bool(r.get("ok")), "video": item, "status": r.get("status")}
    _cache_set(cache_key, out, float(os.environ.get("LG_YOUTUBE_CACHE_TTL_S") or 300.0))
    return out


def youtube_recommend_music(mood: Optional[str] = None, maxResults: int = 5, timeout_s: float = 10.0) -> Dict[str, Any]:
    timeout_s = timeout_s if timeout_s and timeout_s > 0 else _env_timeout("LG_YOUTUBE_TIMEOUT_S", 10.0)
    m = (mood or "").strip().lower()
    q = "lofi chill"
    if m:
        q = f"{m} music"
    return youtube_search(query=q, maxResults=maxResults, timeout_s=timeout_s)


def graph_status(timeout_s: float = 8.0) -> Dict[str, Any]:
    timeout_s = timeout_s if timeout_s and timeout_s > 0 else _env_timeout("LG_GRAPH_TIMEOUT_S", 8.0)
    t0 = time.time()
    driver = get_graph_driver()
    if driver is None:
        return {"ok": False, "connected": False, "checked_at": datetime.datetime.utcnow().isoformat(), "latency_ms": int((time.time() - t0) * 1000)}
    cached = _cache_get("graph.status")
    if cached is not None:
        return cached
    try:
        with driver.session() as s:
            c = s.run("MATCH (n) RETURN count(n) AS c").single()
            nodes = int(c.get("c")) if c and c.get("c") is not None else 0
        out = {"ok": True, "connected": True, "nodes": nodes, "checked_at": datetime.datetime.utcnow().isoformat(), "latency_ms": int((time.time() - t0) * 1000)}
        _cache_set("graph.status", out, float(os.environ.get("LG_GRAPH_STATUS_CACHE_TTL_S") or 2.0))
        return out
    except Exception:
        try:
            reset_graph_driver()
        except Exception:
            pass
        return {"ok": False, "connected": False, "checked_at": datetime.datetime.utcnow().isoformat(), "latency_ms": int((time.time() - t0) * 1000)}


def graph_evidence(
    query: str,
    cypher_query: Optional[str] = None,
    limit: int = 60,
    entity_limit: int = 5,
    rel_types: Optional[List[str]] = None,
    timeout_s: float = 12.0,
    collection: Optional[str] = None
) -> Dict[str, Any]:
    timeout_s = timeout_s if timeout_s and timeout_s > 0 else _env_timeout("LG_GRAPH_TIMEOUT_S", 12.0)
    q = (query or "").strip()
    
    if cypher_query:
        driver = get_graph_driver()
        if driver is None:
            return {"ok": False, "error": "graph_not_available", "query": q, "entities": [], "edges": []}
        t0 = time.time()
        try:
            with driver.session() as s:
                res = s.run(cypher_query)
                records = [r.data() for r in res]
                
                entities = []
                edges = []
                seen_entities = set()
                for r in records:
                    for val in r.values():
                        if isinstance(val, dict):
                            if "name" in val and "id" in val:
                                if val["id"] not in seen_entities:
                                    seen_entities.add(val["id"])
                                    entities.append(val)
                            elif "rel" in val or ("entity_id" in val and "other_id" in val):
                                edges.append(val)
                return {
                    "ok": True,
                    "query": q,
                    "cypher_query": cypher_query,
                    "entities": entities if entities else records,
                    "edges": edges,
                    "records": records,
                    "elapsed_ms": int((time.time() - t0) * 1000)
                }
        except Exception as e:
            try:
                reset_graph_driver()
            except Exception:
                pass
            return {"ok": False, "query": q, "cypher_query": cypher_query, "entities": [], "edges": [], "error": str(e), "elapsed_ms": int((time.time() - t0) * 1000)}

    if not q:
        return {"ok": True, "query": q, "entities": [], "edges": []}
    cache_key = f"graph.evidence|{q}|{int(limit or 60)}|{int(entity_limit or 5)}|{','.join([str(x).strip() for x in (rel_types or []) if str(x).strip()])}|{str(collection or '')}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    driver = get_graph_driver()
    if driver is None:
        return {"ok": False, "error": "graph_not_available", "query": q, "entities": [], "edges": []}
    lim = int(limit or 60)
    if lim < 1:
        lim = 1
    if lim > 500:
        lim = 500
    ent_lim = int(entity_limit or 5)
    if ent_lim < 1:
        ent_lim = 1
    if ent_lim > 20:
        ent_lim = 20
    rel_types_clean = [str(x).strip() for x in (rel_types or []) if str(x).strip()]
    rel_types_param = rel_types_clean if rel_types_clean else None
    t0 = time.time()
    try:
        import unicodedata as _ud
        def _strip_vi(s2: str) -> str:
            return _ud.normalize("NFD", s2.lower()).encode("ascii", "ignore").decode("ascii")

        q_ascii = _strip_vi(q)
        keywords = [w for w in q_ascii.split() if len(w) >= 3][:4]

        with driver.session() as s:
            def _query_entities(col: Optional[str]) -> List[dict]:
                # Try exact CONTAINS first
                rows = list(
                    s.run(
                        """
                        WITH toLower($q) AS q
                        MATCH (e:Entity)
                        WHERE toLower(e.name) CONTAINS q AND ($collection IS NULL OR e.collection = $collection)
                        RETURN id(e) AS id, e.name AS name, labels(e) AS labels, e.collection AS collection, e.id_doc AS id_doc
                        LIMIT $ent_lim
                        """,
                        q=q,
                        ent_lim=ent_lim,
                        collection=col,
                    )
                )
                if rows:
                    return [r.data() for r in rows]
                # Fallback: ASCII-stripped keyword search
                if not keywords:
                    return []
                kw_results: List[dict] = []
                seen_ids: set = set()
                for kw in keywords:
                    kw_rows = list(
                        s.run(
                            """
                            MATCH (e:Entity)
                            WHERE ($collection IS NULL OR e.collection = $collection)
                            RETURN id(e) AS id, e.name AS name, labels(e) AS labels, e.collection AS collection, e.id_doc AS id_doc
                            LIMIT 300
                            """,
                            collection=col,
                        )
                    )
                    for r in kw_rows:
                        rid = r.get("id")
                        if rid in seen_ids:
                            continue
                        name_ascii = _strip_vi(str(r.get("name") or ""))
                        if kw in name_ascii:
                            seen_ids.add(rid)
                            kw_results.append(r.data())
                        if len(kw_results) >= ent_lim:
                            break
                    if len(kw_results) >= ent_lim:
                        break
                return kw_results[:ent_lim]

            if collection:
                ent_rows = _query_entities(collection)
            else:
                ent_rows = _query_entities("demo")
                if not ent_rows:
                    ent_rows = _query_entities(None)
            ent_ids = [r.get("id") for r in ent_rows if r.get("id") is not None]
            edges = []
            if ent_ids:
                edges = [
                    r.data()
                    for r in s.run(
                        """
                        UNWIND $ids AS mg_id
                        MATCH (e:Entity) WHERE id(e) = mg_id
                        MATCH (e)-[r]-(n)
                        WHERE ($rel_types IS NULL OR type(r) IN $rel_types)
                          AND ($collection IS NULL OR r.collection = $collection)
                        RETURN
                          id(e) AS entity_id,
                          e.name AS entity_name,
                          CASE WHEN startNode(r) = e THEN 'OUT' ELSE 'IN' END AS dir,
                          type(r) AS rel,
                          id(n) AS other_id,
                          n.name AS other_name,
                          labels(n) AS other_labels,
                          r.id_doc AS id_doc,
                          r.id_chunk AS id_chunk,
                          r.collection AS collection
                        LIMIT $lim
                        """,
                        ids=ent_ids,
                        rel_types=rel_types_param,
                        collection=collection,
                        lim=lim,
                    )
                ]
        out = {"ok": True, "query": q, "entities": ent_rows, "edges": edges, "elapsed_ms": int((time.time() - t0) * 1000)}
        _cache_set(cache_key, out, float(os.environ.get("LG_GRAPH_EVIDENCE_CACHE_TTL_S") or 60.0))
        return out
    except Exception as e:
        try:
            reset_graph_driver()
        except Exception:
            pass
        return {"ok": False, "query": q, "entities": [], "edges": [], "error": str(e), "elapsed_ms": int((time.time() - t0) * 1000)}

