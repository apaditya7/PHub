import os
import json
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents import OpenAIClient
from config import AppConfig, load_config
from courts import DebateManager
from models import RunRequest, RunResponse
from record import create_record, list_runs, load_run, save_run

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/runs")
def runs() -> dict:
    return {"runs": list_runs()}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str) -> dict:
    try:
        return {"run": load_run(run_id)}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="run_not_found") from exc


@app.get("/api/runs/{run_id}/export")
def export_run(run_id: str) -> dict:
    try:
        return load_run(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="run_not_found") from exc


@app.post("/api/run", response_model=RunResponse)
def run_trial(request: RunRequest) -> RunResponse:
    base_config = load_config()
    config = AppConfig(
        mock_mode=request.mock_mode if request.mock_mode is not None else base_config.mock_mode,
        deterministic=request.deterministic
        if request.deterministic is not None
        else base_config.deterministic,
        max_retries=base_config.max_retries,
        request_timeout=base_config.request_timeout,
    )
    api_key = os.getenv("OPENAI_API_KEY", "")
    client = OpenAIClient(api_key=api_key)
    manager = DebateManager(config, client)

    run_id = uuid4().hex
    record = create_record(
        run_id,
        {
            "mock_mode": config.mock_mode,
            "deterministic": config.deterministic,
            "seed": request.seed,
            "question": request.question,
        },
    )
    try:
        final_record = manager.run(record, request.seed, request.question or "No question provided.")
        save_run(final_record)
        return RunResponse(run_id=run_id, record=final_record)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/run/stream")
def run_trial_stream(
    seed: Optional[int] = None,
    deterministic: Optional[bool] = None,
    mock_mode: Optional[bool] = None,
    question: Optional[str] = None,
) -> StreamingResponse:
    base_config = load_config()
    config = AppConfig(
        mock_mode=mock_mode if mock_mode is not None else base_config.mock_mode,
        deterministic=deterministic
        if deterministic is not None
        else base_config.deterministic,
        max_retries=base_config.max_retries,
        request_timeout=base_config.request_timeout,
    )
    api_key = os.getenv("OPENAI_API_KEY", "")
    client = OpenAIClient(api_key=api_key)
    manager = DebateManager(config, client)

    run_id = uuid4().hex
    record = create_record(
        run_id,
        {
            "mock_mode": config.mock_mode,
            "deterministic": config.deterministic,
            "seed": seed,
            "question": question,
        },
    )

    def event_stream():
        meta = {"type": "meta", "run_id": run_id, "config": record["config"]}
        yield f"data: {json.dumps(meta)}\n\n"
        stream = manager.run_stream(record, seed, question or "No question provided.")
        try:
            while True:
                event = next(stream)
                yield f"data: {json.dumps(event)}\n\n"
        except StopIteration as stop:
            final_record = stop.value
            save_run(final_record)
            yield f"data: {json.dumps({'type': 'final', 'record': final_record})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
