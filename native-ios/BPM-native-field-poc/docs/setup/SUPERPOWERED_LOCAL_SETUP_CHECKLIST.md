# Superpowered 로컬 설치 체크리스트

이 문서는 PM이 로컬 Mac에서 Superpowered SDK와 local config를 준비할 때 확인할 항목을 정리한 체크리스트입니다.

Superpowered SDK 파일, local config, 실제 license key는 절대 Git에 커밋하지 않습니다.

## 1. Superpowered SDK 다운로드

공식 Superpowered 사이트에서 iOS용 Superpowered SDK를 다운로드합니다.

```text
https://superpowered.com/
```

iOS header와 iOS framework/library가 포함된 SDK 패키지를 사용합니다.

SDK 버전에 따라 폴더 구조는 다를 수 있지만, 보통 아래 파일이 포함됩니다.

- `Superpowered.h`
- LiveAnalyzer 관련 header
- `libSuperpoweredAudio.xcframework`

## 2. SDK 로컬 배치

SDK는 native iOS 프로젝트 안의 아래 경로에만 로컬로 배치합니다.

```text
native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
```

native iOS 프로젝트를 Xcode에서 열었을 때의 내부 상대 경로는 아래와 같습니다.

```text
ios/Vendor/Superpowered/
```

전체 로컬 경로 예시는 아래와 같습니다.

```text
/Users/donghyun/Documents/BPM/native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
```

이 폴더는 `.gitignore`로 Git 추적에서 제외되어야 합니다.

```text
ios/Vendor/Superpowered/
native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
```

아래 경로의 파일은 stage하거나 commit하지 않습니다.

```text
native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
```

## 3. Local config 생성

example config를 복사합니다.

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

아래 파일로 복사합니다.

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

native iOS 프로젝트 내부 상대 경로는 아래와 같습니다.

```text
ios/Config/LocalSuperpoweredConfig.xcconfig
```

이 local config 파일은 `.gitignore`로 Git 추적에서 제외되어야 합니다.

```text
ios/Config/LocalSuperpoweredConfig.xcconfig
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

## 4. Local config 예시

실제 수정은 local 파일에서만 진행합니다.

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

파일 형식은 아래와 같습니다.

```text
SUPERPOWERED_ENABLED = YES
SUPERPOWERED_LICENSE_KEY = <local-evaluation-key>
SUPERPOWERED_SDK_ROOT = $(SRCROOT)/Vendor/Superpowered
```

실제 key는 아래 위치에 넣지 않습니다.

- Swift 파일
- Objective-C++ 파일
- `Info.plist`
- `README`
- docs 문서
- Git commit
- screenshot
- log

## 5. 절대 커밋하면 안 되는 항목

아래 항목은 절대 Git에 커밋하지 않습니다.

- Superpowered SDK binary 파일
- Superpowered SDK header 파일
- `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`
- `native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig`
- 실제 license key
- license key가 포함된 log 또는 screenshot

커밋 가능한 파일은 example config뿐입니다.

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

## 6. Xcode 확인 항목

Codex에 bridge 구현을 요청하기 전에 아래를 확인합니다.

- Xcode에서 프로젝트가 정상적으로 열린다.
- iPhone 실행 대상이 선택 가능하다.
- 기존 앱이 SDK 관련 오류 없이 열린다.
- SDK 파일이 Git 변경 목록에 보이지 않는다.
- local config 파일이 Git 변경 목록에 보이지 않는다.

bridge 구현이 시작되면 Codex가 아래 설정을 추가해야 할 수 있습니다.

- Header Search Paths
- Framework Search Paths
- `libSuperpoweredAudio.xcframework`
- `AudioToolbox`, `AVFoundation`, `CoreAudio` 같은 Apple framework
- Objective-C Bridging Header

Codex가 특정 setup 작업을 요청하기 전에는 PM이 위 설정을 임의로 추가하지 않습니다.

## 7. 준비 완료 후 Codex에 전달할 체크리스트

로컬 setup이 끝나면 Codex에 아래 항목을 전달합니다.

| 확인 항목 | PM 결과 |
|---|---|
| `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`가 있다 | yes / no |
| `Superpowered.h`가 있다 | yes / no |
| LiveAnalyzer header가 있다 | yes / no |
| `libSuperpoweredAudio.xcframework`가 있다 | yes / no |
| `native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig`가 있다 | yes / no |
| `SUPERPOWERED_ENABLED = YES`가 설정되어 있다 | yes / no |
| license key는 local config에만 있다 | yes / no |
| SDK 파일이 Git 변경 목록에 보이지 않는다 | yes / no |
| local config가 Git 변경 목록에 보이지 않는다 | yes / no |

그 다음 Codex에 실제 bridge 구현 전에 로컬 setup 상태를 다시 확인해 달라고 요청합니다.

## 8. 현재 범위

이 setup은 내부 PoC와 Local Beta 검증을 위한 것입니다.

이번 범위에 포함되지 않는 항목:

- App Store 배포
- TestFlight 외부 배포
- 대고객 출시
- 유료 license 구매
- 제품 수준의 Superpowered 정식 도입 확정

위 항목은 별도 PM 결정이 필요합니다.
