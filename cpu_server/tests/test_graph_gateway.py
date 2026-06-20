from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch
from cpu_server import graph_gateway


def test_get_graph_driver_cached():
    # Test that get_graph_driver returns cached driver if it is active
    mock_driver = MagicMock()
    mock_session = MagicMock()
    mock_driver.session.return_value = mock_session
    
    graph_gateway._driver = mock_driver
    driver = graph_gateway.get_graph_driver()
    
    assert driver is mock_driver
    mock_driver.session.assert_called_once()
    mock_session.__enter__.assert_called_once()
    # Cleanup
    graph_gateway._driver = None


def test_get_graph_driver_reconnect_on_cached_error():
    # Test that get_graph_driver resets and reconnects if cached driver session fails
    mock_old_driver = MagicMock()
    # Session fails
    mock_old_driver.session.side_effect = Exception("Connection lost")
    
    mock_new_driver = MagicMock()
    mock_new_session = MagicMock()
    mock_new_driver.session.return_value = mock_new_session
    
    graph_gateway._driver = mock_old_driver
    
    with patch("neo4j.GraphDatabase.driver", return_value=mock_new_driver) as mock_driver_creator:
        driver = graph_gateway.get_graph_driver(max_attempts=1)
        
        assert driver is mock_new_driver
        mock_old_driver.close.assert_called_once()
        mock_driver_creator.assert_called_once()
        
    # Cleanup
    graph_gateway._driver = None


def test_get_graph_driver_retry_exponential_backoff():
    # Test that get_graph_driver retries on failure with backoff delay
    attempts = []
    
    def mock_driver_side_effect(*args, **kwargs):
        attempts.append("fail")
        if len(attempts) < 2:
            raise Exception("Memgraph down")
        mock_driver = MagicMock()
        mock_session = MagicMock()
        mock_driver.session.return_value = mock_session
        return mock_driver

    with patch("neo4j.GraphDatabase.driver", side_effect=mock_driver_side_effect) as mock_driver_creator, \
         patch("time.sleep") as mock_sleep:
        
        graph_gateway._driver = None
        driver = graph_gateway.get_graph_driver(max_attempts=3, base_delay=0.01)
        
        assert driver is not None
        assert len(attempts) == 2
        mock_sleep.assert_called_once_with(0.01)
        
    # Cleanup
    graph_gateway._driver = None


def test_reset_graph_driver():
    # Test that reset_graph_driver closes driver and clears cache
    mock_driver = MagicMock()
    graph_gateway._driver = mock_driver
    
    graph_gateway.reset_graph_driver()
    
    mock_driver.close.assert_called_once()
    assert graph_gateway._driver is None
