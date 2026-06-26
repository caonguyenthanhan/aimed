"""CLI script to run DSPy prompt compilation."""

from __future__ import annotations

from pathlib import Path
import sys

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from core_lib.llmops import load_settings
from core_lib.llmops.eval.dspy_optimizer import run_prompt_compilation


def main() -> int:
    print("=" * 60)
    print("          AiMed DSPy Prompt Compiler & Optimizer")
    print("=" * 60)
    
    # Preflight env check
    import os
    foza_base = (os.environ.get("FOZA_BASE_URL") or "").strip()
    foza_token = (os.environ.get("FOZA_TOKEN") or os.environ.get("FOZA_TOKEN_2") or "").strip()
    
    # If FOZA keys are not configured, tell the user to check settings
    if not foza_base or not foza_token:
        print("[ERROR] Missing FOZA credentials (FOZA_BASE_URL / FOZA_TOKEN).")
        print("Please configure them in your terminal before running prompt compilation.")
        return 1
        
    try:
        settings = load_settings()
        run_prompt_compilation(settings)
        return 0
    except Exception as e:
        print(f"[FATAL] Prompt compilation failed: {e}")
        import traceback
        traceback.print_exc()
        return 2


if __name__ == "__main__":
    sys.exit(main())
