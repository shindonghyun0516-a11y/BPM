import type { BpmAnalysisOutcome, EnergySample } from "../types/app";

type SpikeJudgement = "개선" | "동일" | "악화" | "판단 불가";

type ExperimentalCandidate = {
  bpm: number;
  score: number;
  votes: number;
  periodicityScore: number;
  intervalVotes: number;
  relation: "1x" | "0.5x" | "2x";
};

type ExperimentalTempoCandidateResult = {
  kind: "candidate";
  reason: string;
  strongestCandidate: ExperimentalCandidate;
  otherCandidates: ExperimentalCandidate[];
  envelopePeakCount: number;
  histogramBucketCount: number;
  periodicityTopCandidates: ExperimentalCandidate[];
  inputStats: ExperimentalInputStats;
};

type ExperimentalTempoNoCandidateResult = {
  kind: "no-candidate";
  reason: string;
  strongestCandidate: null;
  otherCandidates: ExperimentalCandidate[];
  envelopePeakCount: number;
  histogramBucketCount: number;
  periodicityTopCandidates: ExperimentalCandidate[];
  inputStats: ExperimentalInputStats;
};

type ExperimentalTempoResult =
  | ExperimentalTempoCandidateResult
  | ExperimentalTempoNoCandidateResult;

type ExperimentalInputStats = {
  sampleCount: number;
  durationMs: number;
  meanEnergy: number;
  maxEnergy: number;
  signalVariation: number;
};

type V0Summary = {
  label: "추천 BPM" | "불안정";
  resultText: string;
  candidateBpms: number[];
  reason: string;
};

export type ExperimentalTempoReport = {
  v0: V0Summary;
  experimental: ExperimentalTempoResult;
  judgement: SpikeJudgement;
  judgementReason: string;
  bias132Status: string;
  silenceFalsePositiveStatus: string;
  goPivotStopNote: string;
};

const EXPERIMENTAL_MIN_SAMPLES = 12;
const EXPERIMENTAL_MIN_DURATION_MS = 5_000;
const EXPERIMENTAL_MIN_SIGNAL_THRESHOLD = 0.018;
const EXPERIMENTAL_MIN_SIGNAL_VARIATION = 0.008;
const EXPERIMENTAL_MIN_ENVELOPE_PEAKS = 3;
const EXPERIMENTAL_MIN_PEAK_GAP_MS = 110;
const EXPERIMENTAL_SMOOTHING_WINDOW = 5;
const EXPERIMENTAL_BPM_MIN = 40;
const EXPERIMENTAL_BPM_MAX = 240;
const DEFAULT_BPM_RANGE_MIN = 10;
const DEFAULT_BPM_RANGE_MAX = 500;
const BPM_BUCKET_SIZE = 1;
const PERIODICITY_SCORE_WEIGHT = 4;
const INTERVAL_SCORE_WEIGHT = 1.4;
const RELATED_CANDIDATE_WEIGHT = 0.48;
const MAX_CANDIDATES = 6;

export function analyzeExperimentalTempo(
  samples: EnergySample[],
  v0Outcome: BpmAnalysisOutcome
): ExperimentalTempoReport {
  const experimental = runExperimentalAnalyzer(samples);
  const v0 = summarizeV0Outcome(v0Outcome);
  const judgement = judgeExperimentalResult(v0Outcome, experimental);

  return {
    v0,
    experimental,
    judgement: judgement.label,
    judgementReason: judgement.reason,
    bias132Status: summarize132Bias(experimental),
    silenceFalsePositiveStatus: summarizeSilenceFalsePositive(experimental),
    goPivotStopNote:
      "Go/Pivot/Stop 판단은 metronome 90/120/128, 타깃 장르 10곡, 무음 테스트 결과를 분리해서 기록한 뒤 결정합니다."
  };
}

export function runExperimentalAnalyzer(samples: EnergySample[]): ExperimentalTempoResult {
  const inputStats = getInputStats(samples);

  if (samples.length < EXPERIMENTAL_MIN_SAMPLES) {
    return noCandidate("분석할 샘플이 충분하지 않습니다.", inputStats);
  }

  if (inputStats.durationMs < EXPERIMENTAL_MIN_DURATION_MS) {
    return noCandidate("측정 시간이 충분하지 않습니다.", inputStats);
  }

  if (
    inputStats.maxEnergy < EXPERIMENTAL_MIN_SIGNAL_THRESHOLD ||
    inputStats.signalVariation < EXPERIMENTAL_MIN_SIGNAL_VARIATION
  ) {
    return noCandidate("입력 신호가 부족해 실험 후보를 만들지 않았습니다.", inputStats);
  }

  const envelope = buildOnsetEnvelope(samples);
  const envelopePeaks = findEnvelopePeaks(samples, envelope);

  if (envelopePeaks.length < EXPERIMENTAL_MIN_ENVELOPE_PEAKS) {
    return noCandidate("onset envelope peak가 부족합니다.", inputStats, envelopePeaks.length);
  }

  const histogram = new Map<number, ExperimentalCandidate>();
  addIntervalVotes(histogram, envelopePeaks);
  const periodicityCandidates = buildPeriodicityCandidates(samples, envelope);

  for (const candidate of periodicityCandidates) {
    addCandidateVote(histogram, candidate.bpm, {
      score: candidate.score * PERIODICITY_SCORE_WEIGHT,
      periodicityScore: candidate.periodicityScore,
      intervalVotes: 0,
      votes: 1,
      relation: "1x"
    });
  }

  const sortedCandidates = sortCandidates([...histogram.values()]);

  if (sortedCandidates.length === 0) {
    return noCandidate(
      "BPM histogram에서 유효한 후보를 만들지 못했습니다.",
      inputStats,
      envelopePeaks.length
    );
  }

  const expandedCandidates = sortCandidates(expandRelatedCandidates(sortedCandidates));
  const strongestCandidate = expandedCandidates[0];

  if (!strongestCandidate) {
    return noCandidate("half/double 후보 정리 후 남은 후보가 없습니다.", inputStats);
  }

  return {
    kind: "candidate",
    reason: "실험 분석에서 onset envelope 주기 후보가 생성되었습니다.",
    strongestCandidate,
    otherCandidates: expandedCandidates.slice(1, MAX_CANDIDATES),
    envelopePeakCount: envelopePeaks.length,
    histogramBucketCount: histogram.size,
    periodicityTopCandidates: periodicityCandidates.slice(0, 5),
    inputStats
  };
}

function buildOnsetEnvelope(samples: EnergySample[]): number[] {
  const deltas = samples.map((sample, index) => {
    if (index === 0) {
      return 0;
    }

    return Math.max(0, sample.energy - samples[index - 1].energy);
  });

  return smooth(deltas, EXPERIMENTAL_SMOOTHING_WINDOW);
}

function smooth(values: number[], windowSize: number): number[] {
  const radius = Math.floor(windowSize / 2);

  return values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    const window = values.slice(start, end);

    return mean(window);
  });
}

function findEnvelopePeaks(samples: EnergySample[], envelope: number[]): EnergySample[] {
  const average = mean(envelope);
  const deviation = standardDeviation(envelope, average);
  const threshold = average + deviation * 0.8;
  const peaks: EnergySample[] = [];
  let lastPeakTime = -Infinity;

  for (let index = 1; index < envelope.length - 1; index += 1) {
    const current = envelope[index];
    const previous = envelope[index - 1];
    const next = envelope[index + 1];
    const sample = samples[index];
    const isLocalPeak = current >= previous && current > next;
    const hasGap = sample.timestampMs - lastPeakTime >= EXPERIMENTAL_MIN_PEAK_GAP_MS;

    if (current > 0 && current >= threshold && isLocalPeak && hasGap) {
      peaks.push(sample);
      lastPeakTime = sample.timestampMs;
    }
  }

  return peaks;
}

function addIntervalVotes(histogram: Map<number, ExperimentalCandidate>, peaks: EnergySample[]) {
  for (let start = 0; start < peaks.length - 1; start += 1) {
    for (let end = start + 1; end < peaks.length; end += 1) {
      const intervalMs = peaks[end].timestampMs - peaks[start].timestampMs;
      const peakSpan = end - start;

      if (peakSpan > 4) {
        continue;
      }

      const bpm = Math.round((60_000 * peakSpan) / intervalMs);

      if (isAllowedBpm(bpm)) {
        addCandidateVote(histogram, bpm, {
          score: INTERVAL_SCORE_WEIGHT / Math.sqrt(peakSpan),
          votes: 1,
          intervalVotes: 1,
          periodicityScore: 0,
          relation: "1x"
        });
      }
    }
  }
}

function buildPeriodicityCandidates(
  samples: EnergySample[],
  envelope: number[]
): ExperimentalCandidate[] {
  const sampleStepMs = getAverageSampleStepMs(samples);
  const candidates: ExperimentalCandidate[] = [];

  if (sampleStepMs <= 0) {
    return candidates;
  }

  for (let bpm = EXPERIMENTAL_BPM_MIN; bpm <= EXPERIMENTAL_BPM_MAX; bpm += BPM_BUCKET_SIZE) {
    const lagMs = 60_000 / bpm;
    const lagFrames = Math.round(lagMs / sampleStepMs);

    if (lagFrames < 2 || lagFrames >= envelope.length / 2) {
      continue;
    }

    const periodicityScore = normalizedLagScore(envelope, lagFrames);

    if (periodicityScore > 0) {
      candidates.push({
        bpm,
        score: periodicityScore,
        votes: 1,
        periodicityScore,
        intervalVotes: 0,
        relation: "1x"
      });
    }
  }

  return sortCandidates(candidates).slice(0, 10);
}

function normalizedLagScore(values: number[], lagFrames: number): number {
  let dotProduct = 0;
  let sourcePower = 0;
  let shiftedPower = 0;

  for (let index = lagFrames; index < values.length; index += 1) {
    const source = values[index];
    const shifted = values[index - lagFrames];
    dotProduct += source * shifted;
    sourcePower += source * source;
    shiftedPower += shifted * shifted;
  }

  if (sourcePower === 0 || shiftedPower === 0) {
    return 0;
  }

  return dotProduct / Math.sqrt(sourcePower * shiftedPower);
}

function expandRelatedCandidates(candidates: ExperimentalCandidate[]): ExperimentalCandidate[] {
  const expanded = new Map<number, ExperimentalCandidate>();

  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    mergeCandidate(expanded, candidate);

    const half = Math.round(candidate.bpm / 2);
    const double = Math.round(candidate.bpm * 2);

    if (isAllowedBpm(half)) {
      mergeCandidate(expanded, {
        ...candidate,
        bpm: half,
        score: candidate.score * RELATED_CANDIDATE_WEIGHT,
        relation: "0.5x"
      });
    }

    if (isAllowedBpm(double)) {
      mergeCandidate(expanded, {
        ...candidate,
        bpm: double,
        score: candidate.score * RELATED_CANDIDATE_WEIGHT,
        relation: "2x"
      });
    }
  }

  return [...expanded.values()];
}

function addCandidateVote(
  histogram: Map<number, ExperimentalCandidate>,
  bpm: number,
  vote: Omit<ExperimentalCandidate, "bpm">
) {
  const bucket = Math.round(bpm / BPM_BUCKET_SIZE) * BPM_BUCKET_SIZE;

  if (!isAllowedBpm(bucket)) {
    return;
  }

  const existing = histogram.get(bucket);

  if (!existing) {
    histogram.set(bucket, {
      bpm: bucket,
      score: vote.score,
      votes: vote.votes,
      periodicityScore: vote.periodicityScore,
      intervalVotes: vote.intervalVotes,
      relation: vote.relation
    });
    return;
  }

  existing.score += vote.score;
  existing.votes += vote.votes;
  existing.periodicityScore = Math.max(existing.periodicityScore, vote.periodicityScore);
  existing.intervalVotes += vote.intervalVotes;
}

function mergeCandidate(
  candidates: Map<number, ExperimentalCandidate>,
  candidate: ExperimentalCandidate
) {
  const existing = candidates.get(candidate.bpm);

  if (!existing) {
    candidates.set(candidate.bpm, { ...candidate });
    return;
  }

  existing.score += candidate.score;
  existing.votes += candidate.votes;
  existing.periodicityScore = Math.max(existing.periodicityScore, candidate.periodicityScore);
  existing.intervalVotes += candidate.intervalVotes;
}

function sortCandidates(candidates: ExperimentalCandidate[]): ExperimentalCandidate[] {
  return [...candidates].sort((first, second) => {
    if (second.score !== first.score) {
      return second.score - first.score;
    }

    if (second.votes !== first.votes) {
      return second.votes - first.votes;
    }

    return first.bpm - second.bpm;
  });
}

function judgeExperimentalResult(
  v0Outcome: BpmAnalysisOutcome,
  experimental: ExperimentalTempoResult
): { label: SpikeJudgement; reason: string } {
  if (experimental.inputStats.maxEnergy < EXPERIMENTAL_MIN_SIGNAL_THRESHOLD) {
    return {
      label: "판단 불가",
      reason: "입력 신호가 부족해 기존 V0와 실험 결과를 비교하기 어렵습니다."
    };
  }

  if (v0Outcome.kind === "unstable-result" && experimental.kind === "candidate") {
    return {
      label: "개선",
      reason: "기존 V0는 실패했지만 실험 분석은 참고 후보를 만들었습니다."
    };
  }

  if (v0Outcome.kind === "result" && experimental.kind === "no-candidate") {
    return {
      label: "악화",
      reason: "기존 V0는 결과를 만들었지만 실험 분석은 후보를 만들지 못했습니다."
    };
  }

  if (v0Outcome.kind === "unstable-result" && experimental.kind === "no-candidate") {
    return {
      label: "동일",
      reason: "기존 V0와 실험 분석 모두 후보를 만들지 못했습니다."
    };
  }

  if (v0Outcome.kind === "result" && experimental.kind === "candidate") {
    const difference = Math.abs(v0Outcome.recommendedBpm - experimental.strongestCandidate.bpm);

    if (difference <= 5) {
      return {
        label: "동일",
        reason: "기존 V0와 실험 분석의 가장 강한 후보가 비슷합니다."
      };
    }
  }

  return {
    label: "판단 불가",
    reason: "알려진 BPM 또는 PM 체감 BPM과 비교해야 개선 여부를 판단할 수 있습니다."
  };
}

function summarizeV0Outcome(outcome: BpmAnalysisOutcome): V0Summary {
  if (outcome.kind === "result") {
    return {
      label: "추천 BPM",
      resultText: `${outcome.recommendedBpm} BPM / 신뢰도 ${outcome.confidence}`,
      candidateBpms: outcome.candidates.map((candidate) => candidate.bpm),
      reason: "기존 V0 결과가 생성되었습니다."
    };
  }

  return {
    label: "불안정",
    resultText: "불안정",
    candidateBpms: [],
    reason: outcome.reason
  };
}

function summarize132Bias(experimental: ExperimentalTempoResult): string {
  if (experimental.kind === "no-candidate") {
    return "후보가 없어 132 쏠림 여부를 판단할 수 없습니다.";
  }

  const candidates = [experimental.strongestCandidate, ...experimental.otherCandidates];
  const near132 = candidates.filter((candidate) => Math.abs(candidate.bpm - 132) <= 4);

  if (near132.length === 0) {
    return "132 BPM 근처 후보가 강하게 보이지 않습니다.";
  }

  if (Math.abs(experimental.strongestCandidate.bpm - 132) <= 4) {
    return "가장 강한 후보가 132 BPM 근처입니다. 실제 BPM과 비교해 쏠림 여부를 확인하세요.";
  }

  return "132 BPM 근처 후보는 있지만 가장 강한 후보는 아닙니다.";
}

function summarizeSilenceFalsePositive(experimental: ExperimentalTempoResult): string {
  const inputLooksSilent =
    experimental.inputStats.maxEnergy < EXPERIMENTAL_MIN_SIGNAL_THRESHOLD ||
    experimental.inputStats.signalVariation < EXPERIMENTAL_MIN_SIGNAL_VARIATION;

  if (!inputLooksSilent) {
    return "입력 신호가 있어 무음 false positive 판단 대상이 아닙니다.";
  }

  return experimental.kind === "candidate"
    ? "주의: 입력 부족 상태에서 후보가 표시되었습니다."
    : "정상: 입력 부족 상태에서 후보를 표시하지 않았습니다.";
}

function noCandidate(
  reason: string,
  inputStats: ExperimentalInputStats,
  envelopePeakCount = 0
): ExperimentalTempoNoCandidateResult {
  return {
    kind: "no-candidate",
    reason,
    strongestCandidate: null,
    otherCandidates: [],
    envelopePeakCount,
    histogramBucketCount: 0,
    periodicityTopCandidates: [],
    inputStats
  };
}

function getInputStats(samples: EnergySample[]): ExperimentalInputStats {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
      durationMs: 0,
      meanEnergy: 0,
      maxEnergy: 0,
      signalVariation: 0
    };
  }

  const energies = samples.map((sample) => sample.energy);
  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];

  return {
    sampleCount: samples.length,
    durationMs: lastSample.timestampMs - firstSample.timestampMs,
    meanEnergy: mean(energies),
    maxEnergy: Math.max(...energies),
    signalVariation: Math.max(...energies) - Math.min(...energies)
  };
}

function getAverageSampleStepMs(samples: EnergySample[]): number {
  if (samples.length < 2) {
    return 0;
  }

  const intervals = [];

  for (let index = 1; index < samples.length; index += 1) {
    intervals.push(samples[index].timestampMs - samples[index - 1].timestampMs);
  }

  return mean(intervals);
}

function isAllowedBpm(bpm: number): boolean {
  return bpm >= DEFAULT_BPM_RANGE_MIN && bpm <= DEFAULT_BPM_RANGE_MAX && Number.isFinite(bpm);
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[], average: number): number {
  if (values.length === 0) {
    return 0;
  }

  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}
