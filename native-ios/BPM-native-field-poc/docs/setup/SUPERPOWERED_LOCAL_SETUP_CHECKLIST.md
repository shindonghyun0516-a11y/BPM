# Superpowered Local Setup Checklist

This checklist is for PM-side local setup before Codex implements the real Superpowered LiveAnalyzer bridge.

Do not commit SDK files, local config, or license keys.

## 1. Download The Superpowered SDK

Download the iOS-compatible Superpowered SDK from the official Superpowered site:

```text
https://superpowered.com/
```

Use the SDK package that includes iOS headers and the iOS framework/library.

Expected files may include:

- `Superpowered.h`
- LiveAnalyzer-related headers
- `libSuperpoweredAudio.xcframework`

The exact folder structure may vary by SDK version.

## 2. Place The SDK Locally

Place the SDK under this local path:

```text
ios/Vendor/Superpowered/
```

Full project-relative path:

```text
/Users/donghyun/Documents/BPM-native-field-poc/ios/Vendor/Superpowered/
```

This folder is ignored by Git through this `.gitignore` entry:

```text
ios/Vendor/Superpowered/
```

Do not stage or commit anything under:

```text
ios/Vendor/Superpowered/
```

## 3. Create Local Config

Copy:

```text
ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

to:

```text
ios/Config/LocalSuperpoweredConfig.xcconfig
```

This local config file is ignored by Git through this `.gitignore` entry:

```text
ios/Config/LocalSuperpoweredConfig.xcconfig
```

## 4. Local Config Example

Edit only the local file:

```text
ios/Config/LocalSuperpoweredConfig.xcconfig
```

Use this shape:

```text
SUPERPOWERED_ENABLED = YES
SUPERPOWERED_LICENSE_KEY = <local-evaluation-key>
SUPERPOWERED_SDK_ROOT = $(SRCROOT)/Vendor/Superpowered
```

Do not put the real key in:

- Swift files
- Objective-C++ files
- Info.plist
- README
- docs
- Git commits
- screenshots
- logs

## 5. Never Commit

Never commit:

- Superpowered SDK binary files
- Superpowered SDK header files
- `ios/Vendor/Superpowered/`
- `ios/Config/LocalSuperpoweredConfig.xcconfig`
- Any real license key
- Any log or screenshot containing a license key

Only this example file may be committed:

```text
ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

## 6. Xcode Checks

Before asking Codex to implement the bridge, check:

- The project still opens in Xcode.
- The iPhone run destination is still selectable.
- The existing app still builds without SDK errors.
- No SDK files appear in the Git changes list.
- No local config file appears in the Git changes list.

After the bridge implementation starts, Codex may need to add:

- Header Search Paths
- Framework Search Paths
- `libSuperpoweredAudio.xcframework`
- Apple frameworks such as `AudioToolbox`, `AVFoundation`, and `CoreAudio`
- Objective-C Bridging Header

Do not add these manually unless Codex asks for a specific setup step.

## 7. Tell Codex When Ready

When local setup is ready, report the following:

| Check | PM Result |
|---|---|
| `ios/Vendor/Superpowered/` exists | yes / no |
| `Superpowered.h` exists | yes / no |
| LiveAnalyzer header exists | yes / no |
| `libSuperpoweredAudio.xcframework` exists | yes / no |
| `ios/Config/LocalSuperpoweredConfig.xcconfig` exists | yes / no |
| `SUPERPOWERED_ENABLED = YES` is set | yes / no |
| license key is local only | yes / no |
| SDK files are not shown in Git changes | yes / no |
| local config is not shown in Git changes | yes / no |

Then ask Codex to re-check the local setup before implementing the bridge.

## 8. Current Scope

This setup is for internal PoC only.

Not included:

- App Store release
- TestFlight external distribution
- Customer release
- Paid license purchase
- Product-level Superpowered integration

Those require a separate PM decision.
