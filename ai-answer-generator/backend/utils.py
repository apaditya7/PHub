import json
import random
import time
from datetime import datetime
from typing import Any, Dict, Optional


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def stable_seed(seed: Optional[int]) -> random.Random:
    rng = random.Random()
    if seed is None:
        rng.seed(time.time())
    else:
        rng.seed(seed)
    return rng


def safe_json_loads(payload: str) -> Dict[str, Any]:
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        raise ValueError("invalid_json")


def stringify(data: Dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=True)
