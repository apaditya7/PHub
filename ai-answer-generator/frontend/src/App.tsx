import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl, exportRun, getRun, listRuns } from "./api";
import type {
  RunRecord,
  RunSummary,
  StageDecision,
  StageRecord,
  TranscriptEntry,
} from "./types";
import Nav from "./components/Nav";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";

const STAGES = [
  { id: "trial", label: "Trial" },
  { id: "appeals", label: "Appeals" },
  { id: "supreme", label: "Supreme" },
  { id: "senate", label: "Senate" },
] as const;

function TypewriterText({ text, speedMs = 40 }: { text: string; speedMs?: number }) {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const [count, setCount] = useState(words.length ? 1 : 0);

  useEffect(() => {
    setCount(words.length ? 1 : 0);
  }, [words.length]);

  useEffect(() => {
    if (count >= words.length) return;
    const timer = window.setInterval(() => {
      setCount((prev) => {
        if (prev >= words.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, speedMs);
    return () => window.clearInterval(timer);
  }, [count, words.length, speedMs]);

  return <>{words.slice(0, count).join(" ")}</>;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString();
}

function flattenTranscripts(stages: StageRecord[] | undefined): TranscriptEntry[] {
  if (!stages) return [];
  const order = new Map(STAGES.map((stage, index) => [stage.id, index]));
  return [...stages]
    .sort(
      (a, b) =>
        (order.get(a.level) ?? 0) - (order.get(b.level) ?? 0),
    )
    .flatMap((stage) => stage.transcripts);
}

export default function App() {
  const [run, setRun] = useState<RunRecord | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("What color socks should I wear today?");
  const streamRef = useRef<EventSource | null>(null);

  const transcripts = useMemo(() => flattenTranscripts(run?.stages), [run]);
  const stageMap = useMemo(() => {
    const map = new Map<string, StageRecord>();
    run?.stages.forEach((stage) => map.set(stage.level, stage));
    return map;
  }, [run]);

  const stageAnswer = (stage: StageRecord) => {
    const latest = [...stage.transcripts].reverse().find((entry) => {
      const claim = entry.claims?.[0];
      return typeof claim === "string" && claim.startsWith("ANSWER:");
    });
    if (!latest) return null;
    return latest.claims[0].replace("ANSWER:", "").trim();
  };

  const loadRuns = async () => {
    const data = await listRuns();
    setRuns(data);
  };

  const emptyDecision = (level: string): StageDecision => ({
    level: level as StageDecision["level"],
    protocol: "pending",
  });

  const buildRecord = (runId: string, config: Record<string, unknown>): RunRecord => ({
    run_id: runId,
    started_at: new Date().toISOString(),
    finished_at: null,
    status: "running",
    config,
    stages: [],
    record_on_appeal: [],
    final_number: null,
  });

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    if (streamRef.current) {
      streamRef.current.close();
    }
    const params = new URLSearchParams({
      question,
    });
    const streamUrl = apiUrl(`/api/run/stream?${params.toString()}`);
    const source = new EventSource(streamUrl);
    streamRef.current = source;

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "meta") {
          setRun(buildRecord(payload.run_id, payload.config ?? {}));
          return;
        }
        if (payload.type === "agent") {
          const entry = payload.entry as TranscriptEntry;
          const level = payload.level as StageRecord["level"];
          setRun((prev) => {
            if (!prev) return prev;
            const stages = [...prev.stages];
            let stage = stages.find((item) => item.level === level);
            if (!stage) {
              stage = {
                level,
                decision: emptyDecision(level),
                transcripts: [],
                exhibits: [],
              };
              stages.push(stage);
            }
            const updatedStage = {
              ...stage,
              transcripts: [...stage.transcripts, entry],
            };
            const updatedStages = stages.map((item) =>
              item.level === level ? updatedStage : item,
            );
            return { ...prev, stages: updatedStages };
          });
          return;
        }
        if (payload.type === "stage") {
          const level = payload.level as StageRecord["level"];
          setRun((prev) => {
            if (!prev) return prev;
            const stages = [...prev.stages];
            let stage = stages.find((item) => item.level === level);
            if (!stage) {
              stage = {
                level,
                decision: emptyDecision(level),
                transcripts: [],
                exhibits: [],
              };
              stages.push(stage);
            }
            const updatedStage = {
              ...stage,
              decision: payload.decision,
              exhibits: payload.exhibits ?? [],
            };
            const updatedStages = stages.map((item) =>
              item.level === level ? updatedStage : item,
            );
            const recordOnAppeal = [
              ...prev.record_on_appeal.filter((item) => item.level !== level),
              {
                level,
                decision: payload.decision,
                exhibits: payload.exhibits ?? [],
              },
            ];
            return { ...prev, stages: updatedStages, record_on_appeal: recordOnAppeal };
          });
          return;
        }
        if (payload.type === "final") {
          setRun(payload.record as RunRecord);
          setIsRunning(false);
          loadRuns();
          source.close();
          return;
        }
        if (payload.type === "error") {
          setError(payload.detail ?? "Unable to run trial.");
          setIsRunning(false);
          source.close();
        }
      } catch (parseError) {
        setError("Stream parse error.");
        setIsRunning(false);
        source.close();
      }
    };

    source.onerror = () => {
      setError("Stream connection error.");
      setIsRunning(false);
      source.close();
    };
  };

  const handleReplay = async (runId: string) => {
    try {
      const record = await getRun(runId);
      setRun(record);
    } catch (err) {
      setError("Run not found.");
    }
  };

  const handleExport = async () => {
    if (!run) return;
    const record = await exportRun(run.run_id);
    const blob = new Blob([JSON.stringify(record, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rng-record-${run.run_id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
        <Nav title="Dept. HUB (Department of Highly Unecessary Beaureaucracy)" />

        {/* Input Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Ask the Court</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What should I do today?"
              className="h-11 text-base"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleRun} disabled={isRunning}>
                {isRunning ? "Running Court..." : "Run Trial"}
              </Button>
              {error ? <span className="text-sm text-primary">{error}</span> : null}
            </div>
          </CardContent>
        </Card>

        {/* Final Answer + Stage Progress Row */}
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Final Court Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {run?.final_answer ?? run?.final_number ?? "--"}
              </div>
              {run?.finished_at ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTime(run.finished_at)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stage Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                {STAGES.map((stage, index) => {
                  const done = stageMap.has(stage.id);
                  return (
                    <div key={stage.id} className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium ${
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="text-sm">
                        <p className={done ? "font-medium" : "text-muted-foreground"}>
                          {stage.label}
                        </p>
                      </div>
                      {index < STAGES.length - 1 ? (
                        <span className="hidden h-px w-6 bg-border md:block" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
          {/* Transcript Feed */}
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="pb-3">
              <CardTitle>Transcript Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {transcripts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transcript yet.</p>
              ) : (
                <div className="space-y-3 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-2">
                  {transcripts.map((entry, index) => (
                    <Card key={`${entry.role}-${index}`} className="border-border/50">
                      <CardContent className="space-y-2 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{entry.role}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.level.toUpperCase()} · {entry.message_type} ·{" "}
                              {entry.metadata.model}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(entry.metadata.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          <TypewriterText text={entry.transcript_text} speedMs={30} />
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Proposed: {entry.proposed_number ?? "-"}</span>
                          <span>Confidence: {entry.confidence.toFixed(2)}</span>
                        </div>
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer text-sm text-foreground">
                            Reasoning artifacts
                          </summary>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <div>
                              <p className="font-semibold text-foreground">Claims</p>
                              <ul className="list-disc pl-4">
                                {entry.claims.map((item, idx) => (
                                  <li key={`claim-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Evidence</p>
                              <ul className="list-disc pl-4">
                                {entry.evidence.map((item, idx) => (
                                  <li key={`evidence-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Critiques</p>
                              <ul className="list-disc pl-4">
                                {entry.critiques.map((item, idx) => (
                                  <li key={`critique-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Counterarguments</p>
                              <ul className="list-disc pl-4">
                                {entry.counterarguments.map((item, idx) => (
                                  <li key={`counter-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </details>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1">
            {/* Decision Ledger */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Decision Ledger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {run && run.stages.length > 0 ? (
                  run.stages.map((stage) => (
                    <div key={stage.level} className="border-b border-border/30 pb-2 last:border-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {stage.level}
                      </p>
                      <p className="text-sm font-medium">{stageAnswer(stage) ?? "-"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No decisions yet.</p>
                )}
                <Button variant="outline" size="sm" onClick={handleExport} disabled={!run}>
                  Export Record
                </Button>
              </CardContent>
            </Card>

            {/* Supreme Opinion - Only show if available */}
            {stageMap.get("supreme")?.decision.opinion && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Supreme Opinion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Syllabus</p>
                    <p className="text-muted-foreground">
                      {stageMap.get("supreme")?.decision.opinion?.syllabus}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Majority</p>
                    <p className="text-muted-foreground">
                      {stageMap.get("supreme")?.decision.opinion?.majority}
                    </p>
                  </div>
                  {stageMap.get("supreme")?.decision.opinion?.dissents?.length ? (
                    <div>
                      <p className="font-medium text-foreground">Dissents</p>
                      <ul className="list-disc pl-4 text-muted-foreground">
                        {stageMap
                          .get("supreme")
                          ?.decision.opinion?.dissents.map((dissent, index) => (
                            <li key={`dissent-${index}`}>
                              {dissent?.reason ?? "No dissent details."}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Senate Roll Call - Only show if available */}
            {stageMap.get("senate")?.decision.roll_call && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Senate Roll Call</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {stageMap.get("senate")?.decision.amendments?.length ? (
                    <div>
                      <p className="font-medium text-foreground">Amendments</p>
                      <ul className="list-disc pl-4 text-muted-foreground">
                        {stageMap
                          .get("senate")
                          ?.decision.amendments?.map((item, index) => (
                            <li key={`amendment-${index}`}>{item}</li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    {stageMap
                      .get("senate")
                      ?.decision.roll_call?.map((vote, index) => (
                        <div
                          key={`vote-${index}`}
                          className="flex items-center justify-between border-b border-border/30 py-1 text-xs last:border-0"
                        >
                          <span className="font-medium">{vote.senator}</span>
                          <span className="text-muted-foreground">{vote.decision}</span>
                          <span>{vote.proposed_number ?? "-"}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Past Runs */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Past Runs</CardTitle>
                  <Button variant="ghost" size="sm" onClick={loadRuns}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No runs yet.</p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {runs.map((item) => (
                      <button
                        key={item.run_id}
                        type="button"
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted"
                        onClick={() => handleReplay(item.run_id)}
                      >
                        <span className="font-mono">{item.run_id.slice(0, 6)}</span>
                        <span className="text-muted-foreground">{formatTime(item.started_at)}</span>
                        <span className="font-medium">{item.final_number ?? "-"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
