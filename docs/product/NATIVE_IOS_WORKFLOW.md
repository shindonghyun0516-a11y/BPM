# Native iOS Workflow

이 문서는 BPM 프로젝트의 네이티브 iOS Local Beta v0.1 작업 흐름을 정의한다.

기존 Next.js / Vercel 기반 모바일웹 워크플로우는 `archive/mobile-web/`에 보존한다. 현재 제품 방향은 iPhone 마이크 기반 네이티브 iOS 앱이며, 배포와 검수 방식도 웹과 다르게 운영한다.

## 1. Why the Web Workflow Does Not Apply

기존 웹 워크플로우는 Next.js 모바일웹 PoC 기준이었다.

웹 워크플로우의 핵심은 다음과 같았다.

- `npm run build`
- `npm run lint`
- browser QA
- Vercel preview / production deploy

하지만 네이티브 iOS 앱은 아래 흐름이 필요하다.

- Xcode project build
- iOS signing 설정
- 실제 iPhone 설치
- 마이크 권한 확인
- 실기기 오디오 입력 QA
- Superpowered SDK / license local config 검수
- TestFlight 또는 App Store 배포 검토

현재 단계에서는 TestFlight와 App Store 배포를 보류한다. 목표는 약 10명 제한의 로컬 개발자 설치 기반 Local Beta다.

따라서 Vercel production 배포 단계는 네이티브 iOS 워크플로우에 적용하지 않는다.

## 2. Native iOS Local Beta Workflow

Local Beta v0.1 작업은 아래 순서로 진행한다.

1. PM 요구사항 입력
2. Planner 분석
3. PM 범위 / 정책 승인
4. Codex GitHub Issue 초안 작성
5. PM Issue 승인
6. GitHub Issue 생성
7. Codex 구현 계획 작성
8. PM 구현 계획 승인
9. Codex App Worktree 또는 branch 생성
10. Codex 코드 수정
11. local native harness 실행
12. iPhone 실기기 QA
13. 문제가 있으면 수정 후 재검사
14. PR 생성
15. GitHub Actions native harness-check
16. Codex review + PM 사람 검수
17. PM 최종 승인
18. main merge
19. Local Beta build / install 준비
20. iPhone 로컬 개발자 설치
21. 10명 실제 사용 확인
22. 피드백 기록
23. 다음 Issue 결정

이 흐름에서 PM 최종 승인 전에는 main에 merge하지 않는다.

## 3. Difference from the Mobile Web Workflow

| 구분 | 기존 모바일웹 PoC | 네이티브 iOS Local Beta |
|---|---|---|
| Build | `npm run build` | `xcodebuild` |
| Lint/Test | ESLint / Node test | native harness + xcodebuild |
| QA | browser QA | iPhone 실기기 QA |
| 배포 | Vercel preview / production | Xcode local developer install |
| 개인정보 검사 | web privacy check | iOS privacy / SDK / license check |
| 마이크 검증 | browser microphone | `AVAudioSession` / `AVAudioEngine` |
| 외부 SDK | 없음 또는 web library | Superpowered local SDK |
| 사용자 배포 | 웹 URL | PM Mac에서 iPhone 직접 설치 |

## 4. Native Harness-Check Criteria

Native PR 또는 release 후보는 최소 아래 항목을 통과해야 한다.

로컬 실행 기준은 [`native-ios-harness-check.md`](../harness/native-ios-harness-check.md)를 따른다.

```bash
scripts/harness/native-ios-check.sh
```

GitHub Actions 또는 SDK 미설치 환경에서는 후속 CI-safe mode로 확장한다. 현재 harness는 현재 tracked file과 현재 working tree 기준 검사이며, Git history에 과거 license key나 SDK가 들어간 적이 있는지는 GitHub push 전 별도 검수에서 확인한다.

### Build

- `xcodebuild` 통과
- Xcode scheme 정상
- iPhone 실기기 build 가능

### Privacy

- raw audio 저장 없음
- raw audio 서버 전송 없음
- raw sample debug 출력 없음
- `AVAudioRecorder` 사용 없음
- `URLSession` 기반 audio upload 없음
- 명백한 upload API 없음

### Superpowered / License

- Superpowered SDK binary/header가 Git tracked 대상이 아님
- `ios/Vendor/Superpowered/`가 Git tracked 대상이 아님
- `LocalSuperpoweredConfig.xcconfig`가 Git tracked 대상이 아님
- 실제 license key가 Git tracked file에 없음
- license key가 화면이나 log에 출력되지 않음

### Xcode Local Files

- `.DS_Store` 없음
- `DerivedData/` 없음
- `build/` output 없음
- `xcuserdata/` 없음
- `*.xcuserstate` 없음

## 5. GitHub Issue / PR Operating Rules

모든 기능, QA, 문서 작업은 Issue로 시작한다.

운영 기준:

- PM이 Issue 목적, 범위, 제외 범위, 완료 기준을 승인한다.
- Codex는 구현 전에 구현 계획을 먼저 작성한다.
- PM이 구현 계획을 승인한 뒤 코드 수정에 들어간다.
- main 브랜치에 직접 작업하지 않는다.
- PR 전 local native harness를 통과해야 한다.
- PR 후 GitHub Actions native harness-check를 통과해야 한다.
- Codex review와 PM 사람 검수를 모두 거친다.
- PM 최종 승인 전에는 main에 merge하지 않는다.

고위험 변경은 별도 검수 대상으로 본다.

- 마이크 권한 처리 변경
- 오디오 입력 pipeline 변경
- Superpowered bridge / LiveAnalyzer / audio feed 변경
- BPM 후보 표시 정책 변경
- privacy 문구 변경
- SDK / license / signing 설정 변경
- raw audio 저장 또는 서버 전송 가능성

## 6. Local Beta Build / Install Criteria

main merge 후 Local Beta 설치 준비를 진행한다.

설치 전 확인:

1. Xcode Signing Team 설정
2. iPhone Developer Mode 활성화
3. iPhone이 Xcode run destination에 표시됨
4. Superpowered SDK local path 준비
5. `LocalSuperpoweredConfig.xcconfig` local-only 준비
6. 실제 license key가 Git에 없는지 확인
7. 앱 build 성공
8. 앱 설치 성공
9. 마이크 권한 요청 확인

실기기 설치 후 QA:

- 앱 이름 `BPM` 표시 확인
- 측정 시작 버튼 확인
- 기본 35초 측정 확인
- `50S` 재측정 확인
- 중지 버튼은 취소로 동작하는지 확인
- 결과가 BPM 확정값이 아니라 후보로 보이는지 확인
- debug/settings 화면 접근 확인
- Half / Base / Double 후보는 일반 화면에서 숨겨져 있는지 확인
- raw audio 저장/서버 전송 없음 확인
- 측정 후 마이크 indicator가 꺼지는지 확인

참고: 과거 QA 문서에는 25초 / 30S 기준이 남아 있을 수 있다. Local Beta v0.1 현재 앱 기준은 기본 35초 측정과 `50S` 재측정이다.

## 7. 10-User Local Beta Flow

Local Beta는 제한된 실제 사용자 피드백 수집을 위한 단계다.

대상:

- 약 10명
- PM이 직접 관리하는 사용자
- TestFlight 외부 배포가 아닌 Xcode 기반 로컬 개발자 설치

운영:

1. PM이 테스트 사용자 목록을 준비한다.
2. 각 iPhone에 직접 설치한다.
3. 앱 실행 / 마이크 권한 / 기본 측정을 확인한다.
4. 스윙 재즈, R&B, 뉴올리언스, 빅밴드 곡으로 실제 사용 피드백을 받는다.
5. 후보가 유용한지, UI가 이해되는지, 측정 시간이 부담스럽지 않은지 기록한다.
6. 피드백을 Issue로 정리한다.
7. 다음 iteration 범위를 PM이 승인한다.

## 8. Feedback Capture Criteria

사용자 피드백은 아래 기준으로 기록한다.

- 테스트 사용자 ID 또는 별칭
- iPhone 모델 / iOS 버전
- 테스트 장소
- 스피커 종류
- 장르 / 곡명
- 알려진 BPM 또는 reference BPM 여부
- 앱 표시 BPM 후보
- 사용자가 느낀 정확도
- 측정 시간이 긴지 / 적절한지
- UI 이해 여부
- 다시 측정 필요 여부
- 불편한 점
- 다음 개선 제안

제품 판단 기준:

- 사용자가 BPM 후보를 바로 이해하는가
- 측정 버튼과 결과 화면이 명확한가
- 후보가 현장에서 실용적인가
- 실패 케이스가 설명 가능한가
- 10명 제한 beta 이후 TestFlight를 검토할 만한가

## 9. Explicitly Out of Scope

Local Beta v0.1 워크플로우에서 아래는 제외한다.

- Vercel production deploy
- App Store release
- TestFlight external beta
- 유료 license 구매
- server-side audio analysis
- raw audio upload
- account / login
- cloud history
- Library / Stats product feature
- Tap / BLE / IMU implementation
- file analysis
- link lookup

이 항목은 별도 PM 승인 전까지 추가하지 않는다.
