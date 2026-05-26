# Harness Rules

이 문서는 나중에 자동 검사 스크립트로 만들 기준을 정의합니다.

Harness는 PR이 제품 정책을 지키는지 자동으로 확인하는 검사입니다.

## 1. Harness 목적

사람이 매번 놓치기 쉬운 규칙을 자동으로 확인한다.

특히 이 프로젝트에서는 다음을 자동으로 확인해야 한다.

- 측정 시간 정책
- BPM 범위 정책
- 신뢰도 표시 정책
- 불안정 결과 안내 정책
- 오디오 저장 금지
- 오디오 서버 전송 금지
- 측정 후 마이크 중지

## 2. 초기 필수 Harness 검사

초기에는 검사 범위를 너무 크게 잡지 않는다. 첫 모바일웹 MVP에서는 다음 5가지를 필수로 둔다.

- build
- lint
- test
- privacy check
- BPM result UI check

초기에는 BPM 정확도 테스트를 자동 차단 조건으로 두지 않는다. 정확도는 PM 수동 검수 항목으로 관리한다.

필수 차단 조건:

- 빌드 실패
- lint 실패
- 테스트 실패
- 오디오 서버 전송 가능성 발견
- BPM 결과 화면에서 신뢰도 또는 후보 BPM 누락

나중에 다음과 같은 명령으로 묶는다.

```text
npm run harness
```

초기 필수 명령 초안:

```text
npm run build
npm run lint
npm run test
npm run harness:privacy
npm run harness:bpm-result-ui
```

추후 기능이 준비되면 다음 검사를 필수로 승격할 수 있다.

- `npm run harness:policy`
- `npm run harness:mic-stop`
- `npm run harness:sample-bpm`
- `npm run harness:mobile`
- `npm run test:e2e`

## 3. Policy 검사

확인할 항목:

- 기본 측정 시간이 15초인지
- 기본 BPM 최소값이 10인지
- 기본 BPM 최대값이 500인지
- 결과 타입에 confidence가 포함되는지
- unstable 상태가 존재하는지
- BPM 결과가 후보 목록 형태를 지원하는지
- unstable 상태에서 다시 측정과 탭 보정 안내가 가능한지

통과 조건:

- 측정 기본값이 15초다.
- BPM 최소값이 10이다.
- BPM 최대값이 500이다.
- 결과 데이터에 BPM 후보와 confidence가 있다.
- unstable 상태 또는 그에 해당하는 불안정 결과 상태가 있다.

실패 조건:

- 측정 기본값이 15초가 아니다.
- BPM 범위가 10~500을 벗어나도록 기본 설정되어 있다.
- confidence 없는 BPM 결과를 표시할 수 있다.
- 불안정 결과에서 다음 행동을 제공하지 않는다.

## 4. Privacy 검사

확인할 항목:

- 오디오 파일 저장 코드가 없는지
- audio blob 업로드 코드가 없는지
- raw audio를 서버로 보내는 API가 없는지
- localStorage 또는 IndexedDB에 오디오를 저장하지 않는지
- fetch 또는 API 요청에 raw audio, blob, PCM, waveform이 포함되지 않는지

통과 조건:

- 초기 MVP에서 raw audio를 저장하지 않는다.
- 초기 MVP에서 raw audio를 서버로 전송하지 않는다.
- 브라우저 메모리 안의 임시 분석만 허용한다.

실패 조건:

- 오디오 파일 저장 코드가 있다.
- 오디오 blob 또는 PCM 데이터를 서버로 보내는 코드가 있다.
- localStorage, IndexedDB, 파일 시스템에 오디오를 저장하는 코드가 있다.

## 5. Mic Stop 검사

확인할 항목:

- 측정 완료 시 마이크 stop
- 측정 취소 시 마이크 stop
- 오류 발생 시 마이크 stop
- 화면 이탈 처리 가능 시 마이크 stop

통과 조건:

- 측정 완료, 취소, 오류 흐름에서 마이크 입력을 중지한다.
- 마이크 중지 실패 시 사용자에게 오류 상태를 보여줄 수 있다.

실패 조건:

- 측정 완료 후 마이크가 계속 켜질 수 있다.
- 취소 또는 오류 흐름에서 마이크 중지 처리가 없다.

## 6. Mobile UI 검사

확인할 항목:

- 모바일 viewport에서 첫 화면이 깨지지 않는지
- 측정 시작 버튼이 보이는지
- 결과 화면에 BPM 후보와 신뢰도가 보이는지
- unstable 상태에 다시 측정과 탭 보정이 보이는지
- 권한 거부 안내가 보이는지

통과 조건:

- 사용자가 시작, 측정 중, 결과, 불안정, 권한 거부 상태를 구분할 수 있다.
- BPM 후보와 신뢰도가 모바일 화면에서 함께 보인다.
- 권한 거부 시 대체 안내가 보인다.

실패 조건:

- BPM 숫자만 보이고 신뢰도 또는 후보가 없다.
- 불안정 결과에서 다시 측정 또는 탭 보정이 없다.
- 권한 거부 시 사용자가 다음 행동을 알 수 없다.

## 7. Sample BPM 검사

초기 V0에서는 Sample BPM 검사를 자동 차단 조건으로 두지 않는다. 이 검사는 PM 수동 검수 또는 참고용 검사로 관리한다.

확인할 항목:

- 80 BPM 기준 샘플
- 120 BPM 기준 샘플
- 160 BPM 기준 샘플
- 작은 입력 또는 소음 환경 샘플

통과 조건:

- 기준 샘플에서 실제 BPM 근처 후보가 표시된다.
- 모든 결과에 신뢰도가 표시된다.
- 작은 입력 또는 소음 환경에서는 낮은 신뢰도 또는 불안정 상태가 표시된다.

실패 조건:

- 기준 샘플 결과에 confidence가 없다.
- 불안정해야 할 환경에서 확정 결과처럼 표시한다.
- 샘플 테스트가 전혀 없다.

V0에서는 위 실패 조건이 바로 merge 차단을 의미하지 않는다. 단, PM 검수에서 정확도 리스크로 기록해야 한다.

## 8. GitHub Actions 연결

PR이 생성되거나 업데이트되면 `harness-check.yml`에서 harness를 실행한다.

통과하지 못하면 merge하지 않는다.

`harness-check.yml`을 우회하거나 삭제하는 변경은 고위험 변경으로 본다. 이 경우 Codex review, harness-check 통과, PM 체크리스트 확인 후에만 병합할 수 있다.

실제 `harness-check.yml` 생성은 Next.js 앱 초기화 이후 Issue #3에서 진행한다.

- Issue #2에서는 Next.js 모바일웹 프로젝트 초기화만 진행한다.
- Issue #3에서 build, lint, test, privacy check, BPM result UI check를 기본 검사로 추가한다.
- 정확도 테스트는 초기에는 자동 차단 조건이 아니라 PM 수동 검수 항목으로 둔다.

주의: `package.json`과 UI 소스가 없는 상태에서 workflow를 먼저 활성화하면 `npm ci`, build, UI check가 실패한다.

## 9. PM 검수 항목

- Harness가 단순한 코드 검사만 하지 않고 제품 정책을 검사하는가
- 실패했을 때 어떤 정책을 어겼는지 알 수 있는가
- PR 설명에 harness 결과가 요약되어 있는가
- 기준 BPM 샘플 검사 또는 대체 검증이 포함되어 있는가
