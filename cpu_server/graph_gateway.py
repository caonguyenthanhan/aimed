import os
import time
import logging
from typing import Any, Optional

try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None

logger = logging.getLogger("graph_gateway")

_driver = None


def get_graph_driver(max_attempts: int = 3, base_delay: float = 1.0) -> Any:
    global _driver
    if GraphDatabase is None:
        logger.error("Neo4j python package is not installed.")
        return None

    if _driver is not None:
        try:
            # Verify existing connection is alive
            with _driver.session() as s:
                s.run("RETURN 1").consume()
            return _driver
        except Exception as e:
            logger.warning(f"Graph DB connection check failed: {e}. Resetting driver...")
            reset_graph_driver()

    uri = (os.environ.get("GRAPH_BOLT_URL") or os.environ.get("NEO4J_URI") or "bolt://127.0.0.1:7687").strip()
    user = (os.environ.get("GRAPH_USER") or os.environ.get("NEO4J_USER") or "").strip()
    password = (os.environ.get("GRAPH_PASSWORD") or os.environ.get("NEO4J_PASSWORD") or "").strip()
    auth = (user, password) if (user and password) else None

    attempt = 0
    while attempt < max_attempts:
        attempt += 1
        try:
            logger.info(f"Connecting to Graph DB at {uri} (attempt {attempt}/{max_attempts})...")
            d = GraphDatabase.driver(uri, auth=auth)
            with d.session() as s:
                s.run("RETURN 1").consume()
            _driver = d
            logger.info("Graph DB driver successfully initialized and verified.")
            return _driver
        except Exception as e:
            delay = base_delay * (2 ** (attempt - 1))
            logger.warning(
                f"Graph DB connection attempt {attempt} failed: {e}. "
                f"Retrying in {delay:.2f}s..."
            )
            if attempt >= max_attempts:
                break
            time.sleep(delay)

    _driver = None
    return None


def reset_graph_driver() -> None:
    global _driver
    if _driver is not None:
        try:
            _driver.close()
            logger.info("Graph DB driver closed successfully.")
        except Exception as e:
            logger.warning(f"Error while closing Graph DB driver: {e}")
        _driver = None


def compress_graph_evidence(graph_result: dict, max_entities: int = 5, max_edges: int = 10) -> dict:
    if not graph_result:
        return {"ok": False, "entities": [], "relations": []}
    
    ok = bool(graph_result.get("ok"))
    if not ok:
        return {"ok": False, "entities": [], "relations": [], "error": graph_result.get("error")}
        
    entities = graph_result.get("entities") or []
    edges = graph_result.get("edges") or []
    
    compressed_entities = []
    for e in entities[:max_entities]:
        if isinstance(e, dict):
            name = e.get("name") or e.get("entity") or ""
            if name:
                compressed_entities.append(name)
                
    compressed_relations = []
    for edge in edges[:max_edges]:
        if isinstance(edge, dict):
            src = edge.get("entity_name") or ""
            rel = edge.get("rel") or ""
            dst = edge.get("other_name") or ""
            if src and dst:
                compressed_relations.append(f"{src} -[{rel}]-> {dst}")
                
    return {
        "ok": True,
        "entities": compressed_entities,
        "relations": compressed_relations
    }


def compress_tool_results(tool_results: dict) -> dict:
    if not tool_results or not isinstance(tool_results, dict):
        return {}
        
    compressed = {}
    
    # 1. Graph RAG
    if "graph.evidence" in tool_results:
        compressed["graph.evidence"] = compress_graph_evidence(tool_results["graph.evidence"])
        
    # 2. Web Search
    if "web.search" in tool_results:
        web_res = tool_results["web.search"] or {}
        results = web_res.get("results") or []
        compressed_web = []
        for r in results[:3]:
            if isinstance(r, dict):
                snippet = str(r.get("snippet") or "")
                if len(snippet) > 150:
                    snippet = snippet[:147] + "..."
                compressed_web.append({
                    "title": r.get("title") or "",
                    "snippet": snippet
                })
        compressed["web.search"] = {
            "ok": bool(web_res.get("ok")),
            "results": compressed_web
        }
        
    # 3. YouTube Search / YouTube Recommend
    for yt_key in ["youtube.search", "youtube.recommend_music"]:
        if yt_key in tool_results:
            yt_res = tool_results[yt_key] or {}
            results = yt_res.get("results") or []
            compressed_yt = []
            for r in results[:3]:
                if isinstance(r, dict):
                    compressed_yt.append({
                        "videoId": r.get("videoId") or "",
                        "title": r.get("title") or ""
                    })
            compressed[yt_key] = {
                "ok": bool(yt_res.get("ok")),
                "results": compressed_yt
            }
            
    # 4. YouTube Video Detail
    if "youtube.video" in tool_results:
        yt_vid = tool_results["youtube.video"] or {}
        video = yt_vid.get("video") or {}
        snippet = video.get("snippet") or {}
        compressed["youtube.video"] = {
            "ok": bool(yt_vid.get("ok")),
            "video": {
                "title": snippet.get("title") or "",
                "description": (snippet.get("description") or "")[:200] + "..." if snippet.get("description") else ""
            }
        }
        
    # Copy any other keys unchanged (like graph.status)
    for k, v in tool_results.items():
        if k not in ["graph.evidence", "web.search", "youtube.search", "youtube.recommend_music", "youtube.video"]:
            compressed[k] = v
            
    return compressed
