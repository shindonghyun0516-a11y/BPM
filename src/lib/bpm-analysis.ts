import type {
  BpmAnalysisOutcome,
  BpmCandidate,
  ConfidenceLevel,
  EnergySample
} from "@/types/app";

export const MEASUREMENT_DURATION_MS = 20_000;
export const ENERGY_SAMPLE_INTERVAL_MS = 50;
export const MIN_SIGNAL_THRESHOLD = 0.006;
export const MIN_SIGNAL_VARIATION = 0.0025;
export const MIN_ONSET_COUNT = 3;
export const DEFAULT_BPM_RANGE_MIN = 10;
export const DEFAULT_BPM_RANGE_MAX = 500;
export const CONFIDENCE_LOW_THRESHOLD = 0.38;
export const CONFIDENCE_MEDIUM_THRESHOLD = 0.68;

const MIN_ANALYSIS_DURATION_MS = 5_000;
const MIN_ONSET_GAP_MS = 160;
const ONSET_STDDEV_WEIGHT = 0.35;
const ONSET_VARIATION_WEIGHT = 0.22;
const MIN_INTERVAL_STABILITY = 0.12;
const MIN_TEMPO_INTERVAL_MS = 120;
const MAX_TEMPO_INTERVAL_MS = 6_000;
const MAX_INTERVAL_SKIP = 4;

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

  const smoothedSamples = smoothEnergySamples(samples);
  const onsetThreshold =
    meanEnergy +
    Math.max(
      energyStdDev * ONSET_STDDEV_WEIGHT,
      signalVariation * ONSET_VARIATION_WEIGHT,
      MIN_SIGNAL_VARIATION
    );
  const onsetTimes = findOnsetTimes(smoothedSamples, onsetThreshold, signalVariation);

  if (onsetTimes.length < MIN_ONSET_COUNT) {
    return unstable("박자 후보가 충분하지 않습니다.");
  }

  const tempoEstimate = estimateTempoFromOnsets(onsetTimes);

  if (!tempoEstimate) {
    return unstable("BPM 범위 안에서 안정적인 간격을 찾지 못했습니다.");
  }

  const recommendedBpm = tempoEstimate.bpm;

  if (
    recommendedBpm < DEFAULT_BPM_RANGE_MIN ||
    recommendedBpm > DEFAULT_BPM_RANGE_MAX ||
    !Number.isFinite(recommendedBpm)
  ) {
    return unstable("BPM 후보가 허용 범위를 벗어났습니다.");
  }

  if (tempoEstimate.stability < MIN_INTERVAL_STABILITY) {
    return unstable("박자 간격이 너무 불규칙합니다.");
  }

  const signalScore = clamp(signalVariation / 0.045, 0, 1);
  const onsetScore = clamp(onsetTimes.length / 10, 0, 1);
  const confidenceScore = clamp(
    tempoEstimate.stability * 0.45 + signalScore * 0.35 + onsetScore * 0.2,
    0,
    1
  );

  return {
    kind: "result",
    recommendedBpm,
    candidates: buildBpmCandidates(recommendedBpm),
    confidence: getConfidenceLevel(confidenceScore),
    confidenceScore
  };
}

function smoothEnergySamples(samples: EnergySample[]): EnergySample[] {
  return samples.map((sample, index) => {
    const previous = samples[index - 1]?.energy ?? sample.energy;
    const next = samples[index + 1]?.energy ?? sample.energy;

    return {
      timestampMs: sample.timestampMs,
      energy: (previous + sample.energy + next) / 3
    };
  });
}

function findOnsetTimes(
  samples: EnergySample[],
  threshold: number,
  signalVariation: number
): number[] {
  const onsetTimes: number[] = [];
  let lastOnsetTime = -Infinity;
  const minimumPeakProminence = Math.max(signalVariation * 0.12, MIN_SIGNAL_VARIATION * 0.6);

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    const isPeak = current.energy >= previous.energy && current.energy > next.energy;
    const hasEnoughGap = current.timestampMs - lastOnsetTime >= MIN_ONSET_GAP_MS;
    const peakProminence = current.energy - Math.min(previous.energy, next.energy);

    if (
      current.energy >= threshold &&
      isPeak &&
      hasEnoughGap &&
      peakProminence >= minimumPeakProminence
    ) {
      onsetTimes.push(current.timestampMs);
      lastOnsetTime = current.timestampMs;
    }
  }

  return onsetTimes;
}

function estimateTempoFromOnsets(
  onsetTimes: number[]
): { bpm: number; stability: number } | null {
  const scores = new Map<number, number>();

  for (let startIndex = 0; startIndex < onsetTimes.length; startIndex += 1) {
    for (
      let skip = 1;
      skip <= MAX_INTERVAL_SKIP && startIndex + skip < onsetTimes.length;
      skip += 1
    ) {
      const intervalMs = onsetTimes[startIndex + skip] - onsetTimes[startIndex];

      if (intervalMs < MIN_TEMPO_INTERVAL_MS || intervalMs > MAX_TEMPO_INTERVAL_MS) {
        continue;
      }

      const bpm = Math.round(60_000 / intervalMs);

      if (bpm < DEFAULT_BPM_RANGE_MIN || bpm > DEFAULT_BPM_RANGE_MAX) {
        continue;
      }

      const bucket = Math.round(bpm / 2) * 2;
      const skipWeight = 1 / skip;
      scores.set(bucket, (scores.get(bucket) ?? 0) + skipWeight);
    }
  }

  if (scores.size === 0) {
    return null;
  }

  const rankedScores = [...scores.entries()].sort((first, second) => second[1] - first[1]);
  const [bestBpm, bestScore] = rankedScores[0];
  const totalScore = rankedScores.reduce((total, [, score]) => total + score, 0);

  if (!Number.isFinite(bestBpm) || totalScore === 0) {
    return null;
  }

  return {
    bpm: bestBpm,
    stability: clamp(bestScore / totalScore, 0, 1)
  };
}

function buildBpmCandidates(recommendedBpm: number): BpmCandidate[] {
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

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score < CONFIDENCE_LOW_THRESHOLD) {
    return "낮음";
  }

  if (score < CONFIDENCE_MEDIUM_THRESHOLD) {
    return "보통";
  }

  return "높음";
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
