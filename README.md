# BPM

`BPM`은 iPhone 마이크로 현장 음악을 듣고 BPM 후보를 분석하는 포트폴리오 / Local Beta 프로젝트입니다.

이 프로젝트는 처음에는 모바일웹 PoC로 시작했지만, 현장 테스트를 반복하면서 브라우저 마이크 분석과 자체 BPM 랭킹 방식만으로는 목표 사용 환경에서 충분히 안정적이지 않다는 점을 확인했습니다. 이후 네이티브 iOS Local Beta 방향으로 전환했습니다.

이 저장소는 공개 출시용 완성 제품이 아닙니다.

## 프로젝트 목표

제품 방향은 다음과 같습니다.

- iPhone 마이크로 현장 음악이나 외부 스피커 음악을 듣는다.
- 단일 정답이 아니라 BPM 후보를 보여준다.
- 일반 베타 사용자 화면에서는 고급 debug 정보를 숨긴다.
- raw audio를 저장하거나 서버로 전송하지 않는다.

주요 사용 환경:

- 재즈 클럽
- 카페
- 스윙댄스 연습장
- 외부 스피커 환경
- iPhone 마이크로 듣는 라이브 또는 현장 음악

주요 장르:

- 스윙 재즈
- R&B
- 뉴올리언스 리듬 앤 블루스
- 빅밴드

## 저장소 구조

```text
BPM/
├── README.md
├── archive/
│   └── mobile-web/
└── native-ios/
    └── BPM-native-field-poc/
```

### `archive/mobile-web/`

초기 Next.js 모바일웹 PoC입니다.

포트폴리오 맥락과 의사결정 과정을 보여주기 위해 보존했습니다. 초기 웹 구현, harness script, 제품 문서, BPM 분석 실험 코드가 포함되어 있습니다.

### `native-ios/BPM-native-field-poc/`

현재 Local Beta v0.1 방향의 네이티브 iOS 프로젝트입니다.

이 앱은 다음을 사용합니다.

- SwiftUI
- `AVAudioSession`
- `AVAudioEngine`
- Objective-C++ bridge를 통한 Superpowered LiveAnalyzer
- 메모리 기반 오디오 처리

## 문제 정의

초기 제품 질문은 단순했습니다.

> 사용자가 직접 Tap Tempo를 하지 않아도, 방 안에서 재생 중인 음악의 BPM을 앱이 자동으로 추정할 수 있는가?

일반적인 대안은 목표 워크플로우와 맞지 않았습니다.

- Tap Tempo는 사용자가 음악을 듣는 흐름을 끊는다.
- 스트리밍 환경에서는 로컬 오디오 파일을 항상 확보할 수 없다.
- 링크 조회나 데이터베이스 조회는 실제 공간, 스피커, 라이브 연주의 상태를 반영하지 못한다.
- 모바일웹 마이크 분석은 현장과 유사한 테스트에서 충분히 안정적이지 않았다.

## 제품 의사결정 흐름

1. 모바일웹 BPM 실험으로 시작했다.
2. 브라우저 마이크 입력과 로컬 BPM 분석을 테스트했다.
3. 마이크와 오디오 파이프라인을 더 직접 제어하기 위해 네이티브 iOS로 전환했다.
4. 네이티브 PoC-1부터 PoC-4까지 진행했다.
5. 네이티브 마이크 입력이 정상적으로 들어오는 것을 확인했다.
6. 자체 local peak / periodicity 랭킹 방식은 충분히 안정적이지 않다는 것을 확인했다.
7. 실패한 PoC-4 buffer periodicity 실험을 연구 기록으로 보존했다.
8. Superpowered LiveAnalyzer Spike를 진행했다.
9. 메트로놈과 reference track에서 더 강한 결과를 확인했다.
10. 약 10명 제한의 로컬 개발자 설치 beta 방향으로 이동했다.

## Local Beta v0.1

현재 iOS beta 범위는 의도적으로 좁게 유지합니다.

- Xcode 기반 로컬 설치만 진행
- 약 10명 테스트 사용자
- App Store 출시 없음
- TestFlight 외부 beta 없음
- 계정 시스템 없음
- 클라우드 저장 없음
- 서버 기반 오디오 분석 없음

사용자 흐름:

1. 측정을 시작한다.
2. 기본 측정 시간 동안 음악을 듣는다.
3. 대표 BPM 후보를 정수로 크게 표시한다.
4. 후보가 불안정하면 더 긴 시간으로 다시 측정할 수 있다.

Half / Base / Double 후보, Superpowered raw output, 기존 자체 PoC baseline 값은 일반 사용자 화면에 노출하지 않고 설정/debug 화면 뒤에 둡니다.

## 주요 기능

- 네이티브 iOS 마이크 입력
- 기본 35초 자동 측정
- 불안정 후보를 위한 50초 재측정 흐름
- 큰 정수 BPM 후보 표시
- Input Stability 그래프
- Stitch mockup을 참고한 한국어 Local Beta UI
- PM QA를 위한 debug/settings 화면
- Superpowered LiveAnalyzer experimental engine
- 기존 자체 PoC baseline은 debug/reference 용도로만 보존

## 기술 접근

네이티브 iOS:

- Local Beta UI: SwiftUI
- 마이크 세션 제어: `AVAudioSession`
- 마이크 buffer 입력: `AVAudioEngine` input tap
- Superpowered LiveAnalyzer 연결: Objective-C++ bridge
- iPhone mono 마이크 입력을 Superpowered 처리 형식에 맞게 변환
- debug에는 숫자형 요약값만 표시

이전 모바일웹 lane:

- Next.js
- TypeScript
- 브라우저 마이크 실험
- 로컬 BPM 분석 prototype
- privacy / BPM UI harness script

## 개인정보 원칙

개인정보와 오디오 처리 원칙은 제품 설계의 일부입니다.

- raw audio를 저장하지 않는다.
- raw audio를 서버로 전송하지 않는다.
- raw audio sample을 debug output에 출력하지 않는다.
- Superpowered SDK 파일은 이 저장소에 커밋하지 않는다.
- 로컬 Superpowered license key는 이 저장소에 커밋하지 않는다.
- 로컬 Superpowered config는 Git에서 제외한다.

보호되는 local-only 경로:

```text
native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

## 로컬 실행 방법

### 네이티브 iOS

Xcode에서 아래 project를 엽니다.

```text
native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj
```

마이크 QA는 실제 iPhone에서 진행해야 합니다. 시뮬레이터는 기본 UI 확인 용도로만 적합합니다.

Superpowered local setup:

1. Superpowered SDK를 로컬에 직접 다운로드한다.
2. 아래 경로에 배치한다.

```text
native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
```

3. 아래 파일을 복사한다.

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

복사한 파일 이름:

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

4. 로컬 evaluation key는 `LocalSuperpoweredConfig.xcconfig`에만 입력한다.
5. 실제 key는 절대 커밋하지 않는다.
6. SDK binary나 header도 절대 커밋하지 않는다.

### 보존된 모바일웹 PoC

```bash
cd archive/mobile-web
npm install
npm run dev
```

build와 check:

```bash
npm run build
npm run lint
npm test --if-present
```

## Harness

네이티브 iOS Local Beta용 안전 검사는 아래 script를 사용합니다.

```bash
scripts/harness/native-ios-check.sh --scan-only
```

이 검사는 다음을 확인합니다.

- Superpowered SDK가 tracked 대상이 아닌지
- `LocalSuperpoweredConfig.xcconfig`가 tracked 대상이 아닌지
- 실제 license key가 tracked file에 없는지
- raw audio 파일이 없는지
- raw audio 저장 / 서버 전송 위험 코드가 없는지
- Xcode local artifact가 tracked 대상이 아닌지

Local Full Mode에서는 Superpowered SDK와 local config가 로컬에 준비된 상태에서 `xcodebuild`까지 실행합니다.

```bash
scripts/harness/native-ios-check.sh
```

## 현재 한계

- 이 프로젝트는 포트폴리오 / Local Beta 프로젝트이며, 공개 출시용 완성 제품이 아니다.
- Superpowered SDK는 로컬에 필요하지만 저장소에는 포함되어 있지 않다.
- SDK 기반 build에는 로컬 Superpowered evaluation key가 필요하다.
- evaluation 사용은 상용 출시 승인으로 보지 않는다.
- BPM은 여전히 확정값이 아니라 후보로 표시한다.
- 현장 Field QA는 계속 진행 중이다.
- 고속 스윙이나 빅밴드 곡에서는 half-time 또는 double-time 해석이 발생할 수 있다.

## 포트폴리오 관점

이 저장소는 다음을 보여주기 위한 포트폴리오 기록입니다.

- PM 주도의 제품 의사결정
- PoC 기반 기술 검증
- 실패 실험을 학습 자산으로 보존한 과정
- 모바일웹에서 네이티브 iOS로 피벗한 과정
- 자체 오디오 분석에서 검증된 네이티브 엔진으로 피벗한 과정
- 마이크 기반 제품에서 raw audio를 저장/전송하지 않는 privacy-first 원칙
- 공개 출시 전 로컬 beta 전략

이 프로젝트의 핵심 이야기는 첫 알고리즘이 성공했다는 것이 아닙니다. 현장 테스트를 통해 초기 접근의 한계를 발견했고, 그 증거를 바탕으로 제품 방향을 바꿨다는 점입니다.
