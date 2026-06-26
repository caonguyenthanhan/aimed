"""Dataset IO for evaluation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import List

from .schemas import EvalSample


def load_jsonl_dataset(path: Path) -> List[EvalSample]:
    rows: List[EvalSample] = []
    if not path.exists():
        return rows
    for i, line in enumerate(path.read_text(encoding="utf-8").splitlines()):
        s = line.strip()
        if not s:
            continue
        obj = json.loads(s)
        if "id" not in obj:
            obj["id"] = f"sample-{i+1}"
        rows.append(EvalSample.model_validate(obj))
    return rows

