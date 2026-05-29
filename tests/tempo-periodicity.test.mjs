import assert from "node:assert/strict";
import test from "node:test";
import { runExperimentalAnalyzer } from "../src/lib/bpm-experimental.ts";

const SAMPLE_INTERVAL_MS = 50;
const DURATION_MS = 10_000;

for (const bpm of [60, 90, 120, 128, 140]) {
  test(`experimental analyzer creates a synthetic ${bpm} BPM candidate`, () => {
    const result = runExperimentalAnalyzer(createPulseSamples(bpm));

    assert.equal(result.kind, "candidate");
    assert.ok(result.strongestCandidate);

    const candidates = [result.strongestCandidate, ...result.otherCandidates];
    const hasExpectedCandidate = candidates.some((candidate) => Math.abs(candidate.bpm - bpm) <= 5);

    assert.ok(
      hasExpectedCandidate,
      `Expected candidate within +/-5 BPM of ${bpm}; got ${candidates
        .map((candidate) => candidate.bpm)
        .join(", ")}`
    );
  });
}

test("experimental analyzer does not create a candidate for silence", () => {
  const result = runExperimentalAnalyzer(createSilentSamples());

  assert.equal(result.kind, "no-candidate");
});

function createPulseSamples(bpm) {
  const intervalMs = 60_000 / bpm;
  const samples = [];

  for (let timestampMs = 0; timestampMs <= DURATION_MS; timestampMs += SAMPLE_INTERVAL_MS) {
    const beatPosition = timestampMs % intervalMs;
    const distanceToBeat = Math.min(beatPosition, intervalMs - beatPosition);
    const pulse = Math.exp(-((distanceToBeat / 85) ** 2)) * 0.12;
    const subdivision = Math.exp(-(((distanceToBeat - intervalMs / 2) / 90) ** 2)) * 0.018;
    const baseline = 0.022;

    samples.push({
      timestampMs,
      energy: baseline + pulse + subdivision
    });
  }

  return samples;
}

function createSilentSamples() {
  const samples = [];

  for (let timestampMs = 0; timestampMs <= DURATION_MS; timestampMs += SAMPLE_INTERVAL_MS) {
    samples.push({
      timestampMs,
      energy: 0.004
    });
  }

  return samples;
}
