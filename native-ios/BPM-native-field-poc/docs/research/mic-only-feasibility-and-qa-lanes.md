# Mic-Only Feasibility And QA Lanes

## 1. Purpose

This document records the current product and QA direction after reviewing additional research on microphone-only BPM detection, speaker-based testing limits, and alternative reference inputs.

The goal is to prevent the team from repeating earlier failed loops:

- Treating an uncontrolled speaker test as the only truth.
- Treating tap, BLE, IMU, file analysis, or link lookup as the main product direction.
- Continuing to tune a weak in-house algorithm without separating product, bench, and annotation evidence.

## 2. Mic-Only BPM Analysis Is Not Impossible

Microphone-only BPM analysis is technically possible. A microphone input can contain repeated rhythmic energy from drums, bass, piano attack, brass attack, claps, and venue sound.

The important distinction is:

- Possible: the microphone contains rhythmic information.
- Reliable in every field condition: not guaranteed.

For this project, the product target remains:

> An iPhone listens to venue speaker or live music through the microphone and automatically shows practical BPM candidates.

The product should show candidates and confidence, not pretend that every result is a single exact truth.

## 3. Limits Of Speaker-Based Testing

Speaker-based tests add an extra acoustic path:

```text
source app or metronome
-> speaker
-> room air / reflections / distance / distortion
-> iPhone microphone
-> analysis
```

This path can change the signal before the app analyzes it.

Main risks:

- Room reflections can duplicate or smear onsets.
- Small speakers can weaken bass or kick information.
- Bluetooth or playback routes can add delay.
- Distance and angle change input level and transient shape.
- Loud playback can distort or clip.
- Quiet playback can fall under noise floor.
- iOS audio session mode, AGC, noise suppression, or voice processing can alter the signal.

Therefore, a speaker test is useful but should not be the only evidence for algorithm quality.

## 4. Product Lane

The Product lane is the actual product direction.

### Product lane input

- iPhone built-in microphone
- Venue speaker sound
- Live music
- Real room noise and reflections

### Product lane output

- BPM candidates
- Half / base / double candidates
- Confidence
- No-result reason
- Input level
- Analysis state

### Product lane non-goals

- Tap-first UX
- BLE sensor as main input
- IMU as main input
- Local file upload as main input
- Link or BPM database lookup as main input
- Desktop system audio as main input

## 5. Bench Lane

The Bench lane is for controlled algorithm verification. It is not product UX.

Bench lane answers:

- Does the algorithm work when the input is controlled?
- Is the failure caused by the acoustic path or the algorithm?
- Are lag-to-BPM mapping, thresholds, and confidence gates reasonable?

Possible bench inputs:

- Metronome 90 / 120 / 128 BPM
- Fixed speaker distance and angle
- Wired loopback
- Frequency-tagged QA assets
- Sync chirp or tagged test files
- Known BPM test loops

Bench lane metrics:

- Buffer duration
- Frame count
- Envelope sample count
- Active envelope ratio
- Top periodicity peaks
- Candidate list
- Half / base / double candidates
- False positives in silence
- Reason for no-result

Bench lane is allowed to use controlled reference signals, but those are not product features.

## 6. Annotation Lane

The Annotation lane provides human or external reference values.

Possible annotation sources:

- Known BPM from PM notes
- External BPM checker result
- DAW or DJ software result
- Human tap tempo reference
- IMU or BLE timestamp reference, if later approved

Annotation is useful for comparing candidate quality, but it must not become the main product input.

## 7. Why Tap, BLE, And IMU Are Not Main Product Inputs

Tap-first is not the main direction because the user does not want to manually tap the beat.

BLE and IMU are not the main direction because they add device or movement requirements and shift the product away from listening to field music.

Allowed role:

- Reference
- Annotation
- QA control channel

Disallowed role for the current product lane:

- Primary BPM input
- Replacement for microphone-based analysis

## 8. PoC-4 QA Principles Going Forward

PoC-4 QA must be split into Product lane and Bench lane.

### Product lane QA

Use cases:

- Jazz club-like speaker playback
- Cafe or practice room playback
- Swing jazz
- R&B
- New Orleans
- Big band
- Live-like room sound

Judgment:

- Does the app show practical BPM candidates?
- Does it avoid overclaiming?
- Does it expose half/base/double ambiguity?
- Does it show a clear no-result reason?

### Bench lane QA

Use cases:

- Metronome 90 / 120 / 128 BPM
- Silence
- Small / normal / large volume
- Fixed distance and angle
- Wired loopback or tagged QA assets, if later approved

Judgment:

- Does metronome produce expected candidates?
- Is no-result reason clear?
- Is silence false positive avoided?
- Does debug show enough values to find the failure stage?

## 9. PM Testing Checklist

When recording future tests, include:

- Lane: Product / Bench / Annotation
- Test input
- Known BPM or expected BPM
- Device
- iOS version
- Playback device
- Distance and angle
- Volume
- Room condition
- RMS
- Peak
- Buffer duration
- Frame count
- Envelope sample count
- Top periodicity peaks
- Candidate list
- Half candidate
- Base candidate
- Double candidate
- Confidence
- Reason
- PM judgment

If a result is missing, record it as missing instead of guessing.

## 10. Do Not Repeat These Failures

Do not repeat the following past mistakes:

- Do not keep tuning the same weak local-peak or periodicity algorithm after metronome fails.
- Do not treat a single speaker setup as the final truth.
- Do not move to swing/R&B field music before metronome and silence tests are understood.
- Do not mix live values and result snapshots in QA records.
- Do not call a numeric score "confidence" unless it is mapped to low / medium / high.
- Do not display candidates as if they are final BPM truth.
- Do not add Tap, BLE, IMU, file upload, link lookup, or desktop system audio as the main product input without a new product decision.
- Do not store raw audio.
- Do not send raw audio to a server.
- Do not print raw audio samples in debug or logs.

## 11. Next Codex Work

Recommended next work:

1. Document PoC-4 failure separately.
2. Preserve PoC-4 code as failed experiment or stash.
3. Start Superpowered LiveAnalyzer Spike from a clean base.
4. Keep PoC-4 result as baseline, not as product logic.
5. If Superpowered fails, evaluate aubio Native Spike.
