from typing import Any, Dict, Optional

from pydantic import BaseModel


class RunRequest(BaseModel):
    question: str
    seed: Optional[int] = None
    deterministic: Optional[bool] = None
    mock_mode: Optional[bool] = None


class RunResponse(BaseModel):
    run_id: str
    record: Dict[str, Any]
