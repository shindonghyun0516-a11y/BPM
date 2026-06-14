# Archive Web PoC Vercel 설정 정리 결정

## 1. 배경

기존 BPM repo는 Next.js 기반 모바일웹 PoC에서 시작했다.

현재 `main` 구조는 BPM 프로젝트를 한 저장소에서 관리하기 위한 통합 구조다.

- 기존 웹 PoC는 `archive/mobile-web/`에 보존되어 있다.
- 현재 제품 방향은 `native iOS Local Beta`다.
- native iOS 앱은 Xcode build, iPhone 실기기 QA, 로컬 개발자 설치를 기준으로 운영한다.
- Vercel은 현재 메인 제품 배포 경로가 아니다.

따라서 Vercel은 과거 웹 PoC 배포 도구로만 취급하며, native iOS Local Beta의 필수 검수 기준으로 보지 않는다.

## 2. 문제

PR에서 Vercel check가 계속 실패 상태로 표시되고 있다.

하지만 현재 검수 기준에서는 다음 check가 더 중요하다.

- `web-archive-harness-check`
- `native-ios-safety-check`

두 harness check가 통과해도 Vercel check가 실패로 표시되면, 리뷰어와 PM에게 다음 혼란을 줄 수 있다.

- native iOS 작업에 문제가 있는 것처럼 보일 수 있다.
- main merge 가능 여부를 잘못 판단할 수 있다.
- 현재 제품 방향이 웹 배포인지 native iOS Local Beta인지 혼동될 수 있다.

Vercel 실패는 native iOS 앱 코드, Superpowered 연동, 개인정보 정책, raw audio 정책과 직접 관련이 없다.

## 3. PM 결정

PM은 Vercel 자동 배포 비활성화 방향을 선택했다.

최종 결정은 다음과 같다.

1. Vercel 자동 배포는 비활성화한다.
2. Vercel은 `main`의 required check로 사용하지 않는다.
3. 웹 archive preview가 필요해지면 별도 Issue에서 `archive/mobile-web/` root 설정을 검토한다.

이 결정은 Vercel을 영구 폐기한다는 뜻이 아니다. 현재 Local Beta 단계에서 Vercel을 native iOS 검수 기준으로 사용하지 않겠다는 뜻이다.

## 4. 선택지 비교

| 선택지 | 내용 | 장점 | 단점 | 현재 판단 |
|---|---|---|---|---|
| A. Vercel 자동 배포 비활성화 | Vercel Git integration 또는 자동 preview deploy를 끈다. | native iOS PR에서 불필요한 실패 check가 사라진다. | 웹 preview를 바로 볼 수 없다. | 우선 추천 |
| B. Vercel root를 `archive/mobile-web/`로 변경 | Vercel project root를 archive 웹 PoC 경로로 맞춘다. | 웹 PoC preview를 유지할 수 있다. | 추가 설정과 유지보수가 필요하다. native iOS PR에서도 preview가 필요한지 불명확하다. | 후속 선택지 |
| C. Vercel check를 required에서 제외 | GitHub branch protection 또는 ruleset에서 Vercel을 required status check로 두지 않는다. | Vercel 실패가 merge blocker가 되지 않는다. | 실패 check가 화면에는 계속 보일 수 있다. | A와 함께 추천 |

## 5. 현재 추천

현재 결정은 `A + C`다.

- A: Vercel 자동 배포 비활성화
- C: Vercel check를 required에서 제외

`B. Vercel root를 archive/mobile-web로 변경`은 웹 archive preview가 실제로 필요하다고 판단된 뒤 별도 Issue로 진행한다.

## 6. PM 수동 작업 체크리스트

GitHub에서 확인할 항목:

- [ ] GitHub repo의 `Settings`로 이동한다.
- [ ] `Branches` 또는 `Rulesets`에서 `main` 보호 규칙을 확인한다.
- [ ] Vercel check가 required status check인지 확인한다.
- [ ] Vercel이 required라면 required 목록에서 제외한다.
- [ ] 변경 후 PR merge 버튼이 Vercel 실패 때문에 막히지 않는지 확인한다.

Vercel Dashboard에서 확인할 항목:

- [ ] Vercel Dashboard에서 BPM 프로젝트를 찾는다.
- [ ] GitHub repo 연결 상태를 확인한다.
- [ ] 자동 preview deploy 또는 production deploy가 켜져 있는지 확인한다.
- [ ] 현재 단계에서는 자동 배포 비활성화 또는 repo 연결 해제를 검토한다.
- [ ] 웹 preview를 계속 유지해야 한다면, 별도 Issue에서 project root를 `archive/mobile-web/`로 변경하는 방식을 검토한다.

## 7. Codex가 할 일

Codex가 할 수 있는 작업:

- Vercel failure가 현재 native iOS 작업의 blocking issue가 아님을 문서화한다.
- PR 설명 또는 post-merge note에 Vercel failure가 non-blocking인 이유를 추가한다.
- README 또는 docs에서 현재 배포 경로가 native iOS Local Beta임을 명확히 한다.
- `web-archive-harness-check`와 `native-ios-safety-check`를 유지한다.
- 향후 웹 preview가 필요할 경우 `archive/mobile-web/` 기준 Vercel 설정 Issue 초안을 작성한다.

Codex가 임의로 하지 않는 작업:

- GitHub branch protection 또는 ruleset을 임의로 변경하지 않는다.
- Vercel Dashboard 설정을 임의로 변경하지 않는다.
- Vercel production 배포를 native iOS 배포 경로로 사용하지 않는다.

## 8. 제외 범위

이번 결정 문서의 제외 범위:

- native iOS 코드 수정
- SwiftUI UI 수정
- Superpowered bridge 수정
- BPM 엔진 수정
- App Store 배포
- TestFlight 배포
- 웹 PoC 기능 수정
- Vercel production을 native iOS 배포 경로로 사용하는 작업
- Superpowered SDK 설정 변경
- license key 설정 변경
- raw audio 저장 또는 서버 전송 기능 추가

## 9. PR / post-merge note

PR 또는 post-merge 설명에는 다음 내용을 남긴다.

```text
Vercel check는 기존 Next.js 웹 PoC 배포 연동에서 남은 항목입니다.
현재 main 제품 방향은 native iOS Local Beta이며, 웹 PoC는 archive/mobile-web/에 보존되어 있습니다.
native iOS 기준 검수는 web-archive-harness-check와 native-ios-safety-check를 우선합니다.
따라서 Vercel failure는 native iOS Local Beta 변경의 blocking issue로 보지 않습니다.
웹 archive preview가 필요하면 별도 Issue에서 Vercel root를 archive/mobile-web로 설정하는 방식을 검토합니다.
```

## 10. 후속 Issue 후보

웹 archive preview가 필요해지면 다음 Issue를 별도로 만든다.

```text
[Deploy] Archive mobile-web Vercel preview root 설정
```

후속 Issue에서 검토할 내용:

- Vercel project root를 `archive/mobile-web/`로 설정
- build command와 install command를 archive 웹 PoC 기준으로 조정
- native iOS PR에서는 Vercel preview가 불필요하게 실행되지 않도록 조건 설정
- 웹 archive preview가 PM 검수에 실제로 필요한지 재판단
