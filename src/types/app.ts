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
  diagnostics: BpmAnalysisDiagnostics;
};

export type BpmAnalysisUnstable = {
  kind: "unstable-result";
  reason: string;
  diagnostics: BpmAnalysisDiagnostics;
};

export type BpmAnalysisOutcome = BpmAnalysisSuccess | BpmAnalysisUnstable;

export type BpmResultType = "none" | "regular-result" | "unstable-result";

export type BpmAnalysisDiagnostics = {
  sampleCount: number;
  durationMs: number;
  signalThreshold: number;
  minEnergy: number;
  maxEnergy: number;
  meanEnergy: number;
  signalVariation: number;
  signalDetectedCount: number;
  onsetThreshold: number;
  onsetCandidateCount: number;
  onsetIntervalsMs: number[];
  bpmCandidateCount: number;
  bpmCandidateValues: number[];
  intervalStability: number | null;
  stabilityThreshold: number;
  resultType: BpmResultType;
  reason: string;
};

export type MeasurementDebugInfo = {
  audioContextState: AudioContextState | "not-created" | "unknown";
  audioContextResumeAttempted: boolean;
  audioContextResumeSucceeded: boolean;
  mediaTrackState: MediaStreamTrackState | "none" | "unknown";
  mediaTrackEnabled: boolean | null;
  mediaTrackMuted: boolean | null;
  sampleRate: number | null;
  analyserFrameCount: number;
  rms: number;
  peak: number;
  signalThreshold: number;
  signalDetectedCount: number;
  onsetCandidateCount: number;
  onsetIntervalsMs: number[];
  bpmCandidateCount: number;
  bpmCandidateValues: number[];
  intervalStability: number | null;
  stabilityThreshold: number;
  resultType: BpmResultType;
  reason: string;
};
