import { RunRecord, RunSummary } from "./types";

export interface RunRequest {
  seed?: number;
  deterministic?: boolean;
  mock_mode?: boolean;
}

export async function runTrial(payload: RunRequest): Promise<RunRecord> {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as { detail?: string };
      throw new Error(data.detail ?? "run_failed");
    }
    const text = await response.text();
    throw new Error(text || "run_failed");
  }
  const data = (await response.json()) as { record: RunRecord };
  return data.record;
}

export async function listRuns(): Promise<RunSummary[]> {
  const response = await fetch("/api/runs");
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { runs: RunSummary[] };
  return data.runs;
}

export async function getRun(runId: string): Promise<RunRecord> {
  const response = await fetch(`/api/runs/${runId}`);
  if (!response.ok) {
    throw new Error("run_not_found");
  }
  const data = (await response.json()) as { run: RunRecord };
  return data.run;
}

export async function exportRun(runId: string): Promise<RunRecord> {
  const response = await fetch(`/api/runs/${runId}/export`);
  if (!response.ok) {
    throw new Error("export_failed");
  }
  return (await response.json()) as RunRecord;
}
