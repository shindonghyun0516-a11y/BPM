# BPM

`BPM` is a portfolio / Local Beta project for estimating BPM candidates from real-world music heard through an iPhone microphone.

The project started as a mobile web PoC, then pivoted to a native iOS Local Beta after repeated field testing showed that browser microphone analysis and in-house BPM ranking were not reliable enough for the target use case.

This is not a public production release.

## Project Goal

The product direction is:

- Listen to venue or speaker music through the iPhone microphone.
- Present a BPM candidate, not a guaranteed single truth.
- Keep advanced debug details away from normal beta users.
- Avoid raw audio storage and server upload.

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

## Repository Structure

```text
BPM/
├── README.md
├── archive/
│   └── mobile-web/
└── native-ios/
    └── BPM-native-field-poc/
```

### `archive/mobile-web/`

The original Next.js mobile web PoC.

This lane is preserved for portfolio context and historical comparison. It includes the early web implementation, harness scripts, product docs, and BPM analysis experiments.

### `native-ios/BPM-native-field-poc/`

The current native iOS Local Beta v0.1 direction.

This app uses:

- SwiftUI
- `AVAudioSession`
- `AVAudioEngine`
- Superpowered LiveAnalyzer through an Objective-C++ bridge
- In-memory audio processing

## Problem

The original product question was practical:

> Can an app automatically estimate BPM from music playing in the room, without making the user tap along?

The usual alternatives did not fit the intended workflow:

- Tap Tempo interrupts listening.
- Streaming tracks are not always available as local audio files.
- Link or database lookup does not reflect the actual room, speaker, or live performance.
- Mobile web microphone analysis was not stable enough in field-like tests.

## Product Journey

1. Started with a mobile web BPM experiment.
2. Tested browser microphone input and local BPM analysis.
3. Pivoted to native iOS for tighter microphone and audio pipeline control.
4. Built native PoC-1 through PoC-4.
5. Confirmed native microphone input worked.
6. Confirmed in-house local peak / periodicity ranking was not reliable enough.
7. Preserved the failed PoC-4 buffer periodicity experiment as research learning.
8. Ran a Superpowered LiveAnalyzer Spike.
9. Confirmed stronger metronome and reference-track behavior.
10. Moved toward a 10-user local developer-install beta.

## Local Beta v0.1

The current iOS beta direction is intentionally narrow:

- Local Xcode install only
- About 10 test users
- No App Store release
- No TestFlight external beta
- No account system
- No cloud storage
- No server-side audio analysis

User-facing flow:

1. Start measurement.
2. Listen for the default measurement window.
3. Show a representative integer BPM candidate.
4. Allow a longer re-measurement if the candidate feels unstable.

Debug details such as Half / Base / Double candidates, Superpowered raw output, and previous in-house PoC baseline values are kept behind the settings/debug screen.

## Key Features

- Native iOS microphone input
- 35-second default automatic measurement
- 50-second re-measurement path for unstable candidates
- Large integer BPM candidate display
- Input stability graph
- Korean Local Beta UI inspired by Stitch mockups
- Debug/settings screen for PM QA
- Superpowered LiveAnalyzer experimental engine
- Existing in-house PoC baseline retained as debug/reference only

## Technical Approach

Native iOS:

- SwiftUI for the Local Beta UI
- `AVAudioSession` for microphone session control
- `AVAudioEngine` input tap for microphone buffers
- Objective-C++ bridge for Superpowered LiveAnalyzer
- Mono microphone input converted for Superpowered processing
- Numeric debug values only

Previous mobile web lane:

- Next.js
- TypeScript
- Browser microphone experiments
- Local BPM analysis prototypes
- Harness scripts for privacy and BPM UI checks

## Privacy

Privacy rules are part of the product design:

- Raw audio is not saved.
- Raw audio is not uploaded to a server.
- Raw audio samples are not printed in debug output.
- Superpowered SDK files are not committed to this repository.
- The local Superpowered license key is not committed to this repository.
- Local Superpowered configuration is ignored by Git.

Protected local-only paths include:

```text
native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

## Local Setup

### Native iOS

Open:

```text
native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj
```

Run on a real iPhone for microphone QA. The simulator is useful only for basic UI checks.

Superpowered local setup:

1. Download the Superpowered SDK locally.
2. Place it at:

```text
native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
```

3. Copy:

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

to:

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

4. Put the local evaluation key only in `LocalSuperpoweredConfig.xcconfig`.
5. Never commit the real key.
6. Never commit SDK binaries or headers.

### Archived Mobile Web PoC

```bash
cd archive/mobile-web
npm install
npm run dev
```

Build and checks:

```bash
npm run build
npm run lint
npm test --if-present
```

## Limitations

- This is a portfolio / Local Beta project, not a public production release.
- Superpowered SDK is required locally but not included in the repository.
- A local Superpowered evaluation key is required for SDK-backed builds.
- Evaluation use is not treated as commercial release approval.
- BPM is still presented as a candidate.
- Field QA is ongoing.
- High-BPM swing and big band tracks can still produce half-time or double-time interpretations.

## Portfolio Notes

This repository shows:

- PM-led product decision making
- PoC-based technical validation
- Failed experiments preserved as learning
- Pivot from mobile web to native iOS
- Pivot from in-house audio analysis to a proven native engine
- Privacy-first microphone handling
- Local beta strategy before public distribution

The main portfolio narrative is not that the first algorithm worked. It is that field testing exposed the limits of the first approach, and the product direction changed based on evidence.
