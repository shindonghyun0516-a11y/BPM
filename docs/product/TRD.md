# TRD: BPM native iOS Local Beta v0.1

## 1. 기술 개요

현재 제품은 native iOS 앱이다. 기존 Next.js 웹 PoC는 `archive/mobile-web/`에 보존한다.

## 2. 주요 기술

- UI: SwiftUI
- 마이크 세션: `AVAudioSession`
- 마이크 입력: `AVAudioEngine` input tap
- BPM 후보 엔진: Superpowered LiveAnalyzer
- Swift 연동: Objective-C++ bridge
- 처리 방식: in-memory audio processing
- 배포 방식: PM Mac/Xcode 기반 로컬 개발자 설치

## 3. 경로

- native project: `native-ios/BPM-native-field-poc`
- iOS project: `native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj`
- scheme: `BPMNativeFieldPOC`
- harness: `scripts/harness/native-ios-check.sh`

## 4. Superpowered 관리

- SDK는 repo에 포함하지 않는다.
- SDK local path: `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`
- local config: `native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig`
- example config만 repo에 포함한다.
- license key는 코드, 문서, 로그, PR 본문에 출력하지 않는다.

## 5. Audio privacy

- raw audio 파일 저장 없음
- raw audio 서버 전송 없음
- raw sample debug 출력 없음
- debug에는 BPM, RMS, Peak, 상태값 같은 숫자형 요약만 허용

## 6. Build / harness

로컬 scan-only:

```bash
scripts/harness/native-ios-check.sh --scan-only
```

Local full mode는 SDK/config가 있는 PM 로컬 Mac에서만 실행한다.

CI에서는 SDK가 없을 수 있으므로 scan-only를 기준으로 한다.

## 7. GitHub Actions

- `web-archive-harness-check`: `archive/mobile-web` 기준 웹 PoC 보존 검사
- `native-ios-safety-check`: native iOS scan-only 검사
- Vercel은 현재 native iOS Local Beta의 필수 배포 경로가 아니다.
