import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from utils import now_iso

RUNS_DIR = os.path.join(os.path.dirname(__file__), "runs")


@dataclass
class RunRecord:
    run_id: str
    started_at: str
    finished_at: str
    data: Dict[str, Any]


def save_run(record: Dict[str, Any]) -> str:
    os.makedirs(RUNS_DIR, exist_ok=True)
    run_id = record["run_id"]
    path = os.path.join(RUNS_DIR, f"{run_id}.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(record, handle, ensure_ascii=True, indent=2)
    return run_id


def load_run(run_id: str) -> Dict[str, Any]:
    path = os.path.join(RUNS_DIR, f"{run_id}.json")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def list_runs() -> List[Dict[str, Any]]:
    os.makedirs(RUNS_DIR, exist_ok=True)
    runs = []
    for filename in sorted(os.listdir(RUNS_DIR), reverse=True):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(RUNS_DIR, filename)
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        runs.append(
            {
                "run_id": data["run_id"],
                "started_at": data.get("started_at"),
                "finished_at": data.get("finished_at"),
                "final_number": data.get("final_number"),
                "status": data.get("status", "complete"),
            }
        )
    return runs


def create_record(run_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "run_id": run_id,
        "started_at": now_iso(),
        "finished_at": None,
        "status": "running",
        "config": config,
        "stages": [],
        "record_on_appeal": [],
        "final_number": None,
        "final_answer": None,
    }


def finalize_record(record: Dict[str, Any], final_number: int, final_answer: Optional[str]) -> Dict[str, Any]:
    record["finished_at"] = now_iso()
    record["status"] = "complete"
    record["final_number"] = final_number
    record["final_answer"] = final_answer
    return record
