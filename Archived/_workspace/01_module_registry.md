# Module Registry (Metadata Only)

This file indexes reusable modules under `core_lib/` only.
Last updated: 2026-06-19

## Core Modules

| Name | Path | Inputs | Outputs | Description |
|---|---|---|---|---|
| settings | core_lib/config/settings.py | config files | Settings object | Central configuration management |
| adapters_blackbox | core_lib/ragas_eval/adapters_blackbox.py | model name, API key | LLM adapter | Black-box model adapter for RAGAS |
| adapters_inprocess | core_lib/ragas_eval/adapters_inprocess.py | model instance | LLM adapter | In-process model adapter for RAGAS |
| dataset_io | core_lib/ragas_eval/dataset_io.py | file path | dataset dict | Load/save RAGAS evaluation datasets |
| gating | core_lib/ragas_eval/gating.py | metrics, thresholds | pass/fail | Quality gate evaluation logic |
| ragas_runner | core_lib/ragas_eval/ragas_runner.py | dataset, config | evaluation results | Run RAGAS evaluation pipeline |
| reporting | core_lib/ragas_eval/reporting.py | eval results | report files | Generate evaluation reports |
| schemas | core_lib/ragas_eval/schemas.py | - | Pydantic models | Data schemas for evaluation |
| grounding_policy | core_lib/grounding/grounding_policy.py | query, context | grounded response | Grounding policy enforcement |

## Notes

- Modules are Python-based (backend utilities)
- Frontend (medical-consultation-app) uses TypeScript/React
- No cross-referencing between Python core_lib and TS lib/ needed
- This registry tracks Python reusable components only

## Usage Pattern

```python
# Example: Use RAGAS evaluation
from core_lib.ragas_eval.ragas_runner import run_evaluation
from core_lib.ragas_eval.dataset_io import load_dataset

dataset = load_dataset("path/to/test_cases.json")
results = run_evaluation(dataset, config)
```

