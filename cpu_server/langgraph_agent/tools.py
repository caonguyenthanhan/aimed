from __future__ import annotations

import datetime
import importlib
import os
import time
from typing import Any, Dict, List, Optional

import requests


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
    return {"ok": bool(r.get("ok")), "query": q, "results": items, "status": r.get("status")}


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
    return {"ok": bool(r.get("ok")), "query": q, "results": items, "status": r.get("status")}


def youtube_video(videoId: str, timeout_s: float = 10.0) -> Dict[str, Any]:
    timeout_s = timeout_s if timeout_s and timeout_s > 0 else _env_timeout("LG_YOUTUBE_TIMEOUT_S", 10.0)
    key = (os.environ.get("YOUTUBE_API_KEY") or "").strip()
    vid = (videoId or "").strip()
    if not key:
        return {"ok": False, "error": "missing_youtube_api_key"}
    if not vid:
        return {"ok": False, "error": "missing_videoId"}
    r = _http_get_json(
        "https://www.googleapis.com/youtube/v3/videos",
        params={"key": key, "part": "snippet,contentDetails,statistics", "id": vid},
        timeout=timeout_s,
    )
    data = r.get("data") or {}
    items = data.get("items") or []
    item = items[0] if items else None
    return {"ok": bool(r.get("ok")), "video": item, "status": r.get("status")}


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
    srv = importlib.import_module("cpu_server.server")
    driver = getattr(srv, "_get_graph_driver", lambda: None)()
    if driver is None:
        return {"ok": False, "connected": False, "checked_at": datetime.datetime.utcnow().isoformat(), "latency_ms": int((time.time() - t0) * 1000)}
    try:
        with driver.session() as s:
            c = s.run("MATCH (n) RETURN count(n) AS c").single()
            nodes = int(c["c"]) if c and "c" in c else 0
        return {"ok": True, "connected": True, "nodes": nodes, "checked_at": datetime.datetime.utcnow().isoformat(), "latency_ms": int((time.time() - t0) * 1000)}
    except Exception:
        try:
            getattr(srv, "_reset_graph_driver", lambda: None)()
        except Exception:
            pass
        return {"ok": False, "connected": False, "checked_at": datetime.datetime.utcnow().isoformat(), "latency_ms": int((time.time() - t0) * 1000)}


def graph_evidence(query: str, limit: int = 60, entity_limit: int = 5, rel_types: Optional[List[str]] = None, timeout_s: float = 12.0) -> Dict[str, Any]:
    timeout_s = timeout_s if timeout_s and timeout_s > 0 else _env_timeout("LG_GRAPH_TIMEOUT_S", 12.0)
    q = (query or "").strip()
    if not q:
        return {"ok": True, "query": q, "entities": [], "edges": []}
    srv = importlib.import_module("cpu_server.server")
    driver = getattr(srv, "_get_graph_driver", lambda: None)()
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
        with driver.session() as s:
            entities = list(
                s.run(
                    """
                    WITH toLower($q) AS q
                    MATCH (e:Entity)
                    WHERE toLower(e.name) CONTAINS q
                    RETURN e.__mg_id__ AS id, e.name AS name, labels(e) AS labels, e.collection AS collection, e.id_doc AS id_doc
                    LIMIT $ent_lim
                    """,
                    q=q,
                    ent_lim=ent_lim,
                )
            )
            ent_rows = [r.data() for r in entities]
            ent_ids = [r.get("id") for r in ent_rows if r.get("id") is not None]
            edges = []
            if ent_ids:
                edges = [
                    r.data()
                    for r in s.run(
                        """
                        UNWIND $ids AS mg_id
                        MATCH (e:Entity {__mg_id__: mg_id})
                        MATCH (e)-[r]-(n)
                        WHERE $rel_types IS NULL OR type(r) IN $rel_types
                        RETURN
                          e.__mg_id__ AS entity_id,
                          e.name AS entity_name,
                          CASE WHEN startNode(r) = e THEN 'OUT' ELSE 'IN' END AS dir,
                          type(r) AS rel,
                          n.__mg_id__ AS other_id,
                          n.name AS other_name,
                          labels(n) AS other_labels,
                          r.id_doc AS id_doc,
                          r.id_chunk AS id_chunk,
                          r.collection AS collection
                        LIMIT $lim
                        """,
                        ids=ent_ids,
                        rel_types=rel_types_param,
                        lim=lim,
                    )
                ]
        return {"ok": True, "query": q, "entities": ent_rows, "edges": edges, "elapsed_ms": int((time.time() - t0) * 1000)}
    except Exception as e:
        try:
            getattr(srv, "_reset_graph_driver", lambda: None)()
        except Exception:
            pass
        return {"ok": False, "query": q, "entities": [], "edges": [], "error": str(e), "elapsed_ms": int((time.time() - t0) * 1000)}
