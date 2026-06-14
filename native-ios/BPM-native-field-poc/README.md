# BPM

BPM은 iPhone 마이크로 현장 음악을 듣고 BPM 후보를 보여주는 iOS Local Beta 앱입니다.

이 프로젝트는 Local Beta / PoC 단계이며, 공개 출시용 완성 제품이 아닙니다.

## 프로젝트 개요

`BPM`은 iPhone 마이크 입력이 실제 현장 청취 환경에서 유용한 BPM 후보를 제공할 수 있는지 검증하기 위한 Local Beta v0.1 앱입니다.

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

## 문제 정의

이 프로젝트는 실제 현장에서 자주 생기는 문제에서 시작했습니다. 댄서나 음악 사용자는 빠르게 BPM을 알고 싶지만, 일반적인 방식은 목표 사용 흐름과 잘 맞지 않았습니다.

- Tap Tempo는 수동 입력이 필요하고 음악을 듣는 흐름을 끊습니다.
- 스트리밍 음악은 항상 로컬 오디오 파일로 분석할 수 없습니다.
- 링크 조회나 데이터베이스 조회는 실제 라이브/스피커 재생 환경을 반영하지 못합니다.
- 모바일웹 마이크 실험은 현장 BPM 분석에 충분히 안정적이지 않았습니다.
- 따라서 iPhone 마이크 기반 native 접근이 필요했습니다.

## 제품 의사결정

이 프로젝트는 아래 의사결정 과정을 거쳤습니다.

1. 모바일웹 BPM 실험으로 시작했습니다.
2. 마이크 입력과 실시간 오디오 동작을 더 직접 제어하기 위해 native iOS PoC로 전환했습니다.
3. 자체 오디오 분석 방식으로 PoC-1부터 PoC-4까지 진행했습니다.
4. native 마이크 입력은 정상적으로 동작했지만, local peak / periodicity ranking 방식은 충분히 안정적이지 않다는 것을 확인했습니다.
5. 실패한 PoC-4 결과는 연구 기록으로 보존했습니다.
6. 검증된 BPM / beat tracking 엔진 비교를 위해 Superpowered LiveAnalyzer Spike를 진행했습니다.
7. Superpowered가 메트로놈과 reference track에서 더 강한 결과를 보이는 것을 확인했습니다.
8. Local Beta v0.1은 Superpowered 기반 BPM 후보를 중심으로 진행하되, 최종 단일 정답처럼 표시하지 않는 방향으로 정리했습니다.

## 주요 기능

- 기본 35초 자동 측정
- 불안정한 후보를 위한 50초 재측정 흐름
- 대표 BPM 후보를 큰 정수로 표시
- 측정 중 Input Stability 그래프 표시
- SwiftUI 기반 Local Beta 사용자 흐름
- 톱니바퀴 버튼 뒤의 debug/settings 화면
- Half / Base / Double 후보 상세 정보는 일반 사용자 화면에서 숨김
- Superpowered debug와 기존 PoC baseline은 내부 reference로 유지
- raw audio 저장 없음
- raw audio 서버 전송 없음

## 기술 접근

핵심 구현:

- SwiftUI
- `AVAudioSession`
- `AVAudioEngine`
- 마이크 input node tap
- Superpowered LiveAnalyzer
- Superpowered 연동을 위한 Objective-C++ bridge
- in-memory audio processing
- 숫자형 debug 값만 표시

앱은 기존 마이크 입력 파이프라인을 유지하면서 audio buffer를 Superpowered에 전달해 실험적 BPM 후보를 비교합니다. 일반 사용자 화면에는 단순화된 후보 결과만 보여주고, 상세 진단 값은 debug/settings 화면에서 확인합니다.

## QA / 리서치 요약

주요 연구 흐름:

- 모바일웹 마이크 PoC에서 실사용 한계를 확인했습니다.
- PoC-1에서 iPhone native 마이크 입력과 숫자형 debug 값을 확인했습니다.
- PoC-2에서 RMS / Peak time series, onset envelope, input stability graph를 확인했습니다.
- PoC-3에서 local peak 기반 tempo candidate는 만들 수 있었지만 ranking이 불안정했습니다.
- PoC-4에서 20초 in-memory buffer periodicity를 테스트했지만 metronome 90 / 120 / 128 BPM QA를 통과하지 못했습니다.
- Superpowered LiveAnalyzer Spike는 자체 PoC baseline보다 명확히 개선된 결과를 보였습니다.
- Field reference QA를 통해 half-time / double-time 케이스를 고려한 후보 표시 정책이 필요하다는 것을 확인했습니다.

핵심 제품 학습:

- 앱은 BPM을 절대 정답이 아니라 후보로 표시해야 합니다.
- 빠른 스윙이나 빅밴드 곡에서는 half-time 후보가 나올 수 있습니다.
- debug 상세값은 PM QA에는 유용하지만 beta 사용자 화면에는 과하게 노출하지 않아야 합니다.

## 개인정보 원칙

개인정보와 오디오 처리 제약은 제품 설계의 일부입니다.

- raw audio를 저장하지 않습니다.
- raw audio를 서버로 전송하지 않습니다.
- raw audio sample을 debug output에 출력하지 않습니다.
- Superpowered SDK 파일은 이 저장소에 커밋하지 않습니다.
- 로컬 Superpowered 라이선스 키는 이 저장소에 커밋하지 않습니다.
- `ios/Vendor/Superpowered/`는 Git에서 제외합니다.
- `ios/Config/LocalSuperpoweredConfig.xcconfig`는 Git에서 제외합니다.

## 현재 한계

- 이 앱은 Local Beta / PoC 단계이며 공개 출시용 제품이 아닙니다.
- Superpowered SDK는 로컬에 필요하지만 저장소에는 포함되어 있지 않습니다.
- SDK 기반 빌드에는 로컬 Superpowered 평가용 키가 필요합니다.
- 평가 라이선스는 공개 출시 승인으로 보지 않습니다.
- App Store, TestFlight 외부 베타, 상용 출시는 현재 범위에서 제외합니다.
- BPM은 여전히 확정값이 아니라 후보로 표시합니다.
- 스윙 재즈, R&B, 뉴올리언스, 빅밴드 곡에 대한 Field QA는 계속 진행 중입니다.
- 자체 PoC baseline은 debug/reference로만 남아 있으며 제품 결과가 아닙니다.

## 로컬 설정

Xcode project를 엽니다.

```text
ios/BPMNativeFieldPOC.xcodeproj
```

마이크 기반 현장 BPM QA는 실제 iPhone에서 실행해야 합니다. 시뮬레이터는 기본 UI 확인 용도로만 적합합니다.

Superpowered 로컬 설정:

1. Superpowered SDK를 로컬에 직접 다운로드합니다.
2. SDK를 아래 경로에 배치합니다.

```text
ios/Vendor/Superpowered/
```

3. 아래 파일을 복사합니다.

```text
ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

복사한 파일 이름:

```text
ios/Config/LocalSuperpoweredConfig.xcconfig
```

4. 로컬 평가용 키는 `LocalSuperpoweredConfig.xcconfig`에만 입력합니다.
5. 실제 key는 절대 커밋하지 않습니다.
6. SDK binary나 header도 절대 커밋하지 않습니다.

관련 설정 문서:

- [Superpowered 설정](docs/setup/SUPERPOWERED_SETUP.md)
- [Superpowered 로컬 설정 체크리스트](docs/setup/SUPERPOWERED_LOCAL_SETUP_CHECKLIST.md)

## 프로젝트 기록

이 프로젝트는 다음 과정을 기록합니다.

- PM 주도의 제품 의사결정
- PoC 기반 기술 검증
- 실패 실험을 숨기지 않고 학습 자산으로 보존한 과정
- 모바일웹에서 native iOS로 피벗한 과정
- 자체 오디오 분석에서 검증된 native engine으로 피벗한 과정
- privacy-first 오디오 처리 원칙
- 공개 배포 전 Local Beta 전략
- Stitch UI 방향을 SwiftUI로 구현한 과정

현재 출시 전략은 약 10명 제한의 로컬 개발자 설치 베타입니다. TestFlight와 App Store 출시는 현장 QA와 라이선스/상용화 검토가 끝날 때까지 보류합니다.

## 리서치 문서

- [Mic-only feasibility and QA lanes](docs/research/mic-only-feasibility-and-qa-lanes.md)
- [QA-1 native mic input result](docs/research/qa-1-native-mic-input-result.md)
- [QA-2 onset envelope result](docs/research/qa-2-onset-envelope-result.md)
- [QA-4 buffer periodicity failure](docs/research/qa-4-buffer-periodicity-failure.md)
- [Superpowered LiveAnalyzer Spike result](docs/research/superpowered-live-analyzer-spike-result.md)
- [Superpowered BPM candidate display policy](docs/product/SUPERPOWERED_BPM_CANDIDATE_DISPLAY_POLICY.md)
