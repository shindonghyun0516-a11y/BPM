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
  peak: number;
};

export type BpmAnalysisDiagnostics = {
  sampleCount: number;
  durationMs: number;
  meanEnergy: number;
  maxEnergy: number;
  maxPeak: number;
  signalVariation: number;
  signalDetectedCount: number;
  onsetCandidateCount: number;
  bpmCandidateCount: number;
  failureStage:
    | "none"
    | "samples"
    | "duration"
    | "signal"
    | "onset"
    | "bpm-candidates"
    | "bpm-range"
    | "stability";
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
  diagnostics: BpmAnalysisDiagnostics;
};

export type BpmAnalysisUnstable = {
  kind: "unstable-result";
  reason: string;
  diagnostics: BpmAnalysisDiagnostics;
};

export type BpmAnalysisOutcome = BpmAnalysisSuccess | BpmAnalysisUnstable;

export type MeasurementDebugInfo = {
  audioContextState: AudioContextState | "not-created" | "unknown";
  mediaTrackState: MediaStreamTrackState | "none" | "unknown";
  mediaTrackEnabled: boolean | null;
  mediaTrackMuted: boolean | null;
  sampleRate: number | null;
  analyserFrameCount: number;
  rms: number;
  peak: number;
  signalDetectedCount: number;
  onsetCandidateCount: number;
  bpmCandidateCount: number;
  resultState:
    | "idle"
    | "permission-guide"
    | "measuring"
    | "result"
    | "unstable-result"
    | "permission-denied"
    | "error";
  reason: string;
};
