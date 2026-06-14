# README FOR PM

이 문서는 PM이 BPM 통합 저장소를 운영할 때 보는 간단한 기준 문서입니다.

## 현재 한 줄 요약

BPM은 iPhone 마이크로 현장 음악을 듣고 BPM 후보를 보여주는 native iOS Local Beta v0.1 프로젝트입니다.

## 지금 중요한 방향

- 웹 PoC는 `archive/mobile-web/`에 보존되어 있습니다.
- 현재 제품 방향은 native iOS Local Beta입니다.
- Vercel은 현재 메인 배포 경로가 아닙니다.
- Local Beta는 PM의 Mac/Xcode에서 iPhone에 직접 설치하는 방식입니다.
- Superpowered SDK는 로컬에만 두며 repo에 올리지 않습니다.

## PM이 기억해야 할 원칙

- BPM은 정답이 아니라 후보입니다.
- 일반 사용자는 대표 BPM 후보만 봅니다.
- Half / Base / Double은 debug/settings 뒤에 숨깁니다.
- raw audio는 저장하지 않습니다.
- raw audio는 서버로 전송하지 않습니다.
- license key는 절대 문서, 코드, PR 본문에 쓰지 않습니다.

## 작업 운영 흐름

1. Issue 초안을 작성합니다.
2. 구현 계획을 확인합니다.
3. PM이 범위와 제외 범위를 승인합니다.
4. Codex가 branch 또는 worktree에서 작업합니다.
5. local harness를 실행합니다.
6. PR을 만듭니다.
7. GitHub Actions와 PM 체크리스트를 확인합니다.
8. PM 최종 승인 후 merge합니다.

## PM이 PR에서 확인할 것

- Issue 범위만 다루는가?
- main을 직접 수정하지 않았는가?
- `scripts/harness/native-ios-check.sh --scan-only`가 통과했는가?
- Superpowered SDK가 포함되지 않았는가?
- `LocalSuperpoweredConfig.xcconfig`가 포함되지 않았는가?
- license key가 보이지 않는가?
- raw audio 파일이나 저장/전송 코드가 없는가?
- 사용자 화면에서 BPM이 정답처럼 보이지 않는가?

## Local Beta 설치 전 확인

- Xcode signing team 확인
- iPhone Developer Mode 확인
- 마이크 권한 확인
- 25초 기본 측정 확인
- `30S` 재측정 확인
- debug/settings 화면에서 필요한 PM 검수값 확인

## 참고 문서

- 작업 규칙: `AGENTS.md`
- 제품 범위: `docs/product/MVP_SCOPE.md`
- 제품 요구사항: `docs/product/PRD.md`
- 기술 기준: `docs/product/TRD.md`
- native workflow: `docs/product/NATIVE_IOS_WORKFLOW.md`
- harness: `docs/harness/native-ios-harness-check.md`
