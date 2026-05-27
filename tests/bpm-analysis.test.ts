import test from "node:test";
import assert from "node:assert/strict";

import { analyzeEnergySamples } from "../src/lib/bpm-analysis";
import type { EnergySample } from "../src/types/app";

test("returns a stable BPM result for regular beat input", () => {
  const samples = createEnergySamples([500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500]);
  const result = analyzeEnergySamples(samples);

  assert.equal(result.kind, "result");

  if (result.kind !== "result") {
    return;
  }

  assert.equal(result.resultKind, "stable");
  assert.equal(result.recommendedBpm, 120);
  assert.equal(result.candidates[0]?.label, "추천");
});

test("uses low-confidence reference result only for irregular interval stability", () => {
  const samples = createEnergySamples([
    500,
    750,
    1500,
    1800,
    2500,
    2800,
    3500,
    3900,
    4500,
    4800,
    5500,
    5900
  ]);
  const result = analyzeEnergySamples(samples);

  assert.equal(result.kind, "result");

  if (result.kind !== "result") {
    return;
  }

  assert.equal(result.resultKind, "reference");
  assert.equal(result.confidence, "낮음");
  assert.equal(result.candidates[0]?.label, "참고 후보");
});

test("does not show a reference candidate when the input signal is weak", () => {
  const samples = createEnergySamples([500, 1000, 1500, 2000, 2500, 3000], {
    baselineEnergy: 0.001,
    peakEnergy: 0.002
  });
  const result = analyzeEnergySamples(samples);

  assert.equal(result.kind, "unstable-result");

  if (result.kind !== "unstable-result") {
    return;
  }

  assert.match(result.reason, /입력 신호/);
});

test("does not show a reference candidate when onset candidates are insufficient", () => {
  const samples = createEnergySamples([1000, 2500], {
    durationMs: 8_000
  });
  const result = analyzeEnergySamples(samples);

  assert.equal(result.kind, "unstable-result");

  if (result.kind !== "unstable-result") {
    return;
  }

  assert.match(result.reason, /박자 후보/);
});

function createEnergySamples(
  onsetTimesMs: number[],
  options: {
    durationMs?: number;
    intervalMs?: number;
    baselineEnergy?: number;
    peakEnergy?: number;
  } = {}
): EnergySample[] {
  const {
    durationMs = 10_000,
    intervalMs = 50,
    baselineEnergy = 0.02,
    peakEnergy = 0.24
  } = options;
  const onsetTimes = new Set(onsetTimesMs);
  const samples: EnergySample[] = [];

  for (let timestampMs = 0; timestampMs <= durationMs; timestampMs += intervalMs) {
    samples.push({
      timestampMs,
      energy: onsetTimes.has(timestampMs) ? peakEnergy : baselineEnergy
    });
  }

  return samples;
}
