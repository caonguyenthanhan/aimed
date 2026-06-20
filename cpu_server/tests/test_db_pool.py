import os
import pytest
import psycopg
from psycopg_pool import ConnectionPool
from cpu_server import db

def test_get_pool_singleton(monkeypatch):
    # Mock get_database_url or set env variable
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/test")
    db._pool = None
    pool1 = db.get_pool()
    pool2 = db.get_pool()
    assert isinstance(pool1, ConnectionPool)
    assert pool1 is pool2
    # Clean up pool
    pool1.close()
    db._pool = None

def test_db_connect_success(monkeypatch):
    # Verify we can obtain connection from pool using db_connect context manager
    db._pool = None
    
    # We will mock the pool.connection context manager to return a mock connection
    mock_conn = "mock_connection"
    
    class MockConnectionContextManager:
        def __enter__(self):
            return mock_conn
        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

    class MockPool:
        closed = False
        def open(self):
            pass
        def connection(self):
            return MockConnectionContextManager()
        def close(self):
            pass

    mock_pool_instance = MockPool()
    monkeypatch.setattr(db, "get_pool", lambda: mock_pool_instance)

    with db.db_connect() as conn:
        assert conn == mock_conn

def test_db_connect_retry_resilience(monkeypatch):
    # Verify that db_connect retries upon operational errors
    db._pool = None
    
    attempts = []
    
    class MockPoolWithError:
        closed = False
        def open(self):
            pass
        def connection(self):
            attempts.append("attempt")
            # Fail on first attempt, succeed on second
            if len(attempts) == 1:
                raise psycopg.OperationalError("Database is down (Neon cold start simulator)")
            
            # Simple context manager return for second attempt
            class SuccessManager:
                def __enter__(self):
                    return "mock_connection_success"
                def __exit__(self, exc_type, exc_val, exc_tb):
                    pass
            return SuccessManager()

    monkeypatch.setattr(db, "get_pool", lambda: MockPoolWithError())
    
    # Use small delay for test speed
    with db.db_connect(max_attempts=3, base_delay=0.01) as conn:
        assert conn == "mock_connection_success"
    
    assert len(attempts) == 2
