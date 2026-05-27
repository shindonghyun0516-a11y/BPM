import type {
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
const MIN_REFERENCE_MAX_ENERGY = MIN_SIGNAL_THRESHOLD;
const MIN_REFERENCE_SIGNAL_VARIATION = MIN_SIGNAL_VARIATION;
const MIN_REFERENCE_SIGNAL_DETECTED_COUNT = 12;
const MIN_REFERENCE_ONSET_COUNT = 5;
const MIN_REFERENCE_CANDIDATE_SUPPORT = 2;
const MIN_REFERENCE_TOP_SCORE_RATIO = 0.28;
const MIN_REFERENCE_RELATED_SCORE_RATIO = 0.45;
const MAX_REFERENCE_CANDIDATE_SPREAD_BPM = 220;
const REFERENCE_INTERVAL_STEPS = [1, 2, 4] as const;

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

export function analyzeEnergySamples(samples: EnergySample[]): BpmAnalysisOutcome {
  if (samples.length < MIN_ONSET_COUNT) {
    return unstable("분석할 신호가 충분하지 않습니다.");
  }

  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];
  const durationMs = lastSample.timestampMs - firstSample.timestampMs;

  if (durationMs < MIN_ANALYSIS_DURATION_MS) {
    return unstable("측정 시간이 충분하지 않습니다.");
  }

  const energies = samples.map((sample) => sample.energy);
  const meanEnergy = mean(energies);
  const minEnergy = Math.min(...energies);
  const maxEnergy = Math.max(...energies);
  const signalVariation = maxEnergy - minEnergy;
  const energyStdDev = standardDeviation(energies, meanEnergy);

  if (maxEnergy < MIN_SIGNAL_THRESHOLD || signalVariation < MIN_SIGNAL_VARIATION) {
    return unstable("입력 신호가 너무 작거나 변화가 부족합니다.");
  }

  const onsetThreshold =
    meanEnergy +
    Math.max(energyStdDev * ONSET_STDDEV_WEIGHT, signalVariation * ONSET_VARIATION_WEIGHT);
  const onsetTimes = findOnsetTimes(samples, onsetThreshold);
  const signalStats = {
    maxEnergy,
    signalVariation,
    signalDetectedCount: energies.filter((energy) => energy >= MIN_SIGNAL_THRESHOLD).length
  };

  if (onsetTimes.length < MIN_ONSET_COUNT) {
    return unstable("박자 후보가 충분하지 않습니다.");
  }

  const intervals = buildIntervals(onsetTimes).filter((intervalMs) => {
    const bpm = 60_000 / intervalMs;
    return bpm >= DEFAULT_BPM_RANGE_MIN && bpm <= DEFAULT_BPM_RANGE_MAX;
  });

  if (intervals.length < MIN_ONSET_COUNT - 1) {
    return unstable("BPM 범위 안에서 안정적인 간격을 찾지 못했습니다.");
  }

  const medianInterval = median(intervals);
  const recommendedBpm = Math.round(60_000 / medianInterval);

  if (
    recommendedBpm < DEFAULT_BPM_RANGE_MIN ||
    recommendedBpm > DEFAULT_BPM_RANGE_MAX ||
    !Number.isFinite(recommendedBpm)
  ) {
    return unstable("BPM 후보가 허용 범위를 벗어났습니다.");
  }

  const intervalStability = calculateIntervalStability(intervals, medianInterval);

  if (intervalStability < MIN_INTERVAL_STABILITY) {
    return (
      buildLowConfidenceReferenceResult(onsetTimes, signalStats) ??
      unstable("박자 간격이 너무 불규칙합니다.")
    );
  }

  const signalScore = clamp(signalVariation / 0.08, 0, 1);
  const onsetScore = clamp(onsetTimes.length / 14, 0, 1);
  const confidenceScore = clamp(
    intervalStability * 0.45 + signalScore * 0.35 + onsetScore * 0.2,
    0,
    1
  );

  return {
    kind: "result",
    resultKind: "stable",
    recommendedBpm,
    candidates: buildBpmCandidates(recommendedBpm, "추천"),
    confidence: getConfidenceLevel(confidenceScore),
    confidenceScore
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

function buildLowConfidenceReferenceResult(
  onsetTimes: number[],
  signalStats: {
    maxEnergy: number;
    signalVariation: number;
    signalDetectedCount: number;
  }
): BpmAnalysisOutcome | null {
  if (
    signalStats.maxEnergy < MIN_REFERENCE_MAX_ENERGY ||
    signalStats.signalVariation < MIN_REFERENCE_SIGNAL_VARIATION ||
    signalStats.signalDetectedCount < MIN_REFERENCE_SIGNAL_DETECTED_COUNT ||
    onsetTimes.length < MIN_REFERENCE_ONSET_COUNT
  ) {
    return null;
  }

  const candidateScores = scoreReferenceCandidates(onsetTimes);

  if (candidateScores.length === 0) {
    return null;
  }

  const [topCandidate, secondCandidate] = candidateScores;
  const totalScore = candidateScores.reduce((total, candidate) => total + candidate.score, 0);
  const topScoreRatio = topCandidate.score / totalScore;
  const candidateBpms = candidateScores
    .filter((candidate) => candidate.score >= topCandidate.score * MIN_REFERENCE_RELATED_SCORE_RATIO)
    .map((candidate) => candidate.bpm);
  const candidateSpread =
    Math.max(...candidateBpms) - Math.min(...candidateBpms);

  if (
    topCandidate.support < MIN_REFERENCE_CANDIDATE_SUPPORT ||
    topScoreRatio < MIN_REFERENCE_TOP_SCORE_RATIO ||
    candidateSpread > MAX_REFERENCE_CANDIDATE_SPREAD_BPM
  ) {
    return null;
  }

  const confidenceScore = Math.min(
    CONFIDENCE_LOW_THRESHOLD - 0.01,
    clamp(
      topScoreRatio * 0.28 +
        (secondCandidate ? topCandidate.score / secondCandidate.score : 1) * 0.08,
      0.08,
      0.36
    )
  );

  return {
    kind: "result",
    resultKind: "reference",
    recommendedBpm: topCandidate.bpm,
    candidates: buildBpmCandidates(topCandidate.bpm, "참고 후보"),
    confidence: "낮음",
    confidenceScore
  };
}

function scoreReferenceCandidates(onsetTimes: number[]): Array<{
  bpm: number;
  score: number;
  support: number;
}> {
  const bucketScores = new Map<number, { score: number; support: number }>();

  for (const step of REFERENCE_INTERVAL_STEPS) {
    for (let index = step; index < onsetTimes.length; index += 1) {
      const intervalMs = onsetTimes[index] - onsetTimes[index - step];

      addReferenceCandidate(bucketScores, 60_000 / intervalMs, step === 1 ? 1 : 0.7);

      if (step > 1) {
        addReferenceCandidate(bucketScores, (60_000 * step) / intervalMs, 0.85);
      }
    }
  }

  return [...bucketScores.entries()]
    .map(([bpm, value]) => ({
      bpm,
      score: value.score,
      support: value.support
    }))
    .sort((a, b) => b.score - a.score || b.support - a.support)
    .slice(0, 8);
}

function addReferenceCandidate(
  bucketScores: Map<number, { score: number; support: number }>,
  rawBpm: number,
  weight: number
) {
  if (
    rawBpm < DEFAULT_BPM_RANGE_MIN ||
    rawBpm > DEFAULT_BPM_RANGE_MAX ||
    !Number.isFinite(rawBpm)
  ) {
    return;
  }

  const bucketedBpm = Math.round(rawBpm / 2) * 2;
  const currentScore = bucketScores.get(bucketedBpm) ?? { score: 0, support: 0 };

  bucketScores.set(bucketedBpm, {
    score: currentScore.score + weight,
    support: currentScore.support + 1
  });
}

function buildBpmCandidates(
  recommendedBpm: number,
  primaryLabel: BpmCandidate["label"]
): BpmCandidate[] {
  const rawCandidates: BpmCandidate[] = [
    { bpm: recommendedBpm, label: primaryLabel },
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

function unstable(reason: string): BpmAnalysisOutcome {
  return {
    kind: "unstable-result",
    reason
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
