# WORKFLOW

이 문서는 BPM 자동 측정 프로젝트를 Codex Desktop App, GitHub, 멀티 에이전트, Harness, GitHub Actions로 운영하는 방법을 설명합니다.

## Standard Workflow

모든 작업은 다음 순서로 진행한다.

1. PM이 요구사항을 입력한다.
2. Codex planner agent가 요구사항, 리스크, 범위를 분석한다.
3. PM이 범위와 정책을 승인한다.
4. Codex가 GitHub Issue 초안을 작성하고, PM 승인 후 GitHub Issue를 생성한다.
5. Codex가 구현 계획을 작성한다.
6. PM이 구현 계획을 승인한다.
7. Codex App에서 기본적으로 Worktree로 작업을 시작한다. 단, 낮은 위험의 문서 작업은 Local 또는 Branch 작업을 허용한다.
8. Codex가 코드를 수정한다.
9. Codex가 로컬 harness script와 테스트를 실행한다.
10. Codex가 PR을 생성한다.
11. PR 생성 후 GitHub Actions harness-check, Codex review, 사람 검수를 진행한다.
12. 문제가 있으면 Codex가 수정하고 다시 검사한다.
13. 모든 검증이 통과하면 PM이 최종 승인한다. 단, 고위험 변경은 병합을 보류한다.
14. main 브랜치에 merge한다.
15. Vercel production으로 배포한다.
16. 배포 후 PM이 실제 동작을 확인한다.

쉬운 말로 정리하면, PM은 요구사항과 계획을 먼저 승인하고, Codex는 승인된 범위 안에서만 작업한다. 작업이 끝난 뒤에는 자동 검사와 사람 검수를 모두 통과해야 main에 들어가고 배포된다.

## 한눈에 보는 흐름

```text
PM 요구사항 입력
-> planner agent 분석
-> PM 범위/정책 승인
-> Codex GitHub Issue 초안 작성
-> PM Issue 승인
-> GitHub Issue 생성
-> Codex 구현 계획 작성
-> PM 구현 계획 승인
-> 기본은 Codex App Worktree로 작업 시작
-> Codex 코드 수정
-> 로컬 harness script와 테스트 실행
-> PR 생성
-> GitHub Actions harness-check + Codex review + 사람 검수
-> 문제 있으면 수정 후 재검사
-> PM 최종 승인
-> main merge
-> Vercel production 배포
-> PM 배포 후 실제 동작 확인
```

## 1. 요구사항 입력

PM은 만들고 싶은 기능을 쉬운 말로 작성한다. 예를 들어 "마이크 권한을 요청하고 권한 거부 시 안내를 보여줘"처럼 쓴다.

요구사항에는 다음이 포함되면 좋다.

- 사용자 상황
- 필요한 화면
- 성공 기준
- 제외할 범위
- PM이 검수할 항목

## 2. Planner Agent 분석과 PM 승인

Planner agent는 요구사항을 바로 코드로 만들지 않고 먼저 분석한다.

- 이 작업이 MVP 범위인지 확인
- 정책 위반 가능성 확인
- 필요한 파일과 테스트 예상
- GitHub Issue 초안 작성
- 작업을 너무 크게 잡지 않도록 분리

PM은 이 단계에서 범위와 정책을 승인한다. 예를 들어 "이번 작업에서는 권한 거부 안내까지만 하고 실제 BPM 분석은 다음 Issue로 분리한다"처럼 범위를 확정한다.

PM 승인 전에는 Issue를 만들거나 코드를 수정하지 않는다.

## 3. GitHub Issue 초안 작성과 생성

Issue는 작업 카드다. 이 프로젝트에서는 Codex가 먼저 Issue 초안을 작성하고, PM이 승인한 뒤에만 GitHub Issue를 생성한다.

운영 원칙:

- Codex는 코드를 작성하기 전에 Issue 초안을 먼저 작성한다.
- PM은 Issue의 목적, 범위, 제외 범위, 완료 기준을 검토한다.
- 승인 후 Codex가 GitHub에 생성하거나, PM이 직접 복사해서 생성한다.
- Issue 없이 큰 기능 개발을 시작하지 않는다.

Issue 초안에는 다음이 들어가야 한다.

- 배경
- 목표
- 포함 범위
- 제외 범위
- 완료 조건
- 검수 체크리스트

PM 승인 전에는 GitHub Issue를 생성하지 않는다. 단, PM이 "초안 그대로 생성해줘"라고 명시하면 Codex가 생성할 수 있다.

## 4. 구현 계획 작성과 PM 승인

Codex는 Issue를 보고 구현 계획을 작성한다.

구현 계획에는 다음이 들어가야 한다.

- 바꿀 파일 또는 만들 파일
- 화면 또는 기능 변화
- 지켜야 할 BPM 정책
- 실행할 테스트와 harness
- 예상 리스크

PM은 구현 계획을 보고 승인한다. 승인 전에는 Codex가 코드를 수정하지 않는다.

## 5. Worktree와 Branch 생성

이 프로젝트의 기본 작업 방식은 Codex App Worktree다.

Worktree를 기본으로 사용하는 작업:

- 기능 구현
- 오디오 분석
- 마이크 권한
- 배포 설정
- harness 수정

Local 또는 단순 Branch 작업을 허용하는 작업:

- README 수정
- 문서 초안 작성
- 오타 수정
- 위험도가 낮은 운영 문서 보강

Issue 하나마다 Branch 하나를 만든다.

예시:

```text
codex/issue-1-docs
codex/issue-2-nextjs-init
codex/issue-3-mic-permission
```

Worktree는 Codex가 해당 Branch에서 안전하게 작업하는 별도 공간이다. main 브랜치에는 검수되지 않은 변경을 직접 반영하지 않는다.

## 6. Branch 작업

Codex는 Issue 범위 안에서만 작업한다. 범위가 커지면 새 Issue로 분리한다.

작업 중 반드시 확인할 기준:

- 제품 정책 유지
- 오디오 저장/전송 금지
- 측정 후 마이크 중지
- 신뢰도 표시
- 불안정 결과 안내

## 7. Harness 실행

PR 전에는 harness를 실행한다. Harness는 사람이 놓치기 쉬운 정책 위반을 자동으로 찾는 검사다.

초기 필수 검사:

- 빌드 검사
- 린트
- 테스트
- 오디오 저장/전송 금지 검사
- BPM 결과 UI 검사

V0의 `harness-check.yml`은 `build`, `lint`, `test`, `privacy check`, `BPM result UI check`를 필수로 둔다. 마이크 중지 상세 검사, 샘플 BPM 검사, 전체 모바일 E2E 검사는 기능이 준비되는 단계에서 필수 검사로 승격한다.

초기에는 BPM 정확도 테스트를 자동 차단 조건으로 두지 않는다. 정확도는 PM 수동 검수 항목으로 관리한다.

필수 차단 조건:

- 빌드 실패
- lint 실패
- 테스트 실패
- 오디오 서버 전송 가능성 발견
- BPM 결과 화면에서 신뢰도 또는 후보 BPM 누락

테스트나 harness가 실패하면 PR을 만들기 전에 Codex가 수정하고 다시 검사한다.

## 8. PR 생성

PR에는 다음을 적는다.

- 어떤 Issue를 해결했는지
- 무엇을 변경했는지
- 어떤 검사를 실행했는지
- PM이 확인해야 할 화면 또는 동작
- 남은 리스크

## 9. PR 이후 검수

PR 생성 후에는 세 가지 검수를 진행한다. PR 단계에서는 Vercel preview 배포를 확인할 수 있어야 한다.

- GitHub Actions harness-check: 자동 검사
- Codex review: 코드, 정책, 테스트 기준 확인
- 사람 검수: 제품 의도, 문구, 사용자 흐름 확인
- Vercel preview: PR별 미리보기 배포 확인

문제가 있으면 Codex가 수정하고 다시 harness와 필요한 테스트를 실행한다. 수정 후에는 같은 PR에서 다시 검수한다.

## 10. 최종 승인

모든 검증이 통과하면 PM이 최종 승인한다. 이 프로젝트에서는 기본적으로 PM 1명의 최종 승인으로 충분하다.

최종 승인 조건:

- Issue 완료 조건 충족
- GitHub Actions harness-check 통과
- Codex review 완료
- 사람 검수 완료
- PM이 확인해야 할 항목 확인

PR 최종 승인자는 PM 1명으로 한다.

단, 고위험 변경은 바로 병합하지 않는다.

고위험 변경:

- 마이크 권한 처리 변경
- 오디오 저장 또는 서버 전송 관련 변경
- BPM 계산 알고리즘 변경
- 개인정보/프라이버시 문구 변경
- 배포 설정 변경
- harness-check 우회 또는 삭제
- BPM 결과의 신뢰도/후보 표시 제거

고위험 변경은 다음을 모두 확인한 뒤 병합한다.

- Codex review 완료
- harness-check 통과
- PM 체크리스트 확인

필요하면 외부 개발자 또는 전문가에게 일회성 리뷰를 요청한다.

## 11. Merge

PM 또는 maintainer가 PR을 승인하고 GitHub Actions가 통과하면 main에 merge한다.

main 브랜치는 사용자에게 배포될 수 있는 안정된 기준 브랜치로 본다.

## 12. Deploy와 배포 후 확인

main에 merge되면 Vercel production 배포를 목표로 한다. 배포 전에는 `harness-check.yml`이 통과해야 한다.

모바일웹 MVP의 초기 배포 플랫폼은 Vercel로 결정한다.

Vercel로 결정한 이유:

- 모바일웹 MVP를 빠르게 배포하기 쉽다.
- GitHub와 연결해 PR별 preview 확인이 쉽다.
- Next.js를 사용할 경우 배포 구조가 단순하다.
- 혼자 하는 프로젝트에서 설정 부담이 적다.

단, Cloudflare Pages는 기본 배포 플랫폼이 아니라 대안으로만 문서에 기록한다. 프로젝트를 단순 React/Vite 정적 앱으로 만들 경우에만 Cloudflare Pages를 검토한다.

배포 후 PM은 실제 모바일 브라우저에서 핵심 흐름을 확인한다.

- 앱이 열리는지
- 측정 시작 버튼이 보이는지
- 마이크 권한 안내가 이해되는지
- 결과 또는 준비 중 상태가 정상적으로 보이는지
- 오디오 저장/전송 금지 안내가 유지되는지

## Merge 전 체크

- Issue 완료 조건 충족
- Harness 통과
- Codex review 완료
- 사람 검수 완료
- 오디오 저장/전송 금지 유지
- 측정 후 마이크 중지 확인
- 모바일 기본 화면 확인
