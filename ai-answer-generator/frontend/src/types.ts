export type CourtLevel = "trial" | "appeals" | "supreme" | "senate";

export interface TranscriptEntry {
  role: string;
  level: CourtLevel;
  message_type: string;
  proposed_number: number | null;
  vote: { decision: string; rationale: string } | null;
  claims: string[];
  evidence: string[];
  critiques: string[];
  counterarguments: string[];
  confidence: number;
  transcript_text: string;
  exhibits: string[];
  dissent: { against: string; reason: string } | null;
  metadata: { model: string; timestamp: string };
}

export interface StageDecision {
  level: CourtLevel;
  protocol: string;
  verdict_number?: number;
  shortlist?: number[];
  vote_tally?: Record<string, number>;
  dissents?: Array<Record<string, unknown>>;
  holding?: string;
  majority_number?: number;
  final_number?: number;
  opinion?: {
    syllabus: string;
    majority: string;
    dissents: Array<Record<string, unknown>>;
    writer: string;
  };
  statute_number?: number;
  amendments?: string[];
  roll_call?: Array<{ senator: string; decision: string; proposed_number: number | null }>;
  result?: string;
  timestamp?: string;
}

export interface StageRecord {
  level: CourtLevel;
  decision: StageDecision;
  transcripts: TranscriptEntry[];
  exhibits: string[];
}

export interface RunRecord {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  config: Record<string, unknown>;
  stages: StageRecord[];
  record_on_appeal: Array<Record<string, unknown>>;
  final_number: number | null;
  final_answer?: string | null;
}

export interface RunSummary {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  final_number: number | null;
  status: string;
}
