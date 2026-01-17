# Stupid Question Courtroom

An intentionally over-engineered courtroom simulation that answers a silly user question through public, adversarial, multi-stage reasoning. The process is the product: transcripts, exhibits, dissents, and votes are all visible.

## What it does
- Users enter a “stupid question” (e.g., socks color, what time is it, etc.).
- A staged court (Trial → Appeals → Supreme → Senate) debates and produces an answer.
- The UI streams each agent response live and displays structured artifacts.
- A final “court answer” is extracted from the record and shown prominently.

## What’s implemented
- React UI with live streaming, transcript feed, decision cards, record-on-appeal, supreme opinion, and senate roll call.
- Python FastAPI backend with multi-stage orchestration and record persistence.
- Config-driven agent roles and model mapping (OpenAI).
- Strict JSON schema per agent (public artifacts only, no hidden chain-of-thought).
- 15-agent lineup for cost control.

## Required API key
Set `OPENAI_API_KEY` in `random-number-generator/.env`.

Example `.env`:
```
OPENAI_API_KEY=sk-...
```

## Run backend
```
cd random-number-generator/backend
./.venv/bin/uvicorn main:app --port 5050
```

## Run frontend
```
cd random-number-generator/frontend
npm run dev
```

The frontend proxies `/api` requests to the backend on port 5050.

## Key files
- `backend/roles.py` — system prompts and JSON schema.
- `backend/courts.py` — court orchestration and streaming logic.
- `backend/main.py` — API endpoints.
- `frontend/src/App.tsx` — UI layout and streaming client.

## Agent lineup (15)
- Trial: Bailiff, Prosecution A, Defense A, Expert Witness, Trial Judge
- Appeals: Appellate Judge A, B, C
- Supreme: Chief Justice, Justice Originalist, Justice Utilitarian, Justice Empiricist
- Senate: Majority Leader, Minority Leader, Senator 1

## Notes
- The backend expects agents to put the direct answer in `claims[0]` as `ANSWER: <short answer>`.
- Mock mode can be toggled in backend config if needed.
- Runs are saved to `backend/runs/` and can be replayed in the UI.

## Next steps (optional)
- Add a compact “by stage” transcript view.
- Add HTML export of the full record.
- Add richer voting rules and dissent formatting.
