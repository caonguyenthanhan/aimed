from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch
from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.memory import MemorySaver
from cpu_server import db
from cpu_server.langgraph_agent import graph


def test_get_checkpointer_pool():
    # Test that get_checkpointer_pool returns a ConnectionPool configured properly
    with patch("cpu_server.db.get_database_url", return_value="postgresql://localhost/dummy"):
        db._checkpointer_pool = None
        pool = db.get_checkpointer_pool()
        assert isinstance(pool, ConnectionPool)
        assert pool.conninfo == "postgresql://localhost/dummy"
        assert pool.kwargs.get("autocommit") is True
        # Clean up
        pool.close()
        db._checkpointer_pool = None


def test_ensure_checkpointer_schema_calls_setup():
    # Test that ensure_checkpointer_schema correctly calls PostgresSaver.setup()
    mock_pool = MagicMock(spec=ConnectionPool)
    with patch("cpu_server.db.get_checkpointer_pool", return_value=mock_pool), \
         patch("langgraph.checkpoint.postgres.PostgresSaver.setup") as mock_setup:
        db.ensure_checkpointer_schema()
        mock_setup.assert_called_once()


def test_build_graph_with_postgres_checkpointer():
    # Test that build_graph successfully compiles with PostgresSaver when pool is available
    mock_pool = MagicMock(spec=ConnectionPool)
    with patch("cpu_server.db.get_checkpointer_pool", return_value=mock_pool), \
         patch("langgraph.checkpoint.postgres.PostgresSaver.setup") as mock_setup:
        compiled_graph = graph.build_graph()
        assert compiled_graph.checkpointer is not None
        assert isinstance(compiled_graph.checkpointer, PostgresSaver)


def test_build_graph_fallback_to_memory_checkpointer():
    # Test that build_graph falls back to MemorySaver when PostgresSaver initialization fails
    with patch("cpu_server.db.get_checkpointer_pool", side_effect=Exception("DB Down")):
        compiled_graph = graph.build_graph()
        assert compiled_graph.checkpointer is not None
        assert isinstance(compiled_graph.checkpointer, MemorySaver)
