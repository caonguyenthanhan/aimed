"""LLMOps settings loader.

Settings are loaded from:
1) Environment variables (.env is supported if python-dotenv is installed)
2) YAML config file (configs/llmops.yaml by default)

Environment variables can override YAML by providing dedicated *_ENV indirections
in the YAML (e.g. blackbox.base_url_env: CPU_SERVER_URL).
"""

from __future__ import annotations

from pathlib import Path
import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, ValidationError


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _try_load_dotenv(repo_root: Path) -> None:
    try:
        from dotenv import load_dotenv  # type: ignore
    except Exception:
        return
    load_dotenv(dotenv_path=repo_root / ".env", override=False)


def _read_yaml(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        import yaml  # type: ignore
    except Exception as e:
        raise RuntimeError(f"missing_dependency:PyYAML:{e}")
    raw = path.read_text(encoding="utf-8")
    data = yaml.safe_load(raw) if raw.strip() else {}
    if not isinstance(data, dict):
        return {}
    return data


class JsonlSinkSettings(BaseModel):
    enabled: bool = True
    events_path: str
    metrics_path: str
    max_record_bytes: int = 20000


class LoggingSinksSettings(BaseModel):
    jsonl: JsonlSinkSettings


class LoggingSettings(BaseModel):
    enabled: bool = True
    sinks: LoggingSinksSettings


class LangsmithSettings(BaseModel):
    enabled: bool = True
    tracing: bool = True
    project: str = "medical-consulting-system"
    endpoint: str = "https://api.smith.langchain.com"
    sample_rate: float = 1.0
    log_inputs: bool = True
    log_outputs: bool = True
    max_payload_chars: int = 16000


class TracingSettings(BaseModel):
    enabled: bool = True
    provider: Literal["langsmith"] = "langsmith"
    langsmith: LangsmithSettings


class PromptInjectionSettings(BaseModel):
    enabled: bool = True
    max_chars: int = 8000
    blocked_patterns: List[str] = Field(default_factory=list)
    blocked_substrings: List[str] = Field(default_factory=list)
    allow_on_match: bool = False
    user_facing_block_message: str = "I can't help with that request."


class FallbackToolSpec(BaseModel):
    name: str
    args: Dict[str, Any] = Field(default_factory=dict)


class GroundingSettings(BaseModel):
    enabled: bool = True
    require_context_for_profiles: List[str] = Field(default_factory=list)
    context_min_chars: int = 120
    fallback_tools: List[FallbackToolSpec] = Field(default_factory=list)
    user_facing_no_context_message: str = "I need more context to answer safely."


class SemanticRouterRoute(BaseModel):
    name: str
    utterances: List[str] = Field(default_factory=list)


class SemanticRouterSettings(BaseModel):
    enabled: bool = False
    encoder: Literal["openai"] = "openai"
    threshold: float = 0.62
    routes: List[SemanticRouterRoute] = Field(default_factory=list)


class RoutingSettings(BaseModel):
    enabled: bool = True
    provider: Literal["semantic_router"] = "semantic_router"
    semantic_router: SemanticRouterSettings


class GuardrailsSettings(BaseModel):
    enabled: bool = True
    prompt_injection: PromptInjectionSettings
    grounding: GroundingSettings
    routing: RoutingSettings


class EvalLLMSettings(BaseModel):
    provider: Literal["openai_like"] = "openai_like"
    base_url_env: str = "LLMOPS_EVAL_LLM_BASE_URL"
    api_key_env: str = "LLMOPS_EVAL_LLM_API_KEY"
    model: str
    fallback_base_url_env: str = "FOZA_BASE_URL"
    fallback_api_key_envs: List[str] = Field(default_factory=lambda: ["FOZA_TOKEN", "FOZA_TOKEN_2"])
    fallback_model_env: str = "LLM_MODEL_NAME"


class EvalEmbeddingsSettings(BaseModel):
    provider: Literal["openai_like"] = "openai_like"
    base_url_env: str = "LLMOPS_EVAL_EMBEDDINGS_BASE_URL"
    api_key_env: str = "LLMOPS_EVAL_EMBEDDINGS_API_KEY"
    model: str
    fallback_base_url_env: str = "FOZA_BASE_URL"
    fallback_api_key_envs: List[str] = Field(default_factory=lambda: ["FOZA_TOKEN", "FOZA_TOKEN_2"])


class EvalGatingSettings(BaseModel):
    enabled: bool = True
    baseline_path: str
    max_relative_drop: float = 0.08
    min_quality: Dict[str, float] = Field(default_factory=dict)


class EvalReportingSettings(BaseModel):
    labels: Dict[str, str] = Field(default_factory=dict)
    metric_map: Dict[str, List[str]] = Field(default_factory=dict)


class RagasMetricFlags(BaseModel):
    faithfulness: bool = True
    answer_relevance: bool = True
    context_precision: bool = True
    context_recall: bool = True
    cypher_correctness: bool = True


class RagasSettings(BaseModel):
    enabled: bool = True
    metrics: RagasMetricFlags
    llm: EvalLLMSettings
    embeddings: EvalEmbeddingsSettings


class EvalDatasetSettings(BaseModel):
    sample_path: str


class EvalBlackboxSettings(BaseModel):
    base_url_env: str = "CPU_SERVER_URL"
    endpoint_path: str = "/v1/agent-chat"
    timeout_s: int = 60


class EvalInProcessSettings(BaseModel):
    enabled: bool = True


class EvalSettings(BaseModel):
    enabled: bool = True
    ragas: RagasSettings
    dataset: EvalDatasetSettings
    blackbox: EvalBlackboxSettings
    inprocess: EvalInProcessSettings
    gating: EvalGatingSettings
    reporting: EvalReportingSettings


class LlmopsSettings(BaseModel):
    version: int = 1
    logging: LoggingSettings
    tracing: TracingSettings
    guardrails: GuardrailsSettings
    eval: EvalSettings


_SETTINGS: Optional[LlmopsSettings] = None


def load_settings(*, force_reload: bool = False) -> LlmopsSettings:
    repo_root = _repo_root()
    _try_load_dotenv(repo_root)

    global _SETTINGS
    if _SETTINGS is not None and not force_reload:
        return _SETTINGS

    config_path = os.environ.get("LLMOPS_CONFIG_PATH")
    if config_path:
        yaml_path = Path(config_path)
    else:
        yaml_path = repo_root / "configs" / "llmops.yaml"

    data = _read_yaml(yaml_path)
    try:
        settings = LlmopsSettings.model_validate(data)
    except ValidationError as e:
        raise RuntimeError(f"invalid_llmops_config:{yaml_path}:{e}")

    _SETTINGS = settings
    return settings
