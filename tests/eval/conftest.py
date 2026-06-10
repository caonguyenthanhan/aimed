"""Pytest fixtures for LLMOps evaluation."""

from __future__ import annotations

from pathlib import Path
import os
from typing import Iterator

import pytest

from core_lib.llmops import load_settings


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def llmops_settings():
    return load_settings(force_reload=True)


@pytest.fixture(scope="session")
def sample_dataset_path(repo_root: Path, llmops_settings) -> Path:
    p = repo_root / llmops_settings.eval.dataset.sample_path
    return p


def pytest_addoption(parser) -> None:
    parser.addoption("--llmops-eval", action="store_true", default=False)


@pytest.fixture(scope="session")
def llmops_eval_enabled(request) -> bool:
    flag = bool(request.config.getoption("--llmops-eval"))
    env_flag = str(os.environ.get("LLMOPS_EVAL_ENABLED") or "").strip().lower() in ("1", "true", "yes", "on")
    return bool(flag or env_flag)
