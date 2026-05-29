import type { BpmAnalysisOutcome } from "@/types/app";

const ESSENTIA_TARGET_SAMPLE_RATE = 44_100;
const ESSENTIA_MIN_BUFFER_SECONDS = 6;
const ESSENTIA_MIN_SIGNAL_RMS = 0.004;
const ESSENTIA_MIN_SIGNAL_PEAK = 0.02;
const ESSENTIA_BPM_RANGE_MIN = 40;
const ESSENTIA_BPM_RANGE_MAX = 250;
const BPM_MATCH_TOLERANCE = 5;
const BIAS_LOW = 130;
const BIAS_HIGH = 134;

export type EssentiaJudgement = "개선" | "동일" | "악화" | "판단 불가";

export type EssentiaCandidate = {
  bpm: number;
  label: "가장 강한 후보" | "Half-time 참고" | "Double-time 참고";
};

export type EssentiaExperimentalReport = {
  status: "success" | "failed" | "skipped";
  packageName: "essentia.js";
  license: "AGPL-3.0";
  wasmStatus: "not-loaded" | "loading" | "loaded" | "failed";
  judgement: EssentiaJudgement;
  judgementReason: string;
  bpm: number | null;
  candidates: EssentiaCandidate[];
  confidence: number | null;
  failureReason: string;
  processingTimeMs: number;
  wasmLoadTimeMs: number;
  inputSampleRate: number;
  analysisSampleRate: number;
  bufferDurationSeconds: number;
  rms: number;
  peak: number;
  beatsCount: number;
  estimatesCount: number;
  intervalsCount: number;
  has132Bias: boolean;
  silentFalsePositive: boolean;
};

export type EssentiaExperimentalInput = {
  pcm: Float32Array;
  sampleRate: number;
  v0Outcome: BpmAnalysisOutcome;
};

type EssentiaCoreModule = typeof import("essentia.js/dist/essentia.js-core.es.js");
type EssentiaWasmModule = typeof import("essentia.js/dist/essentia-wasm.web.js");

export async function analyzeWithEssentiaExperimental(
  input: EssentiaExperimentalInput
): Promise<EssentiaExperimentalReport> {
  const startedAt = performance.now();
  const base = buildBaseReport(input);

  if (input.pcm.length === 0 || input.sampleRate <= 0) {
    return {
      ...base,
      status: "skipped",
      failureReason: "분석할 마이크 buffer가 없습니다.",
      judgement: "판단 불가",
      judgementReason: "Essentia.js에 전달할 입력 buffer가 없어 비교할 수 없습니다.",
      processingTimeMs: elapsed(startedAt)
    };
  }

  if (base.bufferDurationSeconds < ESSENTIA_MIN_BUFFER_SECONDS) {
    return {
      ...base,
      status: "skipped",
      failureReason: "Essentia.js 분석에 필요한 측정 시간이 부족합니다.",
      judgement: "판단 불가",
      judgementReason: "측정 buffer가 너무 짧아 비교할 수 없습니다.",
      processingTimeMs: elapsed(startedAt)
    };
  }

  if (base.rms < ESSENTIA_MIN_SIGNAL_RMS || base.peak < ESSENTIA_MIN_SIGNAL_PEAK) {
    return {
      ...base,
      status: "skipped",
      failureReason: "입력 신호가 부족해 Essentia.js 후보를 표시하지 않습니다.",
      judgement: input.v0Outcome.kind === "unstable-result" ? "동일" : "판단 불가",
      judgementReason: "무음 또는 입력 부족 상태에서는 BPM 후보를 표시하지 않는 것이 맞습니다.",
      processingTimeMs: elapsed(startedAt)
    };
  }

  let essentia: InstanceType<EssentiaCoreModule["Essentia"]> | null = null;
  let vector: unknown = null;
  const wasmLoadStartedAt = performance.now();

  try {
    const [{ Essentia }, wasmModule] = (await Promise.all([
      import("essentia.js/dist/essentia.js-core.es.js"),
      import("essentia.js/dist/essentia-wasm.web.js")
    ])) as [EssentiaCoreModule, EssentiaWasmModule];
    const wasmLoadTimeMs = elapsed(wasmLoadStartedAt);
    const EssentiaWASM = await wasmModule.default;
    const preparedPcm =
      input.sampleRate === ESSENTIA_TARGET_SAMPLE_RATE
        ? input.pcm
        : resampleLinear(input.pcm, input.sampleRate, ESSENTIA_TARGET_SAMPLE_RATE);

    essentia = new Essentia(EssentiaWASM, false);
    vector = essentia.arrayToVector(preparedPcm);

    const rhythm = essentia.RhythmExtractor2013(
      vector,
      ESSENTIA_BPM_RANGE_MAX,
      "multifeature",
      ESSENTIA_BPM_RANGE_MIN
    );
    const bpm = normalizeBpm(rhythm.bpm);
    const confidence = normalizeConfidence(rhythm.confidence);
    const candidates = bpm === null ? [] : buildEssentiaCandidates(bpm);
    const beatsCount = vectorLikeLength(rhythm.ticks);
    const estimatesCount = vectorLikeLength(rhythm.estimates);
    const intervalsCount = vectorLikeLength(rhythm.bpmIntervals);
    const status = bpm === null ? "failed" : "success";
    const failureReason =
      bpm === null ? "Essentia.js가 BPM 후보를 반환하지 않았습니다." : "";
    const has132Bias = candidates.some(
      (candidate) => candidate.bpm >= BIAS_LOW && candidate.bpm <= BIAS_HIGH
    );
    const silentFalsePositive =
      (base.rms < ESSENTIA_MIN_SIGNAL_RMS || base.peak < ESSENTIA_MIN_SIGNAL_PEAK) &&
      candidates.length > 0;
    const judgement = judgeAgainstV0(input.v0Outcome, candidates);

    return {
      ...base,
      status,
      wasmStatus: "loaded",
      judgement: judgement.label,
      judgementReason: judgement.reason,
      bpm,
      candidates,
      confidence,
      failureReason,
      processingTimeMs: elapsed(startedAt),
      wasmLoadTimeMs,
      beatsCount,
      estimatesCount,
      intervalsCount,
      has132Bias,
      silentFalsePositive
    };
  } catch (error) {
    return {
      ...base,
      status: "failed",
      wasmStatus: "failed",
      judgement: "판단 불가",
      judgementReason: "Essentia.js 로딩 또는 분석이 실패해 비교할 수 없습니다.",
      failureReason:
        error instanceof Error
          ? error.message
          : "Essentia.js 분석 중 알 수 없는 오류가 발생했습니다.",
      processingTimeMs: elapsed(startedAt),
      wasmLoadTimeMs: elapsed(wasmLoadStartedAt)
    };
  } finally {
    deleteVector(vector);
    try {
      essentia?.shutdown();
      essentia?.delete();
    } catch {
      // Spike cleanup should never break the V0 measurement flow.
    }
  }
}

function buildBaseReport(input: EssentiaExperimentalInput): EssentiaExperimentalReport {
  const levels = calculateLevels(input.pcm);

  return {
    status: "skipped",
    packageName: "essentia.js",
    license: "AGPL-3.0",
    wasmStatus: "not-loaded",
    judgement: "판단 불가",
    judgementReason: "아직 Essentia.js 분석을 실행하지 않았습니다.",
    bpm: null,
    candidates: [],
    confidence: null,
    failureReason: "",
    processingTimeMs: 0,
    wasmLoadTimeMs: 0,
    inputSampleRate: input.sampleRate,
    analysisSampleRate: ESSENTIA_TARGET_SAMPLE_RATE,
    bufferDurationSeconds: input.sampleRate > 0 ? input.pcm.length / input.sampleRate : 0,
    rms: levels.rms,
    peak: levels.peak,
    beatsCount: 0,
    estimatesCount: 0,
    intervalsCount: 0,
    has132Bias: false,
    silentFalsePositive: false
  };
}

function calculateLevels(pcm: Float32Array): { rms: number; peak: number } {
  if (pcm.length === 0) {
    return { rms: 0, peak: 0 };
  }

  let sum = 0;
  let peak = 0;

  for (const sample of pcm) {
    const absolute = Math.abs(sample);
    sum += sample * sample;
    peak = Math.max(peak, absolute);
  }

  return {
    rms: Math.sqrt(sum / pcm.length),
    peak
  };
}

function resampleLinear(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (input.length === 0 || inputSampleRate <= 0 || inputSampleRate === outputSampleRate) {
    return input;
  }

  const outputLength = Math.max(1, Math.round((input.length * outputSampleRate) / inputSampleRate));
  const output = new Float32Array(outputLength);
  const ratio = (input.length - 1) / Math.max(1, outputLength - 1);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(input.length - 1, leftIndex + 1);
    const fraction = sourceIndex - leftIndex;
    output[index] = input[leftIndex] * (1 - fraction) + input[rightIndex] * fraction;
  }

  return output;
}

function normalizeBpm(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);

  if (rounded < ESSENTIA_BPM_RANGE_MIN || rounded > ESSENTIA_BPM_RANGE_MAX) {
    return null;
  }

  return rounded;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(3));
}

function buildEssentiaCandidates(bpm: number): EssentiaCandidate[] {
  const rawCandidates: EssentiaCandidate[] = [
    { bpm, label: "가장 강한 후보" },
    { bpm: Math.round(bpm / 2), label: "Half-time 참고" },
    { bpm: Math.round(bpm * 2), label: "Double-time 참고" }
  ];
  const seen = new Set<number>();

  return rawCandidates.filter((candidate) => {
    if (
      candidate.bpm < ESSENTIA_BPM_RANGE_MIN ||
      candidate.bpm > ESSENTIA_BPM_RANGE_MAX ||
      seen.has(candidate.bpm)
    ) {
      return false;
    }

    seen.add(candidate.bpm);
    return true;
  });
}

function judgeAgainstV0(
  v0Outcome: BpmAnalysisOutcome,
  essentiaCandidates: EssentiaCandidate[]
): { label: EssentiaJudgement; reason: string } {
  if (essentiaCandidates.length === 0) {
    if (v0Outcome.kind === "unstable-result") {
      return {
        label: "동일",
        reason: "기존 V0와 Essentia.js 모두 BPM 후보를 만들지 못했습니다."
      };
    }

    return {
      label: "악화",
      reason: "기존 V0는 결과를 만들었지만 Essentia.js는 후보를 만들지 못했습니다."
    };
  }

  if (v0Outcome.kind === "unstable-result") {
    return {
      label: "개선",
      reason: "기존 V0는 실패했지만 Essentia.js는 후보를 만들었습니다."
    };
  }

  const strongest = essentiaCandidates[0]?.bpm ?? null;

  if (strongest !== null && isRelatedTempo(v0Outcome.recommendedBpm, strongest)) {
    return {
      label: "동일",
      reason: "기존 V0와 Essentia.js 후보가 같거나 half/double 관계입니다."
    };
  }

  return {
    label: "판단 불가",
    reason: "기존 V0와 Essentia.js 후보가 다릅니다. 알려진 BPM 기준으로 PM 확인이 필요합니다."
  };
}

function isRelatedTempo(baseBpm: number, candidateBpm: number): boolean {
  const relatedValues = [baseBpm, baseBpm / 2, baseBpm * 2];
  return relatedValues.some((value) => Math.abs(value - candidateBpm) <= BPM_MATCH_TOLERANCE);
}

function vectorLikeLength(value: unknown): number {
  if (!value) {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  if (ArrayBuffer.isView(value)) {
    return "length" in value ? Number(value.length) || 0 : value.byteLength;
  }

  if (typeof value === "object" && "size" in value && typeof value.size === "function") {
    try {
      return Number(value.size()) || 0;
    } catch {
      return 0;
    }
  }

  return 0;
}

function deleteVector(value: unknown): void {
  if (value && typeof value === "object" && "delete" in value) {
    const vector = value as { delete?: () => void };
    vector.delete?.();
  }
}

function elapsed(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

export function mergePcmChunks(chunks: Float32Array[], totalLength: number): Float32Array {
  const merged = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}
