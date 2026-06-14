# AGENTS.md

이 문서는 Codex와 리뷰어가 BPM 통합 저장소에서 작업할 때 따라야 하는 root 기준 규칙입니다.

## 1. 프로젝트 현재 방향

- 이 repo는 BPM 프로젝트의 포트폴리오 통합 저장소다.
- 기존 웹 PoC는 `archive/mobile-web/`에 보존되어 있다.
- 현재 제품 방향은 `native-ios/BPM-native-field-poc` 기반 native iOS Local Beta v0.1이다.
- Vercel 배포는 현재 메인 제품 배포 경로가 아니다.
- root `docs/product`와 `docs/rules`가 현재 기준이며, `archive/mobile-web` 문서는 과거 웹 PoC 기록이다.

## 2. 작업 순서

모든 기능, 문서, QA, harness 작업은 아래 순서를 따른다.

1. Issue 초안 작성
2. 구현 계획 작성
3. PM 승인
4. branch 또는 worktree 생성
5. 구현
6. local harness 실행
7. PR 생성
8. review
9. PM 최종 승인
10. merge

예외적으로 낮은 위험의 문서 초안은 branch에서 바로 작성할 수 있지만, main 직접 수정은 금지한다.

## 3. 금지 사항

- main 직접 수정 금지
- force push 금지
- Superpowered SDK 커밋 금지
- `LocalSuperpoweredConfig.xcconfig` 커밋 금지
- license key 커밋 또는 출력 금지
- raw audio 저장 금지
- raw audio 서버 전송 금지
- raw sample debug 출력 금지
- App Store, TestFlight, Vercel 배포 자동화 임의 추가 금지
- Tap, BLE, IMU, 파일 분석, 링크 조회, 서버 분석을 임의로 메인 기능에 추가 금지

## 4. native iOS 작업 기준

- native project path: `native-ios/BPM-native-field-poc`
- iOS project: `native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj`
- scheme: `BPMNativeFieldPOC`
- 기본 harness: `scripts/harness/native-ios-check.sh --scan-only`
- Local full build는 Superpowered SDK와 local config가 있는 PM 로컬 Mac에서만 실행한다.
- SDK가 없는 CI에서는 scan-only 기준으로 검사한다.

커밋 전 최소 확인:

```bash
scripts/harness/native-ios-check.sh --scan-only
```

## 5. 사용자 화면 정책

- 일반 사용자 화면은 대표 BPM 후보 중심으로 구성한다.
- 결과는 정답이 아니라 BPM 후보로 표시한다.
- BPM은 일반 사용자 화면에서 정수로 표시한다.
- Half / Base / Double은 일반 사용자 화면에 노출하지 않고 debug/settings 뒤에 둔다.
- 현재 governance 기준은 25초 기본 측정과 `30S` 재측정이다.
- 후보가 흔들리거나 측정 구간 영향이 의심되면 다시 측정을 안내한다.

## 6. 문서 우선순위

현재 작업 기준은 아래 순서로 해석한다.

1. `README_FOR_PM.md`
2. `AGENTS.md`
3. `docs/product/MVP_SCOPE.md`
4. `docs/product/PRD.md`
5. `docs/product/TRD.md`
6. `docs/product/NATIVE_IOS_WORKFLOW.md`
7. `docs/rules/*.md`

archive 문서와 root 문서가 충돌하면 root 문서를 우선한다.

## 7. 완료 보고 형식

Codex는 작업 완료 후 아래 항목을 보고한다.

1. 변경 파일
2. 구현 또는 문서 요약
3. 검사 결과
4. 민감정보 / SDK / license 확인
5. 남은 리스크
6. 다음 추천 단계
