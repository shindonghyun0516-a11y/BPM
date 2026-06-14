# QA-4 Buffer Periodicity Failure

## 1. Purpose

This document records why PoC-4 is considered a failed BPM analysis experiment.

PoC-4 tested whether a 20-second in-memory audio buffer could be converted into an onset envelope and periodicity-based BPM candidate.

The result is important because it separates:

- Project direction: still valid as iPhone microphone field BPM analysis.
- PoC-4 in-house algorithm: failed current QA.
- Privacy and buffer lifecycle: mostly passed.

## 2. PoC-4 Goal

PoC-4 attempted to:

1. Keep the latest 20 seconds of raw audio only in RAM.
2. Clear the raw buffer on stop, background, error, or deinit.
3. Calculate frame energy.
4. Build an onset envelope.
5. Analyze periodicity or autocorrelation-like repetition.
6. Produce BPM candidates.
7. Show 0.5x / 1x / 2x candidates.
8. Avoid showing candidates for silence or insufficient input.

PoC-4 was not a production BPM feature.

## 3. QA-4 Test Environment

| Item | Value |
|---|---|
| iPhone model | iPhone 17 |
| iOS version | iOS 26.2 |
| Test place | Quiet room |
| Playback source | Application |
| Test date | 6/3 |
| Branch | issue-poc-4-buffer-periodicity |

## 4. QA-4 Result Summary

| Test | Result |
|---|---|
| Metronome 90 BPM, 3 runs | Failed, no candidate |
| Metronome 120 BPM, 3 runs | Failed, no candidate |
| Metronome 128 BPM, 3 runs | Failed, no candidate |
| Small volume metronome | Failed, no candidate |
| Large volume metronome | Failed, no candidate |
| Swing jazz test song | Candidate appeared, but PM judged failed |
| R&B / New Orleans test song | Candidate appeared, but PM judged failed |
| Buffer clear after stop | Passed |
| Buffer clear after background | Passed |
| Previous/new measurement separation | Passed |
| Raw audio file storage | None |
| Raw audio server upload | None |

## 5. What Worked

The following parts worked:

- App launches.
- Measurement starts.
- 20-second listening flow can be performed.
- Buffer clear after stop works.
- Buffer clear after background works.
- Previous and new measurement values do not appear to mix.
- Raw audio is not saved to a file.
- Raw audio is not sent to a server.

These are useful for later engine Spike work.

## 6. What Failed

The core BPM analysis goal failed.

Failures:

- 90 BPM metronome did not produce a candidate.
- 120 BPM metronome did not produce a candidate.
- 128 BPM metronome did not produce a candidate.
- Small and large volume metronome tests also did not produce candidates.
- Real music candidates were not judged usable.

Because metronome failed, this is not only a swing/R&B field music issue.

## 7. Failure Hypotheses

Possible failure points:

1. The onset envelope may not form strongly enough from the metronome input.
2. Active envelope thresholds may be filtering out valid rhythm.
3. Periodicity score threshold may be too strict or miscalibrated.
4. Lag-to-BPM mapping may be wrong or too coarse.
5. Candidate gating may reject valid periodicity peaks.
6. The current in-house periodicity algorithm may be too immature.

The QA record did not include enough detailed values such as reason, frame count, envelope sample count, active ratio, and top periodicity peaks. That limits exact diagnosis.

## 8. PM Decision

PM decision:

- PoC-4 failed.
- Do not commit PoC-4 as a successful feature.
- Do not continue tuning the same in-house periodicity algorithm for now.
- Preserve the result as a failed experiment.
- Move to a proven BPM / beat tracking engine Spike.
- First engine candidate: Superpowered LiveAnalyzer.
- If Superpowered is unsuitable, evaluate aubio Native Spike.

## 9. Process Update From Research

Additional research confirms that speaker-to-room-to-iPhone-mic testing is unstable but still relevant.

Updated process:

- Keep the Product lane as iPhone microphone-based field BPM analysis.
- Use Bench lane tests to separate acoustic path failure from algorithm failure.
- Use Annotation lane only as reference, not product input.
- Do not make Tap, BLE, IMU, file upload, link lookup, or desktop system audio the main product direction.

## 10. Do Not Repeat

Do not repeat the following:

- Do not keep tuning PoC-4 periodicity after metronome fails.
- Do not jump to swing/R&B field music before metronome failure is explained.
- Do not mix PoC-4 failed code into the Superpowered Spike.
- Do not interpret "candidate appeared" as success if metronome baseline fails.
- Do not treat speaker tests as the only source of truth.
- Do not add Tap/BLE/IMU as product input without a separate PM decision.
- Do not store raw audio.
- Do not upload raw audio.
- Do not print raw audio samples in debug.

## 11. Next Step

Recommended next step:

1. Keep PoC-4 code uncommitted or preserve it in a stash/backup branch.
2. Start Superpowered LiveAnalyzer Spike from a clean base.
3. Compare Superpowered against the PoC-4 baseline results.
4. Run metronome 90 / 120 / 128 before any swing/R&B product QA.
5. If Superpowered fails basic metronome QA, evaluate aubio Native Spike.
