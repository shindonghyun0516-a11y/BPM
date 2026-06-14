# Superpowered Setup

This document describes the local-only setup for the Superpowered LiveAnalyzer Spike.

The current committed app must build without the Superpowered SDK installed. Until the SDK is configured locally, the app shows `Superpowered SDK not configured` in the experimental panel.

## Rules

- Do not commit the Superpowered SDK binary or headers.
- Do not commit a real license key.
- Do not print the license key in logs.
- Do not show the license key on screen.
- Do not store raw audio.
- Do not upload raw audio.
- Do not print raw audio samples in debug output.
- Do not ship this Spike through App Store, TestFlight external distribution, or customer release without a separate PM decision.

## Local SDK Location

Place the SDK locally under:

```text
ios/Vendor/Superpowered/
```

This path is ignored by Git.

## Local Config

Copy the example config:

```text
ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

to:

```text
ios/Config/LocalSuperpoweredConfig.xcconfig
```

Then edit the local file only.

```text
SUPERPOWERED_ENABLED = YES
SUPERPOWERED_LICENSE_KEY = your-local-evaluation-key
SUPERPOWERED_SDK_ROOT = $(SRCROOT)/Vendor/Superpowered
```

`LocalSuperpoweredConfig.xcconfig` is ignored by Git.

## Current Stub State

The committed Spike starts with a stub analyzer:

- SDK status: `not configured`
- Superpowered BPM: `-`
- Superpowered silence: `-`
- Failure reason: `Superpowered SDK not configured`

The stub is intentional. It protects the existing native microphone PoC from build failures on machines where the SDK is not installed.

## Next Integration Step

After the stub build passes, the next implementation step is an Objective-C++ bridge that wraps Superpowered LiveAnalyzer.

Expected bridge files:

```text
SuperpoweredLiveAnalyzerBridge.h
SuperpoweredLiveAnalyzerBridge.mm
```

The bridge must keep the existing `AVAudioEngine` input tap. It should not replace the input pipeline with SuperpoweredIOSAudioIO in the first Spike.
