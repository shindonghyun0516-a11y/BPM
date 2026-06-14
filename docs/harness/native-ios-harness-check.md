# Native iOS Harness Check

This document defines the local harness-check for the BPM native iOS Local Beta workflow.

The native iOS app is not deployed through Vercel. It is built with Xcode and installed locally on iPhones for a limited Local Beta. The harness focuses on iOS build safety, Superpowered SDK/license handling, raw audio privacy, and Xcode local artifact checks.

## Script

Run from the integrated portfolio repo root:

```bash
scripts/harness/native-ios-check.sh
```

Fixed integrated repo paths:

```text
native project: native-ios/BPM-native-field-poc
iOS project:    native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj
scheme:         BPMNativeFieldPOC
```

This harness does not replace iPhone real-device QA.

## Local Full Mode

Default mode:

```bash
scripts/harness/native-ios-check.sh
```

Use this on the PM's local Mac before PR or Local Beta install.

Requirements:

- Superpowered SDK is present locally at `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`.
- `native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig` exists locally.
- The local config contains the local evaluation key.
- Neither the SDK nor the local config is tracked by Git.

Local Full Mode runs safety scans and `xcodebuild`.

If the SDK or local config is missing, Local Full Mode returns `FAIL`.

## Scan-Only Mode

CI-safe scan mode:

```bash
scripts/harness/native-ios-check.sh --scan-only
```

This mode skips `xcodebuild` and runs only tracked-file, privacy, and README safety checks.

This mode is a foundation for future GitHub Actions support. The GitHub Actions workflow itself is a separate follow-up Issue.

## xcodebuild Command

Local Full Mode uses:

```bash
xcodebuild \
  -project native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj \
  -scheme BPMNativeFieldPOC \
  -destination 'generic/platform=iOS' \
  build \
  CODE_SIGNING_ALLOWED=NO
```

## Output Levels

- `PASS`: no issue found
- `FAIL`: blocks commit / PR / Local Beta install
- `WARN`: needs review but does not immediately block
- `SKIP`: intentionally not run in the current mode

Examples:

- SDK tracked: `FAIL`
- license key tracked: `FAIL`
- `LocalSuperpoweredConfig.xcconfig` tracked: `FAIL`
- raw audio storage pattern found: `FAIL`
- `URLSession` / upload risk found: `FAIL`
- `xcodebuild` failed: `FAIL`
- README safety text missing: `WARN`
- `--scan-only` skipping `xcodebuild`: `SKIP`

## Checks

The harness checks:

- repo root
- native iOS project path
- `Info.plist`
- `project.pbxproj`
- Superpowered SDK folder tracked status
- Superpowered binary/header tracked status
- `LocalSuperpoweredConfig.xcconfig` tracked status
- license key assignment in tracked files
- raw audio files tracked status
- Xcode local/build artifacts tracked status
- `AVAudioRecorder` usage
- raw audio file write indicators
- server/network upload indicators
- README safety text
- `xcodebuild` in Local Full Mode

Tracked-file checks use:

```bash
git ls-files
```

## License Key Scan Policy

The harness must never print a license key value.

Allowed placeholders:

- `<local-evaluation-key>`
- `your-local-evaluation-key`

If a real-looking key assignment is found in a tracked file:

- the harness returns `FAIL`
- the output includes only file path and line number
- the actual matched key string is not printed

## Tracked File Checks

The harness fails if these are tracked:

- `ios/Vendor/Superpowered/`
- `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`
- `LocalSuperpoweredConfig.xcconfig`
- SDK binary/header files
  - `.xcframework`
  - `.framework`
  - `.a`
  - `.dylib`
  - `Superpowered.h`
  - `Superpowered*.h`
- `.DS_Store`
- `xcuserdata`
- `*.xcuserstate`
- `DerivedData`
- `build/`
- raw audio files
  - `.wav`
  - `.m4a`
  - `.mp3`
  - `.caf`
  - `.aiff`
  - `.flac`

## Raw Audio / Network Scan

The scan focuses on source and project configuration files:

- `.swift`
- `.m`
- `.mm`
- `.h`
- `.plist`
- `.pbxproj`

Docs and README files are excluded from this source scan to avoid false positives from explanatory text.

Search indicators include:

- `AVAudioRecorder`
- `URLSession`
- `upload`
- `multipart`
- `write(to:`
- `FileManager`
- raw audio file extensions
- audio export/save patterns

## README Safety Check

README safety checks are `WARN`, not `FAIL`.

The root README should mention:

- Local Beta / PoC status
- Superpowered SDK is not included in the repo
- license key is stored only in local config
- no raw audio storage
- no raw audio server upload
- local SDK setup is required to run the iOS app

## Failure Actions

If `LocalSuperpoweredConfig.xcconfig` is tracked:

```bash
git rm --cached native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

Then confirm `.gitignore`.

If the Superpowered SDK is tracked:

- remove SDK files from Git tracking
- keep the SDK local-only under `ios/Vendor/Superpowered/`

If a license key pattern is found:

- remove the real key from the tracked file
- move the key to ignored `LocalSuperpoweredConfig.xcconfig`

If `xcodebuild` fails:

- verify SDK path
- verify local config
- verify scheme
- verify project path

If raw audio storage patterns are found:

- confirm whether the code stores raw audio
- remove it or document an explicit PM-approved exception

## Known Limitations

This harness checks current tracked files and current working tree source files.

It does not scan Git history.

Git history must be checked separately before GitHub push to confirm that no license key, Superpowered SDK binary/header, local config, or raw audio file was ever committed.

This harness also does not perform real iPhone QA, microphone input validation, signing automation, BPM accuracy scoring, TestFlight deployment, or App Store deployment.

## Out of Scope

This harness does not perform:

- product code changes
- SwiftUI changes
- Superpowered bridge changes
- BPM engine changes
- GitHub Actions workflow creation
- automatic iPhone QA
- signing automation
- Superpowered SDK installation
- license purchase
