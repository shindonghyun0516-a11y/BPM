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
const ONSET_STDDEV_WEIGHT = 0.35;
const ONSET_VARIATION_WEIGHT = 0.18;
const ENERGY_DELTA_STDDEV_WEIGHT = 0.55;
const ENERGY_DELTA_VARIATION_WEIGHT = 0.08;
const MIN_ENERGY_DELTA_THRESHOLD = 0.004;
const MIN_INTERVAL_STABILITY = 0.18;
const MIN_REGULAR_ONSET_COUNT = 8;
const MIN_REFERENCE_ONSET_COUNT = 4;
const MIN_REGULAR_CANDIDATE_SUPPORT = 4;
const MIN_REFERENCE_CANDIDATE_SUPPORT = 2;
const MIN_REGULAR_TOP_SCORE_RATIO = 0.34;
const MIN_REFERENCE_TOP_SCORE_RATIO = 0.06;
const MIN_REGULAR_TOP_SECOND_SCORE_RATIO = 1.25;
const MAX_PAIR_INTERVAL_ONSET_GAP = 4;
const BPM_BUCKET_SIZE = 2;
const MIN_PRIMARY_DISPLAY_BPM = 50;
const CANDIDATE_MULTIPLE_WEIGHTS = [1, 0.92, 0.82, 0.72] as const;

type AnalysisStats = {
  meanEnergy: number;
  energyStdDev: number;
  signalVariation: number;
};

type BpmCandidateScore = {
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

  const onsetTimes = findOnsetTimes(samples, {
    meanEnergy,
    energyStdDev,
    signalVariation
  });

  if (onsetTimes.length < MIN_ONSET_COUNT) {
    return unstable("박자 후보가 충분하지 않습니다.");
  }

  const intervals = buildIntervals(onsetTimes);
  const validIntervals = intervals.filter((intervalMs) => {
    const bpm = 60_000 / intervalMs;
    return bpm >= DEFAULT_BPM_RANGE_MIN && bpm <= DEFAULT_BPM_RANGE_MAX;
  });
  const regularCandidateScores = buildIntervalCandidateScores(validIntervals);
  const referenceCandidateScores = getDisplayCandidateScores(buildBpmCandidateScores(onsetTimes));

  if (
    validIntervals.length < MIN_ONSET_COUNT - 1 ||
    regularCandidateScores.length === 0 ||
    referenceCandidateScores.length === 0
  ) {
    return unstable("BPM 범위 안에서 안정적인 간격을 찾지 못했습니다.");
  }

  const medianInterval = median(validIntervals);
  const medianBpm = Math.round(60_000 / medianInterval);

  if (
    medianBpm < DEFAULT_BPM_RANGE_MIN ||
    medianBpm > DEFAULT_BPM_RANGE_MAX ||
    !Number.isFinite(medianBpm)
  ) {
    return unstable("BPM 후보가 허용 범위를 벗어났습니다.");
  }

  const intervalStability = calculateIntervalStability(validIntervals, medianInterval);
  const primaryCandidate = regularCandidateScores[0];
  const secondCandidate = regularCandidateScores[1];
  const totalCandidateScore = regularCandidateScores.reduce(
    (total, candidate) => total + candidate.score,
    0
  );
  const topScoreRatio =
    totalCandidateScore > 0 ? primaryCandidate.score / totalCandidateScore : 0;
  const topSecondScoreRatio = secondCandidate
    ? primaryCandidate.score / secondCandidate.score
    : Infinity;
  const hasEnoughRegularOnsets = onsetTimes.length >= MIN_REGULAR_ONSET_COUNT;
  const hasEnoughRegularSupport =
    primaryCandidate.supportCount >= MIN_REGULAR_CANDIDATE_SUPPORT;
  const hasDominantRegularCandidate =
    topScoreRatio >= MIN_REGULAR_TOP_SCORE_RATIO &&
    topSecondScoreRatio >= MIN_REGULAR_TOP_SECOND_SCORE_RATIO;
  const canUseRegularResult =
    intervalStability >= MIN_INTERVAL_STABILITY &&
    hasEnoughRegularOnsets &&
    hasEnoughRegularSupport &&
    hasDominantRegularCandidate;

  if (!canUseRegularResult) {
    const canUseReferenceCandidate =
      onsetTimes.length >= MIN_REFERENCE_ONSET_COUNT &&
      referenceCandidateScores[0].supportCount >= MIN_REFERENCE_CANDIDATE_SUPPORT &&
      getTopScoreRatio(referenceCandidateScores) >= MIN_REFERENCE_TOP_SCORE_RATIO;

    if (!canUseReferenceCandidate) {
      return unstable(
        getUnstableReasonForCandidates(onsetTimes.length, referenceCandidateScores.length)
      );
    }

    const referenceCandidate = referenceCandidateScores[0];

    return {
      kind: "result",
      resultKind: "reference",
      recommendedBpm: referenceCandidate.bpm,
      candidates: buildBpmCandidates(referenceCandidate.bpm, "참고 후보"),
      confidence: "낮음",
      confidenceScore: Math.min(CONFIDENCE_LOW_THRESHOLD - 0.01, 0.32)
    };
  }

  const signalScore = clamp(signalVariation / 0.08, 0, 1);
  const onsetScore = clamp(onsetTimes.length / 14, 0, 1);
  const candidateScore = clamp(topScoreRatio / 0.7, 0, 1);
  const confidenceScore = clamp(
    intervalStability * 0.35 + signalScore * 0.25 + onsetScore * 0.2 + candidateScore * 0.2,
    0,
    1
  );

  return {
    kind: "result",
    resultKind: "regular",
    recommendedBpm: primaryCandidate.bpm,
    candidates: buildBpmCandidates(primaryCandidate.bpm, "추천"),
    confidence: getConfidenceLevel(confidenceScore),
    confidenceScore
  };
}

function findOnsetTimes(samples: EnergySample[], stats: AnalysisStats): number[] {
  const onsetTimes: number[] = [];
  let lastOnsetTime = -Infinity;
  const energies = samples.map((sample) => sample.energy);
  const positiveDeltas = samples.map((sample, index) =>
    Math.max(0, sample.energy - (samples[index - 1]?.energy ?? sample.energy))
  );
  const meanDelta = mean(positiveDeltas);
  const maxDelta = Math.max(...positiveDeltas);
  const deltaVariation = maxDelta - Math.min(...positiveDeltas);
  const deltaStdDev = standardDeviation(positiveDeltas, meanDelta);
  const onsetThreshold =
    stats.meanEnergy +
    Math.max(stats.energyStdDev * ONSET_STDDEV_WEIGHT, stats.signalVariation * ONSET_VARIATION_WEIGHT);
  const deltaThreshold = Math.max(
    MIN_ENERGY_DELTA_THRESHOLD,
    deltaStdDev * ENERGY_DELTA_STDDEV_WEIGHT,
    deltaVariation * ENERGY_DELTA_VARIATION_WEIGHT
  );
  const localFloor = Math.max(
    MIN_SIGNAL_THRESHOLD * 0.7,
    stats.meanEnergy + stats.energyStdDev * 0.12
  );

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    const previousFarEnergy = energies[Math.max(0, index - 2)];
    const nextFarEnergy = energies[Math.min(energies.length - 1, index + 2)];
    const isLocalPeak =
      current.energy >= previous.energy &&
      current.energy > next.energy &&
      current.energy >= previousFarEnergy &&
      current.energy >= nextFarEnergy;
    const energyDelta = current.energy - previous.energy;
    const localContrast = current.energy - Math.min(previous.energy, next.energy);
    const isStrongPeak = current.energy >= onsetThreshold && isLocalPeak;
    const isEnergyChangePeak =
      current.energy >= localFloor &&
      isLocalPeak &&
      localContrast >= deltaThreshold * 0.65;
    const isRisingLocalPeak =
      current.energy >= localFloor &&
      energyDelta >= deltaThreshold &&
      current.energy >= next.energy;
    const hasEnoughGap = current.timestampMs - lastOnsetTime >= MIN_ONSET_GAP_MS;

    if ((isStrongPeak || isEnergyChangePeak || isRisingLocalPeak) && hasEnoughGap) {
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

function buildIntervalCandidateScores(intervals: number[]): BpmCandidateScore[] {
  const scoreMap = new Map<number, number>();

  for (const intervalMs of intervals) {
    const bpm = roundToBpmBucket(60_000 / intervalMs);

    if (
      bpm < DEFAULT_BPM_RANGE_MIN ||
      bpm > DEFAULT_BPM_RANGE_MAX ||
      !Number.isFinite(bpm)
    ) {
      continue;
    }

    scoreMap.set(bpm, (scoreMap.get(bpm) ?? 0) + 1);
  }

  return [...scoreMap.entries()]
    .map(([bpm, score]) => ({
      bpm,
      score,
      supportCount: score,
      multipleCount: 1
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.bpm - right.bpm;
    });
}

function buildBpmCandidateScores(onsetTimes: number[]): BpmCandidateScore[] {
  const scoreMap = new Map<
    number,
    {
      rawScore: number;
      supportCount: number;
      multiples: Set<number>;
    }
  >();

  for (let startIndex = 0; startIndex < onsetTimes.length - 1; startIndex += 1) {
    const maxEndIndex = Math.min(onsetTimes.length - 1, startIndex + MAX_PAIR_INTERVAL_ONSET_GAP);

    for (let endIndex = startIndex + 1; endIndex <= maxEndIndex; endIndex += 1) {
      const intervalMs = onsetTimes[endIndex] - onsetTimes[startIndex];

      for (let multipleIndex = 0; multipleIndex < CANDIDATE_MULTIPLE_WEIGHTS.length; multipleIndex += 1) {
        const multiple = multipleIndex + 1;
        const normalizedIntervalMs = intervalMs / multiple;
        const rawBpm = 60_000 / normalizedIntervalMs;
        const bpm = roundToBpmBucket(rawBpm);

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
        const pairDistancePenalty = 1 / Math.sqrt(endIndex - startIndex);

        current.rawScore += CANDIDATE_MULTIPLE_WEIGHTS[multipleIndex] * pairDistancePenalty;
        current.supportCount += 1;
        current.multiples.add(multiple);
        scoreMap.set(bpm, current);
      }
    }
  }

  return [...scoreMap.entries()]
    .map(([bpm, value]) => ({
      bpm,
      score: value.rawScore + value.multiples.size * 0.25,
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

function getDisplayCandidateScores(candidateScores: BpmCandidateScore[]): BpmCandidateScore[] {
  const primaryRangeCandidates = candidateScores.filter(
    (candidate) => candidate.bpm >= MIN_PRIMARY_DISPLAY_BPM
  );

  return primaryRangeCandidates.length > 0 ? primaryRangeCandidates : candidateScores;
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

function roundToBpmBucket(bpm: number): number {
  return Math.round(bpm / BPM_BUCKET_SIZE) * BPM_BUCKET_SIZE;
}

function getUnstableReasonForCandidates(onsetCount: number, candidateCount: number): string {
  if (onsetCount < MIN_REFERENCE_ONSET_COUNT) {
    return "박자 후보가 충분하지 않습니다.";
  }

  if (candidateCount === 0) {
    return "BPM 후보를 계산하지 못했습니다.";
  }

  return "BPM 후보가 너무 넓게 흩어져 있습니다.";
}

function getTopScoreRatio(candidateScores: BpmCandidateScore[]): number {
  const totalScore = candidateScores.reduce((total, candidate) => total + candidate.score, 0);

  return totalScore > 0 ? candidateScores[0].score / totalScore : 0;
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
