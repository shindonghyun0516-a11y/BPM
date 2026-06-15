# 네이티브 iOS Harness 검사

이 문서는 BPM 네이티브 iOS 로컬 베타 작업 흐름에서 사용하는 로컬 harness 검사 기준을 정의한다.

네이티브 iOS 앱은 Vercel로 배포하지 않는다. Xcode로 빌드하고, 제한된 로컬 베타를 위해 iPhone에 로컬 개발자 설치 방식으로 배포한다. 이 harness는 iOS 빌드 안전성, Superpowered SDK/라이선스 처리, 원본 오디오 개인정보 보호, Xcode 로컬 산출물 검사를 중심으로 한다.

## 스크립트

통합 저장소 최상위 경로에서 실행한다.

```bash
scripts/harness/native-ios-check.sh
```

통합 저장소 기준 고정 경로:

```text
native 프로젝트: native-ios/BPM-native-field-poc
iOS 프로젝트:    native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj
스킴:            BPMNativeFieldPOC
```

이 harness는 iPhone 실기기 QA를 대체하지 않는다.

## 로컬 전체 모드

기본 실행 모드:

```bash
scripts/harness/native-ios-check.sh
```

PM의 로컬 Mac에서 PR 생성 전 또는 로컬 베타 설치 전에 사용한다.

필수 조건:

- Superpowered SDK가 `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/` 경로에 로컬로 존재해야 한다.
- `native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig`가 로컬에 존재해야 한다.
- 로컬 설정 파일에는 로컬 평가용 키가 들어 있어야 한다.
- SDK와 로컬 설정 파일은 Git에서 추적되면 안 된다.

로컬 전체 모드는 안전성 검사와 `xcodebuild`를 실행한다.

SDK 또는 로컬 설정 파일이 없으면 로컬 전체 모드는 `FAIL`을 반환한다.

## 스캔 전용 모드

CI에서 안전하게 실행할 수 있는 스캔 모드:

```bash
scripts/harness/native-ios-check.sh --scan-only
```

이 모드는 `xcodebuild`를 건너뛰고 Git 추적 파일, 개인정보, README 안전 검사만 실행한다.

이 모드는 향후 GitHub Actions 지원을 위한 기반이다. GitHub Actions 작업 흐름 자체는 별도 후속 Issue에서 다룬다.

## xcodebuild 명령

로컬 전체 모드는 아래 명령을 사용한다.

```bash
xcodebuild \
  -project native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj \
  -scheme BPMNativeFieldPOC \
  -destination 'generic/platform=iOS' \
  build \
  CODE_SIGNING_ALLOWED=NO
```

## 출력 등급

- `PASS`: 문제가 없음
- `FAIL`: 커밋, PR, 로컬 베타 설치를 차단해야 함
- `WARN`: 확인이 필요하지만 즉시 차단하지는 않음
- `SKIP`: 현재 모드에서 의도적으로 실행하지 않음

예시:

- SDK가 Git에 추적됨: `FAIL`
- 라이선스 키가 Git에 추적됨: `FAIL`
- `LocalSuperpoweredConfig.xcconfig`가 Git에 추적됨: `FAIL`
- 원본 오디오 저장 패턴 발견: `FAIL`
- `URLSession` 또는 업로드 위험 발견: `FAIL`
- `xcodebuild` 실패: `FAIL`
- README 안전 문구 부족: `WARN`
- `--scan-only`에서 `xcodebuild` 생략: `SKIP`

## 검사 항목

harness는 아래 항목을 검사한다.

- 저장소 최상위 경로
- 네이티브 iOS 프로젝트 경로
- `Info.plist`
- `project.pbxproj`
- Superpowered SDK 폴더의 Git 추적 여부
- `ios/Vendor/Superpowered/` 아래 Superpowered SDK 바이너리/헤더 Git 추적 여부
- `LocalSuperpoweredConfig.xcconfig` Git 추적 여부
- Git 추적 파일 안의 라이선스 키 할당 여부
- 원본 오디오 파일 Git 추적 여부
- Xcode 로컬/빌드 산출물 Git 추적 여부
- `AVAudioRecorder` 사용 여부
- 원본 오디오 파일 쓰기 지표
- 서버/네트워크 업로드 지표
- README 안전 문구
- 로컬 전체 모드의 `xcodebuild`

Git 추적 파일 검사는 아래 명령 기준을 사용한다.

```bash
git ls-files
```

## 라이선스 키 스캔 정책

harness는 라이선스 키 값을 절대 출력하면 안 된다.

허용 대체값:

- `<local-evaluation-key>`
- `your-local-evaluation-key`

Git 추적 파일에서 실제 키처럼 보이는 할당이 발견되면 다음처럼 처리한다.

- harness는 `FAIL`을 반환한다.
- 출력에는 파일 경로와 줄 번호만 포함한다.
- 실제 매칭된 키 문자열은 출력하지 않는다.

## Git 추적 파일 검사

아래 항목이 Git에 추적되면 harness는 실패한다.

- `ios/Vendor/Superpowered/`
- `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`
- `LocalSuperpoweredConfig.xcconfig`
- `ios/Vendor/Superpowered/` 또는 `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/` 아래 SDK 바이너리/헤더 파일
  - `.xcframework`
  - `.framework`
  - `.a`
  - `.dylib`
  - `.h`

SDK 폴더 밖의 앱 브리지 소스 파일은 허용한다. 예:

- `SuperpoweredLiveAnalyzerBridge.h`
- `SuperpoweredLiveAnalyzerBridge.mm`
- `SuperpoweredBridgeAdapter.swift`

아래 로컬 산출물이나 원본 오디오 파일도 Git에 추적되면 안 된다.

- `.DS_Store`
- `xcuserdata`
- `*.xcuserstate`
- `DerivedData`
- `build/`
- 원본 오디오 파일
  - `.wav`
  - `.m4a`
  - `.mp3`
  - `.caf`
  - `.aiff`
  - `.flac`

## 원본 오디오 / 네트워크 스캔

스캔은 소스 파일과 프로젝트 설정 파일을 중심으로 한다.

- `.swift`
- `.m`
- `.mm`
- `.h`
- `.plist`
- `.pbxproj`

문서나 README의 설명 문구 때문에 오탐이 생기지 않도록 docs와 README 파일은 이 소스 스캔에서 제외한다.

검색 지표:

- `AVAudioRecorder`
- `URLSession`
- `upload`
- `multipart`
- `write(to:`
- `FileManager`
- 원본 오디오 파일 확장자
- 오디오 내보내기/저장 패턴

## README 안전 검사

README 안전 검사는 `FAIL`이 아니라 `WARN`으로 처리한다.

최상위 README에는 아래 내용이 있어야 한다.

- 로컬 베타 / PoC 상태
- Superpowered SDK가 저장소에 포함되지 않는다는 점
- 라이선스 키는 로컬 설정 파일에만 저장한다는 점
- 원본 오디오 저장 없음
- 원본 오디오 서버 전송 없음
- iOS 앱 실행에는 로컬 SDK 설정이 필요하다는 점

## 실패 시 조치

`LocalSuperpoweredConfig.xcconfig`가 Git에 추적된 경우:

```bash
git rm --cached native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

그 다음 `.gitignore`를 확인한다.

Superpowered SDK가 Git에 추적된 경우:

- SDK 파일을 Git 추적에서 제거한다.
- SDK는 `ios/Vendor/Superpowered/` 아래 로컬 전용 상태로 유지한다.

라이선스 키 패턴이 발견된 경우:

- Git 추적 파일에서 실제 키를 제거한다.
- 키를 Git에서 제외된 `LocalSuperpoweredConfig.xcconfig`로 옮긴다.

`xcodebuild`가 실패한 경우:

- SDK 경로를 확인한다.
- 로컬 설정 파일을 확인한다.
- 스킴을 확인한다.
- 프로젝트 경로를 확인한다.

원본 오디오 저장 패턴이 발견된 경우:

- 해당 코드가 원본 오디오를 저장하는지 확인한다.
- 저장 코드라면 제거하거나, PM이 명시적으로 승인한 예외 사유를 문서화한다.

## 알려진 한계

이 harness는 현재 Git 추적 파일과 현재 작업트리의 소스 파일을 검사한다.

Git history는 검사하지 않는다.

GitHub push 전에는 Git 이력에 라이선스 키, Superpowered SDK 바이너리/헤더, 로컬 설정 파일, 원본 오디오 파일이 커밋된 적이 없는지 별도로 확인해야 한다.

이 harness는 iPhone 실기기 QA, 마이크 입력 검증, 서명 자동화, BPM 정확도 채점, TestFlight 배포, App Store 배포도 수행하지 않는다.

## 제외 범위

이 harness가 수행하지 않는 작업:

- 제품 코드 변경
- SwiftUI 변경
- Superpowered bridge 변경
- BPM 엔진 변경
- GitHub Actions 작업 흐름 생성
- iPhone 자동 QA
- 서명 자동화
- Superpowered SDK 설치
- 라이선스 구매
