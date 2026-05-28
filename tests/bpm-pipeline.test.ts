import test from "node:test";
import assert from "node:assert/strict";

import { analyzeEnergySamples } from "../src/lib/bpm-analysis";
import type { BpmAnalysisSuccess, EnergySample } from "../src/types/app";

const EXPECTED_BPMS = [60, 90, 118, 120, 128, 140] as const;
const BPM_TOLERANCE = 5;

test("synthetic self-test creates BPM candidates for regular beat inputs", () => {
  for (const bpm of EXPECTED_BPMS) {
    const result = analyzeEnergySamples(createSyntheticBeatSamples(bpm));

    assert.equal(result.kind, "result", `${bpm} BPM should produce a result`);

    const success = result as BpmAnalysisSuccess;
    assert.equal(success.diagnostics.resultType, "regular-result");
    assert.ok(
      hasExpectedBpmCandidate(success, bpm),
      `${bpm} BPM should appear as recommended BPM or half/double candidate`
    );
    assert.ok(
      success.diagnostics.intervalStability !== null &&
        success.diagnostics.intervalStability >= success.diagnostics.stabilityThreshold,
      `${bpm} BPM should pass stability`
    );
    assert.ok(success.diagnostics.bpmCandidateCount > 0, `${bpm} BPM should have candidates`);
  }
});

test("synthetic 90 and 120 BPM are close to the recommended BPM", () => {
  for (const bpm of [90, 118, 120] as const) {
    const result = analyzeEnergySamples(createSyntheticBeatSamples(bpm));

    assert.equal(result.kind, "result");

    const success = result as BpmAnalysisSuccess;
    assert.ok(
      Math.abs(success.recommendedBpm - bpm) <= BPM_TOLERANCE,
      `${bpm} BPM recommended result should be within ${BPM_TOLERANCE} BPM`
    );
  }
});

test("silence does not produce a forced BPM result", () => {
  const result = analyzeEnergySamples(createSilentSamples());

  assert.equal(result.kind, "unstable-result");

  if (result.kind !== "unstable-result") {
    return;
  }

  assert.match(result.reason, /입력 신호/);
  assert.equal(result.diagnostics.bpmCandidateCount, 0);
});

test("sparse ambiguous 118 BPM interval case is not over-confirmed as 91 BPM", () => {
  const result = analyzeEnergySamples(
    createEnergySamplesFromIntervals([658, 507, 1874, 660, 1523], {
      durationMs: 10_000
    })
  );

  assert.equal(result.kind, "result");

  const success = result as BpmAnalysisSuccess;
  assert.notEqual(success.resultKind, "regular");
  assert.notEqual(success.diagnostics.resultType, "regular-result");
  assert.equal(success.resultKind, "reference");
  assert.equal(success.confidence, "낮음");
  assert.ok(
    success.candidates.some((candidate) => Math.abs(candidate.bpm - 118) <= BPM_TOLERANCE),
    "118 BPM should remain visible as a reference candidate"
  );
});

function hasExpectedBpmCandidate(result: BpmAnalysisSuccess, expectedBpm: number): boolean {
  return result.candidates.some((candidate) => Math.abs(candidate.bpm - expectedBpm) <= BPM_TOLERANCE);
}

function createSyntheticBeatSamples(bpm: number): EnergySample[] {
  const intervalMs = 60_000 / bpm;
  const durationMs = 12_000;
  const onsetTimes: number[] = [];

  for (let timestampMs = 500; timestampMs <= durationMs - 500; timestampMs += intervalMs) {
    onsetTimes.push(Math.round(timestampMs));
  }

  return createEnergySamples(onsetTimes, { durationMs });
}

function createEnergySamplesFromIntervals(
  intervalsMs: number[],
  options: {
    durationMs: number;
  }
): EnergySample[] {
  const onsetTimes = [500];

  for (const intervalMs of intervalsMs) {
    onsetTimes.push(onsetTimes[onsetTimes.length - 1] + intervalMs);
  }

  return createEnergySamples(onsetTimes, options);
}

function createSilentSamples(): EnergySample[] {
  const samples: EnergySample[] = [];

  for (let timestampMs = 0; timestampMs <= 10_000; timestampMs += 50) {
    samples.push({
      timestampMs,
      energy: 0.001
    });
  }

  return samples;
}

function createEnergySamples(
  onsetTimesMs: number[],
  options: {
    durationMs: number;
    baselineEnergy?: number;
    peakEnergy?: number;
  }
): EnergySample[] {
  const { durationMs, baselineEnergy = 0.02, peakEnergy = 0.24 } = options;
  const sampleMap = new Map<number, number>();

  for (let timestampMs = 0; timestampMs <= durationMs; timestampMs += 50) {
    sampleMap.set(timestampMs, baselineEnergy);
  }

  for (const onsetTimeMs of onsetTimesMs) {
    sampleMap.set(onsetTimeMs - 25, baselineEnergy);
    sampleMap.set(onsetTimeMs, peakEnergy);
    sampleMap.set(onsetTimeMs + 25, baselineEnergy);
  }

  return [...sampleMap.entries()]
    .sort(([leftTimestamp], [rightTimestamp]) => leftTimestamp - rightTimestamp)
    .map(([timestampMs, energy]) => ({
      timestampMs,
      energy
    }));
}
