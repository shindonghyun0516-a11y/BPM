# Current Status and Next Steps

이 문서는 BPM 프로젝트를 당장 Local Beta 설치로 진행하지 않고, 현재 상태를 보존한 뒤 나중에 재개하기 위한 기준 문서다.

## 1. 현재 상태

- native iOS Local Beta v0.1 기능 구현은 완료에 가까운 상태다.
- Superpowered LiveAnalyzer 기반 BPM 후보 분석 가능성을 확인했다.
- Stitch 기반 Local Beta UI를 SwiftUI에 적용했다.
- GitHub 포트폴리오 통합을 완료했다.
- governance, rules, native iOS workflow, harness 문서를 정리했다.
- local/native harness 기준을 정리했고, `scripts/harness/native-ios-check.sh --scan-only`를 사용할 수 있다.
- Local Beta v0.1 설치 체크리스트를 작성했다.
- 약 10명 대상 Local Beta 설치는 당장 진행하지 않는다.

현재 상태는 폐기하지 않고 보존한다. 이후 재개할 때는 이 문서와 설치 체크리스트를 기준으로 다시 시작한다.

## 2. 현재 보류 이유

- PM은 약 10명 대상 설치를 즉시 진행하지 않기로 결정했다.
- 제품은 Local Beta 설치 준비 직전 단계에서 일시 보류한다.
- 보류는 프로젝트 중단이 아니라, 현재 구현과 의사결정을 보존한 뒤 다음 실행 시점을 기다리는 상태다.

## 3. 재개 시 가장 먼저 할 일

재개할 때는 바로 설치부터 진행하지 않는다. 먼저 아래 순서로 상태를 다시 확인한다.

1. `main`을 최신화한다.

   ```bash
   git fetch origin
   git checkout main
   git pull --ff-only origin main
   ```

2. native iOS harness scan-only 검사를 실행한다.

   ```bash
   bash scripts/harness/native-ios-check.sh --scan-only
   ```

3. PM Mac의 Superpowered local SDK와 local config를 확인한다.

   - `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`
   - `native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig`

4. 첫 iPhone 설치 리허설을 진행한다.

   - 앱 설치
   - 앱 이름 `BPM` 확인
   - 마이크 권한 허용
   - 25초 자동 측정
   - 대표 BPM 후보 표시
   - `30S` 재측정
   - 중지=취소
   - silence/no BPM 상태
   - 설정/debug 진입

5. 리허설 결과를 보고 10명 설치 진행 여부를 다시 결정한다.

## 4. 남은 작업

- Local Beta 설치 체크리스트 보완, 필요 시
- Local Beta 피드백 템플릿 작성
- 첫 기기 설치 리허설
- 10명 대상 로컬 개발자 설치 운영
- 실제 사용자 피드백 수집
- 약 2주 피드백 후 피벗 또는 계속 진행 여부 판단

## 5. 주의사항

- 현재 단계는 App Store 배포가 아니다.
- 현재 단계는 TestFlight 배포가 아니다.
- Superpowered SDK와 license key는 repo에 포함하지 않는다.
- Superpowered license와 public release 조건은 대고객 출시 전 별도 검토가 필요하다.
- raw audio를 저장하지 않는다.
- raw audio를 서버로 전송하지 않는다.
- raw sample debug 출력은 하지 않는다.
- BPM 결과는 정답이 아니라 현재 측정 구간 기준의 BPM 후보다.
- 전주, 리듬이 약한 구간, 소음이 큰 환경에서는 후보가 흔들릴 수 있다.

## 6. 관련 문서

- `docs/release/LOCAL_BETA_V0_1_INSTALL_CHECKLIST.md`
- `docs/product/NATIVE_IOS_WORKFLOW.md`
- `docs/product/LOCAL_BETA_AND_STITCH_UI_PLAN.md`
- `docs/product/BETA_RELEASE_STRATEGY.md`
- `docs/rules/native-ios-rules.md`
- `docs/rules/superpowered-rules.md`
- `docs/harness/native-ios-harness-check.md`
- `native-ios/BPM-native-field-poc/docs/research/superpowered-live-analyzer-spike-result.md`
