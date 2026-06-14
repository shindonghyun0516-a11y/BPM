# BPM

BPM is a local beta iOS app that listens to field music through the iPhone microphone and presents a BPM candidate.

This is a portfolio / PoC project, not a public production release.

## Project Overview

`BPM` is a Local Beta v0.1 app for checking whether iPhone microphone input can provide useful BPM candidates in real field listening environments.

Target environments:

- Jazz clubs
- Cafes
- Swing dance practice rooms
- External speaker setups
- Live or venue music heard through an iPhone microphone

Target genres:

- Swing jazz
- R&B
- New Orleans rhythm and blues
- Big band

## Problem

The project started from a practical field problem: dancers and music users often need a quick BPM estimate, but the usual options do not fit the target workflow.

- Tap Tempo is manual and interrupts listening.
- Streaming music often cannot be analyzed as a local audio file.
- Link or database lookup does not reflect the actual live or speaker playback environment.
- A mobile web microphone experiment was not reliable enough for field BPM analysis.
- The product needed an iPhone microphone-based native approach.

## Product Decision

The project moved through several product and technical decisions:

1. Started from a mobile web BPM experiment.
2. Pivoted to a native iOS PoC because microphone input and realtime audio behavior needed tighter control.
3. Built PoC-1 to PoC-4 with in-house audio analysis attempts.
4. Confirmed that native microphone input worked, but local peak / periodicity ranking was not reliable enough.
5. Preserved the PoC-4 failure as research learning.
6. Ran a Superpowered LiveAnalyzer Spike as a proven BPM / beat tracking engine comparison.
7. Confirmed stronger metronome and reference-track behavior with Superpowered.
8. Set the direction for Local Beta v0.1 around Superpowered-based BPM candidates, not a final "single truth" BPM result.

## Key Features

- 35-second default automatic measurement
- 50-second re-measurement path for unstable candidates
- Large integer display for the representative BPM candidate
- Input Stability graph during measurement
- SwiftUI Local Beta user flow
- Debug/settings screen behind the gear button
- Half / Base / Double candidate details hidden from the general user screen
- Superpowered debug and previous PoC baseline kept as internal reference
- No raw audio storage
- No raw audio server upload

## Technical Approach

Core implementation:

- SwiftUI
- `AVAudioSession`
- `AVAudioEngine`
- Microphone input node tap
- Superpowered LiveAnalyzer
- Objective-C++ bridge for Superpowered integration
- In-memory audio processing
- Numeric debug values only

The app keeps the existing microphone input pipeline and feeds audio buffers to Superpowered for experimental BPM candidate comparison. The user-facing UI shows a simplified candidate result, while detailed diagnostic values remain available in the debug/settings screen.

## QA / Research Summary

Major research milestones:

- Mobile web microphone PoC showed practical limitations.
- PoC-1 confirmed iPhone native microphone input and numeric debug values.
- PoC-2 confirmed RMS / Peak time series, onset envelope, and input stability graph.
- PoC-3 confirmed that local peak-based tempo candidates could be generated, but ranking was unstable.
- PoC-4 tested 20-second in-memory buffer periodicity, but failed metronome 90 / 120 / 128 BPM QA.
- Superpowered LiveAnalyzer Spike showed a clear improvement over the in-house PoC baseline.
- Field reference QA identified the need for candidate display policy, especially around half-time and double-time cases.

Key product learning:

- The app should display a BPM candidate, not an absolute truth.
- High-BPM swing and big band tracks may produce half-time candidates.
- Debug details are useful for PM QA, but should not overwhelm beta users.

## Privacy

Privacy constraints are part of the product design:

- Raw audio is not saved.
- Raw audio is not sent to a server.
- Raw audio samples are not printed in debug output.
- Superpowered SDK files are not committed to this repository.
- The local Superpowered license key is not committed to this repository.
- `ios/Vendor/Superpowered/` is excluded from Git.
- `ios/Config/LocalSuperpoweredConfig.xcconfig` is excluded from Git.

## Limitations

Current limitations:

- This is a Local Beta / PoC app, not a public release.
- Superpowered SDK is required locally but is not included in the repository.
- A local Superpowered evaluation key is required for SDK-backed builds.
- The evaluation license is not treated as public release approval.
- App Store, TestFlight external beta, and commercial release are out of scope.
- BPM is still presented as a candidate.
- Field QA is ongoing across swing jazz, R&B, New Orleans, and big band tracks.
- The in-house PoC baseline remains as debug/reference only and is not the product result.

## Local Setup

Open the Xcode project:

```text
ios/BPMNativeFieldPOC.xcodeproj
```

Run on a real iPhone. The simulator is useful for basic UI checks, but not for microphone-based field BPM QA.

Superpowered local setup:

1. Download the Superpowered SDK locally.
2. Place the SDK at:

```text
ios/Vendor/Superpowered/
```

3. Copy:

```text
ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

to:

```text
ios/Config/LocalSuperpoweredConfig.xcconfig
```

4. Put the local evaluation key only in `LocalSuperpoweredConfig.xcconfig`.
5. Never commit the real key.
6. Never commit SDK binaries or headers.

Related setup docs:

- [Superpowered setup](docs/setup/SUPERPOWERED_SETUP.md)
- [Superpowered local setup checklist](docs/setup/SUPERPOWERED_LOCAL_SETUP_CHECKLIST.md)

## Portfolio Notes

This project is useful as a portfolio case because it shows:

- PM-led product decision making
- PoC-based technical validation
- Failure learning instead of hiding failed experiments
- A pivot from mobile web to native iOS
- A pivot from in-house audio analysis to a proven native engine
- Privacy-first audio handling
- Local beta strategy before public distribution
- SwiftUI implementation of a designer-provided Stitch UI direction

The current release strategy is a 10-person limited local developer-install beta. TestFlight and App Store release are intentionally paused until field QA and licensing/commercial review are complete.

## Research Notes

- [Mic-only feasibility and QA lanes](docs/research/mic-only-feasibility-and-qa-lanes.md)
- [QA-1 native mic input result](docs/research/qa-1-native-mic-input-result.md)
- [QA-2 onset envelope result](docs/research/qa-2-onset-envelope-result.md)
- [QA-4 buffer periodicity failure](docs/research/qa-4-buffer-periodicity-failure.md)
- [Superpowered LiveAnalyzer Spike result](docs/research/superpowered-live-analyzer-spike-result.md)
- [Superpowered BPM candidate display policy](docs/product/SUPERPOWERED_BPM_CANDIDATE_DISPLAY_POLICY.md)
