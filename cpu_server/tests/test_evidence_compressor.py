from __future__ import annotations

import pytest
from cpu_server.graph_gateway import compress_graph_evidence, compress_tool_results


def test_compress_graph_evidence():
    # Test compressing Neo4j/Memgraph RAG evidence output
    graph_evidence = {
        "ok": True,
        "entities": [
            {"id": 1, "name": "Bệnh cúm", "labels": ["Entity"]},
            {"id": 2, "name": "Sốt nhẹ", "labels": ["Entity"]},
            {"id": 3, "name": "Đau họng", "labels": ["Entity"]},
            {"id": 4, "name": "Ho khan", "labels": ["Entity"]},
            {"id": 5, "name": "Mệt mỏi", "labels": ["Entity"]},
            {"id": 6, "name": "Nghẹt mũi", "labels": ["Entity"]}  # Should be sliced out
        ],
        "edges": [
            {"entity_name": "Bệnh cúm", "rel": "has_symptom", "other_name": "Sốt nhẹ"},
            {"entity_name": "Bệnh cúm", "rel": "has_symptom", "other_name": "Đau họng"},
        ]
    }
    
    res = compress_graph_evidence(graph_evidence, max_entities=5, max_edges=10)
    assert res["ok"] is True
    assert len(res["entities"]) == 5
    assert "Bệnh cúm" in res["entities"]
    assert "Nghẹt mũi" not in res["entities"]
    
    assert len(res["relations"]) == 2
    assert "Bệnh cúm -[has_symptom]-> Sốt nhẹ" in res["relations"]


def test_compress_tool_results_web_search():
    # Test compressing google search results
    tool_results = {
        "web.search": {
            "ok": True,
            "results": [
                {"title": "Cảm cúm là gì", "snippet": "A" * 200},
                {"title": "Cách trị cảm cúm", "snippet": "B" * 50},
                {"title": "Triệu chứng cúm", "snippet": "C" * 10},
                {"title": "Sốt virus", "snippet": "D" * 10}  # Should be sliced out
            ]
        }
    }
    
    res = compress_tool_results(tool_results)
    web_res = res["web.search"]
    assert web_res["ok"] is True
    assert len(web_res["results"]) == 3
    
    # Check snippet length constraint
    assert len(web_res["results"][0]["snippet"]) <= 150
    assert web_res["results"][0]["snippet"].endswith("...")


def test_compress_tool_results_youtube():
    # Test YouTube results compression
    tool_results = {
        "youtube.search": {
            "ok": True,
            "results": [
                {"videoId": "v1", "title": "Video 1", "thumbnail": "url1", "channelTitle": "Ch1"},
                {"videoId": "v2", "title": "Video 2", "thumbnail": "url2", "channelTitle": "Ch2"},
                {"videoId": "v3", "title": "Video 3", "thumbnail": "url3", "channelTitle": "Ch3"},
                {"videoId": "v4", "title": "Video 4", "thumbnail": "url4", "channelTitle": "Ch4"}
            ]
        }
    }
    
    res = compress_tool_results(tool_results)
    yt_res = res["youtube.search"]
    assert yt_res["ok"] is True
    assert len(yt_res["results"]) == 3
    # Check extra metadata keys are removed
    assert "thumbnail" not in yt_res["results"][0]
    assert "channelTitle" not in yt_res["results"][0]
    assert yt_res["results"][0]["videoId"] == "v1"


def test_compress_tool_results_mixed():
    # Test mixed tools including non-compressible ones
    tool_results = {
        "graph.status": {"ok": True, "connected": True, "nodes": 100},
        "graph.evidence": {
            "ok": True,
            "entities": [{"name": "A"}],
            "edges": []
        }
    }
    
    res = compress_tool_results(tool_results)
    assert "graph.status" in res
    assert res["graph.status"]["nodes"] == 100
    assert "entities" in res["graph.evidence"]
