# Vercel Deployment Guide

이 문서는 BPM 자동 측정 모바일웹 MVP를 Vercel에 연결하고, PM이 preview 배포와 main 배포를 확인하는 방법을 정리합니다.

Issue #6의 목적은 배포 준비 문서와 운영 절차를 만드는 것입니다. Codex는 실제 Vercel 계정에 로그인하거나 외부 서비스 연결을 대신하지 않습니다.

## 1. 왜 Vercel을 사용하는가

초기 모바일웹 MVP의 배포 플랫폼은 Vercel로 결정했습니다.

이유:

- Next.js 프로젝트를 쉽게 배포할 수 있습니다.
- GitHub 저장소와 연결하면 PR마다 preview URL을 확인할 수 있습니다.
- main 브랜치에 병합된 내용을 production 배포로 확인하기 쉽습니다.
- 혼자 운영하는 프로젝트에서 설정 부담이 작습니다.
- iPhone/Android 브라우저에서 마이크 권한 흐름을 확인하려면 HTTPS 주소가 필요합니다.

Cloudflare Pages는 현재 기본 선택지가 아닙니다. 프로젝트가 나중에 단순 React/Vite 정적 앱으로 바뀌는 경우에만 대안으로 검토합니다.

## 2. Codex가 하는 일과 PM이 하는 일

Codex가 할 수 있는 일:

- 배포 준비 문서를 작성합니다.
- `README_FOR_PM.md`에 배포 확인 흐름을 짧게 정리합니다.
- `.gitignore`에 `.vercel/`이 제외되어 있는지 확인합니다.
- 배포 전 확인할 `harness-check` 기준을 문서화합니다.
- 배포 후 PM 체크리스트를 정리합니다.

PM이 Vercel 화면에서 직접 해야 하는 일:

- Vercel에 로그인합니다.
- GitHub 계정을 Vercel과 연결합니다.
- `BPM` GitHub 저장소를 Vercel 프로젝트로 가져옵니다.
- Vercel이 프로젝트를 Next.js로 인식하는지 확인합니다.
- PR preview URL이 생성되는지 확인합니다.
- main 병합 후 production 배포가 생성되는지 확인합니다.
- iPhone/Android 브라우저에서 실제 마이크 권한과 측정 흐름을 확인합니다.

주의:

- 비밀 설정값은 코드나 문서에 적지 않습니다.
- Vercel 화면에서 요구하는 권한 승인과 프로젝트 연결은 PM이 직접 처리합니다.
- 이번 Issue에서는 `vercel.json`, 배포용 GitHub Actions workflow, 도메인 연결을 추가하지 않습니다.

## 3. Vercel 연결 전 확인 항목

Vercel에 연결하기 전 아래를 확인합니다.

- [ ] GitHub main 브랜치가 최신인가?
- [ ] 현재 PR의 GitHub Actions `harness-check`가 통과했는가?
- [ ] `npm run build`가 통과했는가?
- [ ] `npm run lint`가 통과했는가?
- [ ] `npm test --if-present`가 통과했는가?
- [ ] privacy check가 통과했는가?
- [ ] bpm-ui-check가 통과했는가?
- [ ] `.vercel/`이 Git 추적 대상에 없는가?
- [ ] 앱 코드에 BPM 기능, 마이크 권한, 오디오 분석 로직 변경이 섞이지 않았는가?

## 4. GitHub와 Vercel 연결 절차

PM은 Vercel 화면에서 아래 순서로 진행합니다.

1. Vercel에 로그인합니다.
2. `Add New Project` 또는 `New Project`를 선택합니다.
3. GitHub 계정 연결을 선택합니다.
4. GitHub 저장소 목록에서 `BPM` 저장소를 선택합니다.
5. Framework Preset이 `Next.js`로 잡히는지 확인합니다.
6. Root Directory가 프로젝트 루트인지 확인합니다.
7. Install Command는 기본값 또는 `npm install`로 둡니다.
8. Build Command는 `npm run build`인지 확인합니다.
9. Output Directory는 Vercel 기본값을 사용합니다.
10. Production Branch가 `main`인지 확인합니다.
11. 첫 배포를 실행합니다.

현재 프로젝트는 별도 환경 설정값 없이 시작합니다. 나중에 외부 서비스나 서버 설정이 생기면 별도 Issue에서 문서화합니다.

## 5. PR preview 배포 확인 방법

PR preview는 main에 병합하기 전에 확인하는 임시 배포 주소입니다.

PM 확인 순서:

1. GitHub PR 화면을 엽니다.
2. PR 하단의 checks 또는 Vercel comment 영역을 확인합니다.
3. Vercel preview 링크를 엽니다.
4. 모바일 화면 크기로 기본 화면이 깨지지 않는지 확인합니다.
5. 가능한 경우 iPhone/Android 브라우저에서도 preview URL을 엽니다.
6. 문제가 있으면 PR에 코멘트를 남기고 Codex에게 수정을 요청합니다.

preview 배포는 검수용입니다. 사용자에게 공유하는 기준 주소는 main 병합 후 production 배포로 봅니다.

## 6. main 배포 확인 방법

main 배포는 PR이 main에 병합된 뒤 만들어지는 production 배포입니다.

PM 확인 순서:

1. PR 병합 전 GitHub Actions `harness-check`가 통과했는지 확인합니다.
2. PR을 main에 병합합니다.
3. Vercel Dashboard에서 새 production deployment가 생성되는지 확인합니다.
4. 배포가 완료되면 production URL을 엽니다.
5. 앱 첫 화면과 주요 흐름이 main 기준으로 정상인지 확인합니다.
6. 문제가 있으면 배포 URL, 기기, 브라우저, 실제 동작을 기록합니다.

## 7. 배포 전 harness-check 확인 기준

배포 전에는 GitHub Actions `harness-check`가 통과해야 합니다.

현재 필수 검사:

- build
- lint
- test
- privacy check
- bpm-ui-check

실패 시 기준:

- build 실패: 배포 전 수정 필요
- lint 실패: 배포 전 수정 필요
- test 실패: 배포 전 수정 필요
- privacy check 실패: 오디오 저장 또는 서버 전송 위험이 있으므로 병합 보류
- bpm-ui-check 실패: 추천 BPM, 후보 BPM, 신뢰도, 다시 측정, 불안정 결과 안내 같은 핵심 UI 누락 가능성이 있으므로 병합 보류

BPM 정확도 검사는 아직 자동 차단 조건이 아닙니다. V0에서는 PM 수동 검수 항목으로 관리합니다.

## 8. 배포 후 PM 체크리스트

배포가 끝나면 PM은 아래를 확인합니다.

- [ ] 모바일에서 사이트 접속이 되는가?
- [ ] 첫 화면이 깨지지 않는가?
- [ ] 측정 시작 버튼이 보이는가?
- [ ] 마이크 권한 요청 전 안내가 보이는가?
- [ ] 권한 허용 후 10초 측정 상태가 보이는가?
- [ ] 측정 중 남은 시간이 보이는가?
- [ ] 측정 완료 후 추천 BPM이 보이는가?
- [ ] 후보 BPM이 최대 3개까지 보이는가?
- [ ] 신뢰도가 `낮음`, `보통`, `높음` 중 하나로 보이는가?
- [ ] 다시 측정 버튼이 보이는가?
- [ ] 권한 거부 시 실제 탭 측정 기능처럼 보이지 않는 안내가 보이는가?
- [ ] 불안정 결과에서 BPM을 억지로 표시하지 않는가?
- [ ] 오디오를 저장하거나 서버로 전송하지 않는다는 제품 원칙과 충돌하는 문구가 없는가?
- [ ] 가능한 경우 iPhone 브라우저에서 기본 흐름을 확인했는가?
- [ ] 가능한 경우 Android 브라우저에서 기본 흐름을 확인했는가?

## 9. 실패하거나 이상한 경우 기록 양식

문제가 생기면 아래 형식으로 기록합니다.

```text
확인한 URL:
확인한 기기:
브라우저:
발생한 화면:
기대한 동작:
실제 동작:
다시 시도해도 반복되는가:
스크린샷 또는 화면 기록 여부:
추가 메모:
```

이 기록을 PR 코멘트나 새 Issue에 남기면 Codex가 원인을 찾기 쉽습니다.

## 10. 문제가 생겼을 때 기본 대응

빠른 대응:

1. Vercel Dashboard의 Deployments 목록을 엽니다.
2. 문제가 생기기 전 정상 배포를 찾습니다.
3. Vercel의 이전 배포 복구 기능을 검토합니다.
4. 실제 URL에서 문제가 멈췄는지 확인합니다.

코드 상태 정리:

1. 문제가 된 PR 또는 commit을 찾습니다.
2. 되돌리는 PR을 새로 만듭니다.
3. `harness-check`를 다시 통과시킵니다.
4. PM이 확인 후 main에 병합합니다.

긴급 상황에서는 먼저 Vercel에서 사용자 영향을 줄이고, 이후 GitHub에서 변경 이력을 정리합니다.

## 11. 이번 Issue에서 다루지 않는 것

Issue #6에서는 아래 작업을 하지 않습니다.

- BPM 기능 코드 수정
- BPM 알고리즘 개선
- 마이크 권한 로직 수정
- 오디오 분석 로직 수정
- 탭 보정 기능 추가
- 실제 Vercel 계정 로그인 또는 외부 서비스 연결 대행
- `vercel.json` 추가
- 배포 자동화 GitHub Actions workflow 추가
- 도메인 연결
- 환경 설정값 고도화
- 회원가입
- 결제
