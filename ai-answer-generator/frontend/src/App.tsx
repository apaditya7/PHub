import { useEffect, useMemo, useRef, useState } from "react";
import { exportRun, getRun, listRuns } from "./api";
import type {
  RunRecord,
  RunSummary,
  StageDecision,
  StageRecord,
  TranscriptEntry,
} from "./types";

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
    const source = new EventSource(`/api/run/stream?${params.toString()}`);
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
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Hack&Roll - Over-Engineered AI</p>
          <h1>Stupid Question Courtroom</h1>
          <p className="subtitle">
            A procedural chain-of-thought spectacle that answers a silly
            question through adversarial legitimacy.
          </p>
        </div>
        <div className="control-card">
          <div className="control-row">
            <label>
              Question
              <input
                type="text"
                className="question-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </label>
          </div>
          <button type="button" onClick={handleRun} disabled={isRunning}>
            {isRunning ? "Running Court..." : "Run Trial"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </header>

      <section className="verdict-panel">
        <div>
          <p className="verdict-label">Final Court Answer</p>
          <p className="verdict-number">
            {run?.final_answer ?? run?.final_number ?? "--"}
          </p>
        </div>
        {run && (
          <p className="verdict-meta">
            Run {run.run_id.slice(0, 8)} · {formatTime(run.finished_at)}
          </p>
        )}
      </section>

      <section className="timeline">
        {STAGES.map((stage) => {
          const done = stageMap.has(stage.id);
          return (
            <div key={stage.id} className={`timeline-step ${done ? "done" : ""}`}>
              <span className="dot" />
              <div>
                <p>{stage.label}</p>
                <span>{done ? "Completed" : "Pending"}</span>
              </div>
            </div>
          );
        })}
      </section>

      <main className="grid">
        <section className="panel transcript">
          <h2>Transcript Feed</h2>
          {transcripts.length === 0 ? (
            <p className="empty">Run the court to populate the record.</p>
          ) : (
            <div className="transcript-list">
              {transcripts.map((entry, index) => (
                <article key={`${entry.role}-${index}`} className="transcript">
                  <header>
                    <div>
                      <h3>{entry.role}</h3>
                      <p className="meta">
                        {entry.level.toUpperCase()} · {entry.message_type} ·
                        {entry.metadata.model}
                      </p>
                    </div>
                    <span className="timestamp">
                      {formatTime(entry.metadata.timestamp)}
                    </span>
                  </header>
                  <p className="transcript-text">
                    <TypewriterText
                      text={entry.transcript_text}
                      speedMs={30}
                    />
                  </p>
                  <div className="artifact-row">
                    <span>Proposed: {entry.proposed_number ?? "-"}</span>
                    <span>Confidence: {entry.confidence.toFixed(2)}</span>
                  </div>
                  <details>
                    <summary>Reasoning artifacts</summary>
                    <div className="artifact-grid">
                      <div>
                        <h4>Claims</h4>
                        <ul>
                          {entry.claims.map((item, idx) => (
                            <li key={`claim-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Evidence</h4>
                        <ul>
                          {entry.evidence.map((item, idx) => (
                            <li key={`evidence-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Critiques</h4>
                        <ul>
                          {entry.critiques.map((item, idx) => (
                            <li key={`critique-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Counterarguments</h4>
                        <ul>
                          {entry.counterarguments.map((item, idx) => (
                            <li key={`counter-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel decisions">
          <h2>Decision Ledger</h2>
          {run ? (
            run.stages.map((stage) => (
              <article key={stage.level} className="decision-card">
                <h3>{stage.level.toUpperCase()}</h3>
                <p className="protocol">{stage.decision.protocol}</p>
                <p className="decision-number">{stageAnswer(stage) ?? "-"}</p>
                <p className="timestamp">{formatTime(stage.decision.timestamp)}</p>
              </article>
            ))
          ) : (
            <p className="empty">No decisions yet.</p>
          )}
          <button type="button" onClick={handleExport} disabled={!run}>
            Export Record
          </button>
        </section>

        <section className="panel record">
          <h2>Record on Appeal</h2>
          {run ? (
            run.record_on_appeal.map((entry, index) => (
              <div key={`${entry.level}-${index}`} className="record-entry">
                <h3>{String(entry.level).toUpperCase()}</h3>
                <p>{entry.decision?.protocol}</p>
                <p className="record-exhibits">
                  Exhibits: {entry.exhibits?.length ?? 0}
                </p>
              </div>
            ))
          ) : (
            <p className="empty">Awaiting record.</p>
          )}
        </section>

        <section className="panel opinion">
          <h2>Supreme Opinion</h2>
          {stageMap.get("supreme")?.decision.opinion ? (
            <div className="opinion-block">
              <h3>Syllabus</h3>
              <p>{stageMap.get("supreme")?.decision.opinion?.syllabus}</p>
              <h3>Majority</h3>
              <p>{stageMap.get("supreme")?.decision.opinion?.majority}</p>
              <h3>Dissents</h3>
              <ul>
                {stageMap
                  .get("supreme")
                  ?.decision.opinion?.dissents.map((dissent, index) => (
                    <li key={`dissent-${index}`}>
                      {dissent?.reason ?? "No dissent details."}
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <p className="empty">Supreme opinion pending.</p>
          )}
        </section>

        <section className="panel senate">
          <h2>Senate Roll Call</h2>
          {stageMap.get("senate")?.decision.roll_call ? (
            <div>
              <div className="amendments">
                <h3>Amendments</h3>
                <ul>
                  {stageMap
                    .get("senate")
                    ?.decision.amendments?.map((item, index) => (
                      <li key={`amendment-${index}`}>{item}</li>
                    ))}
                </ul>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Senator</th>
                    <th>Vote</th>
                    <th>Number</th>
                  </tr>
                </thead>
                <tbody>
                  {stageMap
                    .get("senate")
                    ?.decision.roll_call?.map((vote, index) => (
                      <tr key={`vote-${index}`}>
                        <td>{vote.senator}</td>
                        <td>{vote.decision}</td>
                        <td>{vote.proposed_number ?? "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">Senate roll call pending.</p>
          )}
        </section>

        <section className="panel history">
          <h2>Replay Past Runs</h2>
          <button type="button" onClick={loadRuns}>
            Refresh
          </button>
          <div className="history-list">
            {runs.length === 0 ? (
              <p className="empty">No runs stored yet.</p>
            ) : (
              runs.map((item) => (
                <button
                  key={item.run_id}
                  type="button"
                  className="history-item"
                  onClick={() => handleReplay(item.run_id)}
                >
                  <span>{item.run_id.slice(0, 6)}</span>
                  <span>{formatTime(item.started_at)}</span>
                  <span>{item.final_number ?? "-"}</span>
                </button>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
