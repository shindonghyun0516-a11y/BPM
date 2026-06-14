export type AppReadinessStatus = "initializing" | "ready-for-next-issue";

export type MeasurementStatus =
  | "idle"
  | "permission-guide"
  | "measuring"
  | "result"
  | "unstable-result"
  | "permission-denied"
  | "error";

export type ConfidenceLevel = "낮음" | "보통" | "높음";

export type EnergySample = {
  timestampMs: number;
  energy: number;
};

export type BpmCandidate = {
  bpm: number;
  label: "추천" | "Half-time 참고" | "Double-time 참고";
};

export type BpmAnalysisSuccess = {
  kind: "result";
  recommendedBpm: number;
  candidates: BpmCandidate[];
  confidence: ConfidenceLevel;
  confidenceScore: number;
};

export type BpmAnalysisUnstable = {
  kind: "unstable-result";
  reason: string;
};

export type BpmAnalysisOutcome = BpmAnalysisSuccess | BpmAnalysisUnstable;
