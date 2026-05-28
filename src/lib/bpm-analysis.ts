import type {
  BpmAnalysisDiagnostics,
  BpmAnalysisOutcome,
  BpmCandidate,
  ConfidenceLevel,
  EnergySample
} from "@/types/app";

export const MEASUREMENT_DURATION_MS = 10_000;
export const ENERGY_SAMPLE_INTERVAL_MS = 50;
export const MIN_SIGNAL_THRESHOLD = 0.018;
export const MIN_SIGNAL_VARIATION = 0.008;
export const MIN_ONSET_COUNT = 4;
export const DEFAULT_BPM_RANGE_MIN = 10;
export const DEFAULT_BPM_RANGE_MAX = 500;
export const CONFIDENCE_LOW_THRESHOLD = 0.38;
export const CONFIDENCE_MEDIUM_THRESHOLD = 0.68;

const MIN_ANALYSIS_DURATION_MS = 5_000;
const MIN_ONSET_GAP_MS = 120;
const ONSET_STDDEV_WEIGHT = 0.55;
const ONSET_VARIATION_WEIGHT = 0.35;
const MIN_INTERVAL_STABILITY = 0.18;
const MIN_REGULAR_ONSET_COUNT = 8;
const MIN_REFERENCE_ONSET_COUNT = 5;
const MIN_REGULAR_CANDIDATE_SUPPORT = 4;
const MIN_REFERENCE_CANDIDATE_SUPPORT = 2;
const MIN_REGULAR_TOP_SECOND_SCORE_RATIO = 1.35;
const MIN_REGULAR_TOP_SCORE_RATIO = 0.42;
const MIN_REFERENCE_TOP_SCORE_RATIO = 0.08;
const CANDIDATE_MULTIPLE_WEIGHTS = [1, 0.95, 0.9, 0.85] as const;
const CANDIDATE_MULTIPLE_DIVERSITY_BONUS = 0.35;
const MAX_REFERENCE_CANDIDATES = 3;

type CandidateScore = {
  bpm: number;
  score: number;
  supportCount: number;
  multipleCount: number;
};

export function calculateSignalEnergy(frame: Uint8Array<ArrayBufferLike>): number {
  if (frame.length === 0) {
    return 0;
  }

  let sum = 0;

  for (const value of frame) {
    const centered = (value - 128) / 128;
    sum += centered * centered;
  }

  return Math.sqrt(sum / frame.length);
}

export function calculateSignalPeak(frame: Uint8Array<ArrayBufferLike>): number {
  if (frame.length === 0) {
    return 0;
  }

  let peak = 0;

  for (const value of frame) {
    const centered = Math.abs((value - 128) / 128);
    peak = Math.max(peak, centered);
  }

  return peak;
}

export function analyzeEnergySamples(samples: EnergySample[]): BpmAnalysisOutcome {
  if (samples.length < MIN_ONSET_COUNT) {
    return unstable("분석할 신호가 충분하지 않습니다.", buildDiagnostics(samples));
  }

  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];
  const durationMs = lastSample.timestampMs - firstSample.timestampMs;

  if (durationMs < MIN_ANALYSIS_DURATION_MS) {
    return unstable("측정 시간이 충분하지 않습니다.", buildDiagnostics(samples));
  }

  const energies = samples.map((sample) => sample.energy);
  const meanEnergy = mean(energies);
  const minEnergy = Math.min(...energies);
  const maxEnergy = Math.max(...energies);
  const signalVariation = maxEnergy - minEnergy;
  const energyStdDev = standardDeviation(energies, meanEnergy);

  if (maxEnergy < MIN_SIGNAL_THRESHOLD || signalVariation < MIN_SIGNAL_VARIATION) {
    return unstable("입력 신호가 너무 작거나 변화가 부족합니다.", buildDiagnostics(samples));
  }

  const onsetThreshold =
    meanEnergy +
    Math.max(energyStdDev * ONSET_STDDEV_WEIGHT, signalVariation * ONSET_VARIATION_WEIGHT);
  const onsetTimes = findOnsetTimes(samples, onsetThreshold);
  const intervals = buildIntervals(onsetTimes);
  const regularCandidateScores = scoreBpmCandidates(intervals, 1);
  const referenceCandidateScores = scoreBpmCandidates(intervals);
  const bpmCandidateValues = referenceCandidateScores.map((candidate) => candidate.bpm);

  if (onsetTimes.length < MIN_ONSET_COUNT) {
    return unstable(
      "박자 후보가 충분하지 않습니다.",
      buildDiagnostics(samples, {
        onsetThreshold,
        onsetTimes,
        intervals,
        bpmCandidateValues
      })
    );
  }

  const validIntervals = intervals.filter((intervalMs) => {
    const bpm = 60_000 / intervalMs;
    return bpm >= DEFAULT_BPM_RANGE_MIN && bpm <= DEFAULT_BPM_RANGE_MAX;
  });

  if (validIntervals.length < MIN_ONSET_COUNT - 1) {
    return unstable(
      "BPM 범위 안에서 안정적인 간격을 찾지 못했습니다.",
      buildDiagnostics(samples, {
        onsetThreshold,
        onsetTimes,
        intervals,
        bpmCandidateValues
      })
    );
  }

  const medianInterval = median(validIntervals);
  const medianBpm = Math.round(60_000 / medianInterval);

  if (
    medianBpm < DEFAULT_BPM_RANGE_MIN ||
    medianBpm > DEFAULT_BPM_RANGE_MAX ||
    !Number.isFinite(medianBpm)
  ) {
    return unstable(
      "BPM 후보가 허용 범위를 벗어났습니다.",
      buildDiagnostics(samples, {
        onsetThreshold,
        onsetTimes,
        intervals,
        bpmCandidateValues
      })
    );
  }

  const intervalStability = calculateIntervalStability(validIntervals, medianInterval);
  const topCandidate = regularCandidateScores[0];
  const secondCandidate = regularCandidateScores[1];
  const totalCandidateScore = regularCandidateScores.reduce(
    (total, candidate) => total + candidate.score,
    0
  );
  const referenceTopCandidate = referenceCandidateScores[0];
  const referenceTotalCandidateScore = referenceCandidateScores.reduce(
    (total, candidate) => total + candidate.score,
    0
  );

  if (!topCandidate || !referenceTopCandidate) {
    return unstable(
      "BPM 후보를 계산하지 못했습니다.",
      buildDiagnostics(samples, {
        onsetThreshold,
        onsetTimes,
        intervals,
        bpmCandidateValues,
        intervalStability
      })
    );
  }

  const hasEnoughRegularOnsets = onsetTimes.length >= MIN_REGULAR_ONSET_COUNT;
  const hasEnoughRegularSupport = topCandidate.supportCount >= MIN_REGULAR_CANDIDATE_SUPPORT;
  const topScoreRatio = totalCandidateScore > 0 ? topCandidate.score / totalCandidateScore : 0;
  const topSecondScoreRatio = secondCandidate ? topCandidate.score / secondCandidate.score : Infinity;
  const hasClearTopCandidate = topScoreRatio >= MIN_REGULAR_TOP_SCORE_RATIO;
  const isTopCandidateSeparated =
    !secondCandidate || topSecondScoreRatio >= MIN_REGULAR_TOP_SECOND_SCORE_RATIO;
  const canUseRegularResult =
    intervalStability >= MIN_INTERVAL_STABILITY &&
    hasEnoughRegularOnsets &&
    hasEnoughRegularSupport &&
    hasClearTopCandidate &&
    isTopCandidateSeparated;

  if (!canUseRegularResult) {
    const referenceTopScoreRatio =
      referenceTotalCandidateScore > 0
        ? referenceTopCandidate.score / referenceTotalCandidateScore
        : 0;
    const canUseReferenceResult =
      onsetTimes.length >= MIN_REFERENCE_ONSET_COUNT &&
      referenceTopCandidate.supportCount >= MIN_REFERENCE_CANDIDATE_SUPPORT &&
      referenceTopScoreRatio >= MIN_REFERENCE_TOP_SCORE_RATIO;

    if (canUseReferenceResult) {
      return {
        kind: "result",
        resultKind: "reference",
        recommendedBpm: referenceTopCandidate.bpm,
        candidates: buildReferenceBpmCandidates(referenceCandidateScores),
        confidence: "낮음",
        confidenceScore: Math.min(CONFIDENCE_LOW_THRESHOLD - 0.01, 0.32),
        diagnostics: buildDiagnostics(samples, {
          onsetThreshold,
          onsetTimes,
          intervals,
          bpmCandidateValues,
          intervalStability,
          resultType: "reference-result",
          reason:
            "BPM 후보는 있지만 정규 결과로 확정하기에는 박자 근거가 부족합니다."
        })
      };
    }

    return unstable(
      getRegularResultFailureReason({
        intervalStability,
        hasEnoughRegularOnsets,
        hasEnoughRegularSupport,
        hasClearTopCandidate,
        isTopCandidateSeparated
      }),
      buildDiagnostics(samples, {
        onsetThreshold,
        onsetTimes,
        intervals,
        bpmCandidateValues,
        intervalStability
      })
    );
  }

  const signalScore = clamp(signalVariation / 0.08, 0, 1);
  const onsetScore = clamp(onsetTimes.length / 14, 0, 1);
  const candidateScore = clamp(topScoreRatio / 0.75, 0, 1);
  const confidenceScore = clamp(
    intervalStability * 0.35 + signalScore * 0.25 + onsetScore * 0.2 + candidateScore * 0.2,
    0,
    1
  );

  return {
    kind: "result",
    resultKind: "regular",
    recommendedBpm: topCandidate.bpm,
    candidates: buildRegularBpmCandidates(topCandidate.bpm),
    confidence: getConfidenceLevel(confidenceScore),
    confidenceScore,
    diagnostics: buildDiagnostics(samples, {
      onsetThreshold,
      onsetTimes,
      intervals,
      bpmCandidateValues,
      intervalStability,
      resultType: "regular-result",
      reason: "정규 BPM 결과가 생성되었습니다."
    })
  };
}

function findOnsetTimes(samples: EnergySample[], threshold: number): number[] {
  const onsetTimes: number[] = [];
  let lastOnsetTime = -Infinity;

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    const isPeak = current.energy >= previous.energy && current.energy > next.energy;
    const hasEnoughGap = current.timestampMs - lastOnsetTime >= MIN_ONSET_GAP_MS;

    if (current.energy >= threshold && isPeak && hasEnoughGap) {
      onsetTimes.push(current.timestampMs);
      lastOnsetTime = current.timestampMs;
    }
  }

  return onsetTimes;
}

function buildIntervals(onsetTimes: number[]): number[] {
  const intervals: number[] = [];

  for (let index = 1; index < onsetTimes.length; index += 1) {
    intervals.push(onsetTimes[index] - onsetTimes[index - 1]);
  }

  return intervals;
}

function scoreBpmCandidates(
  intervals: number[],
  maxMultiple: number = CANDIDATE_MULTIPLE_WEIGHTS.length
): CandidateScore[] {
  const scoreMap = new Map<
    number,
    {
      rawScore: number;
      supportCount: number;
      multiples: Set<number>;
    }
  >();

  for (const intervalMs of intervals) {
    for (let multipleIndex = 0; multipleIndex < maxMultiple; multipleIndex += 1) {
      const multiple = multipleIndex + 1;
      const normalizedIntervalMs = intervalMs / multiple;
      const bpm = Math.round(60_000 / normalizedIntervalMs);

      if (
        bpm < DEFAULT_BPM_RANGE_MIN ||
        bpm > DEFAULT_BPM_RANGE_MAX ||
        !Number.isFinite(bpm)
      ) {
        continue;
      }

      const current = scoreMap.get(bpm) ?? {
        rawScore: 0,
        supportCount: 0,
        multiples: new Set<number>()
      };

      current.rawScore += CANDIDATE_MULTIPLE_WEIGHTS[multipleIndex];
      current.supportCount += 1;
      current.multiples.add(multiple);
      scoreMap.set(bpm, current);
    }
  }

  return [...scoreMap.entries()]
    .map(([bpm, value]) => ({
      bpm,
      score: value.rawScore + value.multiples.size * CANDIDATE_MULTIPLE_DIVERSITY_BONUS,
      supportCount: value.supportCount,
      multipleCount: value.multiples.size
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.supportCount !== left.supportCount) {
        return right.supportCount - left.supportCount;
      }

      return left.bpm - right.bpm;
    });
}

function buildRegularBpmCandidates(recommendedBpm: number): BpmCandidate[] {
  const rawCandidates: BpmCandidate[] = [
    { bpm: recommendedBpm, label: "추천" },
    { bpm: Math.round(recommendedBpm / 2), label: "Half-time 참고" },
    { bpm: Math.round(recommendedBpm * 2), label: "Double-time 참고" }
  ];

  const seen = new Set<number>();

  return rawCandidates
    .filter((candidate) => {
      if (
        candidate.bpm < DEFAULT_BPM_RANGE_MIN ||
        candidate.bpm > DEFAULT_BPM_RANGE_MAX ||
        seen.has(candidate.bpm)
      ) {
        return false;
      }

      seen.add(candidate.bpm);
      return true;
    })
    .slice(0, 3);
}

function buildReferenceBpmCandidates(candidateScores: CandidateScore[]): BpmCandidate[] {
  const seen = new Set<number>();

  return candidateScores
    .filter((candidate) => {
      if (
        candidate.bpm < DEFAULT_BPM_RANGE_MIN ||
        candidate.bpm > DEFAULT_BPM_RANGE_MAX ||
        seen.has(candidate.bpm)
      ) {
        return false;
      }

      seen.add(candidate.bpm);
      return true;
    })
    .map((candidate) => ({
      bpm: candidate.bpm,
      label: "참고 후보" as const
    }))
    .slice(0, MAX_REFERENCE_CANDIDATES);
}

function getRegularResultFailureReason({
  intervalStability,
  hasEnoughRegularOnsets,
  hasEnoughRegularSupport,
  hasClearTopCandidate,
  isTopCandidateSeparated
}: {
  intervalStability: number;
  hasEnoughRegularOnsets: boolean;
  hasEnoughRegularSupport: boolean;
  hasClearTopCandidate: boolean;
  isTopCandidateSeparated: boolean;
}): string {
  if (intervalStability < MIN_INTERVAL_STABILITY) {
    return "박자 간격이 너무 불규칙합니다.";
  }

  if (!hasEnoughRegularOnsets) {
    return "정규 BPM으로 확정하기에는 박자 후보가 부족합니다.";
  }

  if (!hasEnoughRegularSupport) {
    return "정규 BPM으로 확정하기에는 후보 근거가 부족합니다.";
  }

  if (!hasClearTopCandidate || !isTopCandidateSeparated) {
    return "BPM 후보가 서로 갈려 정규 결과로 확정하기 어렵습니다.";
  }

  return "정규 BPM 결과를 만들 수 없습니다.";
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score < CONFIDENCE_LOW_THRESHOLD) {
    return "낮음";
  }

  if (score < CONFIDENCE_MEDIUM_THRESHOLD) {
    return "보통";
  }

  return "높음";
}

function calculateIntervalStability(intervals: number[], medianInterval: number): number {
  const differences = intervals.map((interval) => Math.abs(interval - medianInterval));
  const medianDifference = median(differences);
  const variationRatio = medianDifference / medianInterval;

  return clamp(1 - variationRatio / 0.35, 0, 1);
}

function unstable(reason: string, diagnostics: BpmAnalysisDiagnostics): BpmAnalysisOutcome {
  return {
    kind: "unstable-result",
    reason,
    diagnostics: {
      ...diagnostics,
      resultType: "unstable-result",
      reason
    }
  };
}

function buildDiagnostics(
  samples: EnergySample[],
  options: {
    onsetThreshold?: number;
    onsetTimes?: number[];
    intervals?: number[];
    bpmCandidateValues?: number[];
    intervalStability?: number | null;
    resultType?: BpmAnalysisDiagnostics["resultType"];
    reason?: string;
  } = {}
): BpmAnalysisDiagnostics {
  const energies = samples.map((sample) => sample.energy);
  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];
  const minEnergy = energies.length > 0 ? Math.min(...energies) : 0;
  const maxEnergy = energies.length > 0 ? Math.max(...energies) : 0;
  const meanEnergy = energies.length > 0 ? mean(energies) : 0;
  const signalVariation = maxEnergy - minEnergy;

  return {
    sampleCount: samples.length,
    durationMs: firstSample && lastSample ? lastSample.timestampMs - firstSample.timestampMs : 0,
    signalThreshold: MIN_SIGNAL_THRESHOLD,
    minEnergy,
    maxEnergy,
    meanEnergy,
    signalVariation,
    signalDetectedCount: energies.filter((energy) => energy >= MIN_SIGNAL_THRESHOLD).length,
    onsetThreshold: options.onsetThreshold ?? 0,
    onsetCandidateCount: options.onsetTimes?.length ?? 0,
    onsetIntervalsMs: options.intervals ?? [],
    bpmCandidateCount: options.bpmCandidateValues?.length ?? 0,
    bpmCandidateValues: options.bpmCandidateValues ?? [],
    intervalStability: options.intervalStability ?? null,
    stabilityThreshold: MIN_INTERVAL_STABILITY,
    resultType: options.resultType ?? "none",
    reason: options.reason ?? "결과가 아직 생성되지 않았습니다."
  };
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[], average: number): number {
  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
