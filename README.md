# BPM Automatic Measurement

모바일 기기의 마이크로 주변 음악을 듣고 BPM을 자동으로 추정하는 모바일웹 프로젝트입니다.

초기 목표는 모바일웹 MVP입니다. 사용자가 직접 버튼을 박자에 맞춰 누르지 않아도, 앱이 음악을 듣고 추천 BPM, 후보 BPM, 신뢰도를 보여주는 흐름을 만드는 것이 목표입니다.

## 현재 단계

Issue #2 기준으로 Next.js 모바일웹 프로젝트 초기화가 완료되었습니다.

현재 포함된 것:

- Next.js 프로젝트 구조
- TypeScript 설정
- App Router 기반 `src/app` 구조
- 모바일웹 기준 기본 홈 화면
- 기본 전역 스타일
- 이후 기능 구현을 위한 `src/components`, `src/lib`, `src/types` 폴더

## 아직 구현되지 않은 것

아래 기능은 아직 구현하지 않았습니다. 이후 Issue에서 순서대로 추가합니다.

- 마이크 권한 요청
- BPM 측정
- 후보 BPM 계산
- 신뢰도 계산 및 표시
- 탭 보정
- `harness-check`
- Vercel 배포 연결

현재 홈 화면은 프로젝트가 준비 중임을 보여주는 기본 화면입니다. 실제 마이크 측정 기능은 아직 동작하지 않습니다.

## 로컬 실행 방법

처음 한 번 패키지를 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

빌드와 lint를 확인합니다.

```bash
npm run build
npm run lint
npm test --if-present
```

## 주요 폴더 구조

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
  lib/
  types/
```

폴더 역할:

- `src/app`: Next.js App Router 화면과 전역 스타일
- `src/components`: 이후 화면 구성 요소를 둘 위치
- `src/lib`: 이후 BPM 분석, 개인정보 검사, 공통 로직을 둘 위치
- `src/types`: 이후 BPM 결과, 신뢰도, 측정 상태 타입을 둘 위치

## 주요 문서

- [README_FOR_PM.md](README_FOR_PM.md): PM을 위한 운영 안내
- [AGENTS.md](AGENTS.md): Codex와 에이전트 작업 규칙
- [WORKFLOW.md](WORKFLOW.md): Issue, Worktree, PR, 검수 흐름
- [docs/PROJECT_DECISIONS.md](docs/PROJECT_DECISIONS.md): 확정된 프로젝트 결정사항
- [docs/product/PRD.md](docs/product/PRD.md): 제품 요구사항
- [docs/product/TRD.md](docs/product/TRD.md): 기술 설계 초안
- [docs/product/MVP_SCOPE.md](docs/product/MVP_SCOPE.md): MVP 포함/제외 범위
- [docs/rules](docs/rules): 오디오, 개인정보, UI, 테스트, harness 규칙

## 다음 Issue

다음 작업은 기능을 한 번에 크게 만들지 않고, 작은 단위로 나누어 진행합니다.

1. Issue #3: `harness-check` 기본 검사 구성
2. Issue #4: V0 BPM 측정 프로토타입 구현

Issue #3에서는 build, lint, test, privacy check 같은 기본 자동 검사를 준비합니다.

Issue #4에서는 마이크 입력 기반 BPM 측정 흐름을 처음으로 구현합니다.
