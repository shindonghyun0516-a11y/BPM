# BPM Documentation

이 폴더는 현재 BPM native iOS Local Beta 기준 문서를 담는다.

## 문서 역할

- `docs/product/`: 제품 범위, 요구사항, 기술 기준, beta 운영 전략
- `docs/rules/`: Codex와 리뷰어가 지켜야 하는 작업 규칙
- `docs/harness/`: 로컬/CI 검사 기준
- `docs/deploy/`: 배포 경로와 외부 배포 도구 관련 결정
- `docs/research/`: 실험 결과와 QA 기록 연결

## 배포 기준

현재 메인 제품 방향은 native iOS Local Beta다. Vercel은 현재 메인 배포 경로가 아니다.

- native iOS 검수 기준: `native-ios-safety-check`
- archive 웹 PoC 검수 기준: `web-archive-harness-check`
- Vercel 자동 배포: 비활성화 방향
- 웹 archive preview 복구: 필요 시 별도 Issue에서 `archive/mobile-web/` root 설정 검토

관련 문서:

- [Archive Web PoC Vercel 설정 정리 결정](deploy/archive-web-vercel-decision.md)

## archive 문서와의 관계

`archive/mobile-web/` 아래 문서는 이전 Next.js 모바일웹 PoC 기록이다. 현재 작업 기준은 root `docs/` 문서이며, archive 문서는 과거 판단과 실험을 확인할 때 참고한다.

## native-ios 내부 문서와의 관계

`native-ios/BPM-native-field-poc/docs/`는 구현 세부 기록과 setup 문서다. root 문서는 PM, Codex, GitHub reviewer가 먼저 보는 governance 기준이다.
