# BPM Automatic Measurement

모바일 기기의 마이크로 주변 음악의 BPM을 자동 측정하는 모바일웹/모바일앱 프로젝트입니다.

초기 버전은 모바일웹 MVP로 시작합니다. 사용자가 음악을 틀어놓고 측정을 시작하면, 앱은 15초 동안 마이크 입력을 브라우저 안에서 분석해 BPM 후보와 신뢰도를 보여줍니다.

## 제품 목표

- 사용자가 버튼을 일정하게 누르지 않아도 BPM을 자동 측정한다.
- BPM을 단일 정답처럼 보여주지 않고 후보와 신뢰도를 함께 보여준다.
- 측정이 불안정하면 다시 측정 또는 탭 보정을 안내한다.
- 초기 MVP에서는 오디오를 저장하지 않고 서버로 전송하지 않는다.
- 측정 후 마이크 입력을 반드시 중지한다.
- 모바일웹에서 먼저 검증하고, 이후 모바일앱으로 확장할 수 있게 설계한다.

## 핵심 정책

- 기본 측정 시간: 15초
- 기본 BPM 범위: 10~500
- 절반/두 배 BPM 후보를 별도 정책으로 강제하지 않음
- BPM 결과에는 신뢰도 표시
- 불안정 결과는 다시 측정 또는 탭 보정 안내
- 초기 MVP에서는 오디오 저장 금지
- 초기 MVP에서는 오디오 서버 전송 금지
- 측정 후 마이크 입력 중지
- 권한 거부 시 대체 안내 제공

## 주요 문서

- [README_FOR_PM.md](README_FOR_PM.md): PM을 위한 쉬운 운영 안내
- [AGENTS.md](AGENTS.md): Codex와 에이전트 작업 규칙
- [WORKFLOW.md](WORKFLOW.md): Issue, Branch, PR, Harness, Deploy 흐름
- [docs/PROJECT_DECISIONS.md](docs/PROJECT_DECISIONS.md): 확정된 프로젝트 운영 결정
- [docs/product/PRD.md](docs/product/PRD.md): 제품 요구사항
- [docs/product/TRD.md](docs/product/TRD.md): 기술 설계 초안
- [docs/product/MVP_SCOPE.md](docs/product/MVP_SCOPE.md): MVP 포함/제외 범위
- [docs/rules/audio-analysis-rules.md](docs/rules/audio-analysis-rules.md): BPM 분석 규칙
- [docs/rules/privacy-rules.md](docs/rules/privacy-rules.md): 오디오 개인정보 규칙
- [docs/rules/mobile-ui-rules.md](docs/rules/mobile-ui-rules.md): 모바일 UI 규칙
- [docs/rules/testing-rules.md](docs/rules/testing-rules.md): 테스트 규칙
- [docs/rules/harness-rules.md](docs/rules/harness-rules.md): 자동 검사 규칙

## 초기 개발 순서

1. 제품 문서 확정
2. GitHub Issue 생성
3. 모바일웹 프로젝트 초기화
4. 마이크 권한 요청 화면 구현
5. 15초 측정 흐름 구현
6. BPM 후보와 신뢰도 계산 구현
7. 불안정 결과 안내와 탭 보정 구현
8. 오디오 저장/전송 금지와 마이크 중지 검증
9. Harness 자동 검사 연결
10. PR 리뷰와 배포 자동화 연결

## 배포 방향

초기 모바일웹 MVP 배포 플랫폼은 Vercel로 결정합니다. GitHub main 브랜치 병합 후 Vercel production 배포를 목표로 합니다.

이유:

- 모바일웹 MVP를 빠르게 배포하기 쉽습니다.
- GitHub와 연결해 PR별 preview 확인이 쉽습니다.
- Next.js를 사용할 경우 배포 구조가 단순합니다.
- 혼자 하는 프로젝트에서 설정 부담이 적습니다.

배포 전에는 `harness-check.yml`이 통과해야 합니다. PR 단계에서는 Vercel preview 배포를 확인할 수 있어야 합니다.

단, Cloudflare Pages는 기본 배포 플랫폼이 아니라 대안으로만 문서에 기록합니다. 프로젝트를 단순 React/Vite 정적 앱으로 만들 경우에만 Cloudflare Pages를 검토합니다.

## 개인정보 원칙

초기 MVP에서는 오디오를 저장하지 않습니다. 오디오를 서버로 전송하지도 않습니다. BPM 분석은 사용자의 기기 안에서만 수행합니다.
