# Local Beta v0.1 설치 체크리스트

이 문서는 BPM native iOS Local Beta v0.1을 약 10명의 사용자에게 PM의 Mac/Xcode로 직접 설치하기 위한 체크리스트다.

이 단계는 App Store 또는 TestFlight 배포가 아니다. 목적은 완성품 출시가 아니라 실제 사용자 피드백 수집이다.

## 1. 설치 전 pre-flight 검사

설치 전에 PM Mac에서 아래 검사를 먼저 실행한다.

### 필수 scan-only 검사

```bash
bash scripts/harness/native-ios-check.sh --scan-only
```

정책:

- scan-only가 `FAIL`이면 iPhone 설치를 진행하지 않는다.
- scan-only는 Git에 포함되면 안 되는 SDK, local config, license key, raw audio 파일, Xcode local artifact를 확인한다.
- 이 검사는 GitHub Actions와 로컬 Mac에서 모두 안전하게 실행할 수 있다.

### Local Full build 검사

Superpowered SDK와 local config가 PM Mac에 준비되어 있으면 아래 build도 실행할 수 있다.

```bash
xcodebuild \
  -project native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj \
  -scheme BPMNativeFieldPOC \
  -destination 'generic/platform=iOS' \
  build \
  CODE_SIGNING_ALLOWED=NO
```

정책:

- Local Full build는 Superpowered SDK와 `LocalSuperpoweredConfig.xcconfig`가 준비된 PM Mac에서만 실행한다.
- SDK/config가 없는 환경에서는 scan-only 기준으로만 확인하고, xcodebuild 실패를 설치 가능 여부 판단에 바로 사용하지 않는다.
- license key나 SDK 로컬 절대 경로를 문서, Git, 채팅, 로그에 실제 값으로 쓰지 않는다.
- build가 실패하면 Xcode에서 SDK path, local config, scheme, project path를 먼저 확인한다.

## 2. 설치 전 개발 환경 확인

설치 전에 PM Mac, Xcode, iPhone, Superpowered local setup 상태를 먼저 확인한다.

| 항목 | 확인값 | 상태 | 비고 |
|---|---|---|---|
| macOS 버전 |  |  |  |
| Xcode 버전 |  |  |  |
| Apple Developer Team |  |  | Xcode Signing & Capabilities에서 확인 |
| Bundle Identifier |  |  | 대상 기기 설치용으로 충돌 없는지 확인 |
| Signing 설정 | Automatic / Manual |  | Local Beta에서는 Xcode local signing 기준 |
| Superpowered local SDK 경로 | `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/` |  | Git에 포함하지 않음 |
| `LocalSuperpoweredConfig.xcconfig` 존재 여부 | yes / no |  | Git에 포함하지 않음 |
| iPhone Developer Mode | on / off |  | Settings에서 활성화 |
| Trust This Computer 상태 | trusted / not trusted |  | iPhone 연결 시 확인 |
| 마이크 권한 초기 상태 | not asked / allowed / denied |  | 첫 실행 때 확인 |

## 3. 첫 기기 설치 리허설

10명 대상자에게 설치하기 전에 PM 본인 iPhone 1대로 먼저 리허설한다.

리허설이 통과하기 전에는 10명 설치를 진행하지 않는다.

| 리허설 항목 | 기대 결과 | 결과 | 비고 |
|---|---|---|---|
| 앱 설치 | PM iPhone에 앱이 설치된다. |  |  |
| 앱 이름 확인 | 홈 화면 앱 이름이 `BPM`으로 보인다. |  |  |
| 마이크 권한 허용 | 첫 실행 또는 설정에서 마이크 권한을 허용한다. |  |  |
| 25초 자동 측정 완료 | 기본 측정이 25초 뒤 결과 화면으로 이동한다. |  |  |
| 대표 BPM 후보 표시 | 결과 화면에 정수 BPM 후보가 크게 보인다. |  | no BPM이면 조용한 환경인지 확인 |
| `30S` 측정 | `30S` 버튼으로 30초 측정을 다시 시작할 수 있다. |  |  |
| 중지=취소 | 측정 중 중지는 결과를 만들지 않고 취소로 동작한다. |  |  |
| silence/no BPM 상태 | 조용한 환경에서 BPM 후보가 과하게 표시되지 않는다. |  | false positive 있으면 설치 보류 |
| 설정/debug 진입 | 설정 또는 debug 화면에 진입할 수 있다. |  |  |

리허설에서 crash, signing 문제, 마이크 권한 문제, Superpowered SDK/config 문제, silence false positive가 있으면 10명 설치를 보류하고 원인을 먼저 정리한다.

## 4. 설치 대상자 관리표

Local Beta 대상자는 약 10명으로 제한한다.

| 번호 | 이름 | iPhone 모델 | iOS 버전 | 설치 일시 | 설치 완료 여부 | 재설치 필요 여부 | 마이크 권한 허용 여부 | 첫 실행 성공 여부 | 마지막 실행 확인일 | 설치 문제 유형 | 테스트 장소 | 비고 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |  |  |  |  |  |

설치 문제 유형 예시:

- signing 실패
- Developer Mode 문제
- Trust This Computer 문제
- 마이크 권한 문제
- Superpowered SDK/config 문제
- 앱 crash
- 측정 결과 미표시
- 기타

## 5. 설치 절차

각 iPhone마다 아래 순서로 설치한다.

| 순서 | 작업 | 확인 결과 | 비고 |
|---:|---|---|---|
| 1 | iPhone을 Mac에 연결한다. |  |  |
| 2 | iPhone에서 `Trust This Computer`를 허용한다. |  |  |
| 3 | iPhone Developer Mode가 켜져 있는지 확인한다. |  | 필요 시 iPhone 재시작 |
| 4 | Xcode에서 `native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj`를 연다. |  |  |
| 5 | target device를 연결된 iPhone으로 선택한다. |  |  |
| 6 | Signing Team을 확인한다. |  |  |
| 7 | Run을 실행한다. |  |  |
| 8 | iPhone에 앱이 설치되는지 확인한다. |  |  |
| 9 | 홈 화면 앱 이름이 `BPM`인지 확인한다. |  |  |
| 10 | 첫 실행 시 마이크 권한을 허용한다. |  |  |
| 11 | 25초 측정 테스트를 실행한다. |  |  |
| 12 | `30S` 측정 테스트를 실행한다. |  |  |

## 6. 설치 후 QA

설치가 끝난 뒤 각 기기에서 최소 1회 기본 흐름을 확인한다.

| QA 항목 | 기대 결과 | 결과 | 비고 |
|---|---|---|---|
| 앱 실행 | 앱이 crash 없이 열린다. |  |  |
| 시작 화면 | BPM 시작 화면이 보인다. |  |  |
| 측정 시작 | 측정 버튼을 누르면 분석 화면으로 이동한다. |  |  |
| 25초 자동 완료 | 기본 측정이 25초 뒤 결과 화면으로 이동한다. |  |  |
| 대표 BPM 후보 표시 | 결과 화면에 정수 BPM 후보가 크게 보인다. |  |  |
| `30S` 버튼 | `30S`를 누르면 30초 측정으로 다시 시작한다. |  |  |
| 중지 버튼 | 측정 중 중지는 취소로 동작하고 결과를 만들지 않는다. |  |  |
| 설정/debug 진입 | 설정 또는 debug 화면에 진입할 수 있다. |  | 일반 사용자에게는 필요 시만 안내 |
| silence/no BPM | 조용한 환경에서 BPM 후보가 과하게 표시되지 않는다. |  | false positive 있으면 기록 |

## 7. 사용자 안내

설치 대상자에게 아래 내용을 짧게 안내한다.

- 이 앱은 Local Beta다.
- App Store 또는 TestFlight 배포가 아니다.
- 이 앱은 정식 배포 앱이 아니라 로컬 개발자 설치 앱이다.
- 기기, 계정, signing, provisioning 상태에 따라 재설치가 필요할 수 있다.
- BPM 결과는 정답이 아니라 현재 측정 구간 기준의 BPM 후보다.
- 기본 측정은 25초를 권장한다.
- 후보가 흔들리면 `30S`로 다시 측정한다.
- 전주, 리듬이 약한 구간, 솔로 구간, 소음이 큰 환경에서는 결과가 흔들릴 수 있다.
- 드럼/베이스 리듬이 안정된 구간에서 측정하는 것이 좋다.
- raw audio는 저장하지 않는다.
- raw audio는 서버로 전송하지 않는다.
- 앱 사용 중 이상한 결과가 나오면 곡명, 측정 구간, 시작 시점, 측정 시간을 함께 기록한다.

로컬 개발자 설치 앱은 사용자 기기와 PM 개발 환경 상태에 영향을 받는다. 설치 유지 여부나 재설치 필요 여부는 계정/프로비저닝 상태에 따라 달라질 수 있으므로, 문제가 생기면 설치 일시와 마지막 실행 확인일을 함께 기록한다.

## 8. 실패 시 대응

설치 또는 첫 실행에서 문제가 생기면 아래 순서로 확인한다.

### Xcode signing 실패

확인할 항목:

- Xcode Signing Team이 선택되어 있는가?
- Bundle Identifier가 다른 앱과 충돌하지 않는가?
- iPhone이 선택된 target device인가?
- Apple Developer 계정이 Xcode에 로그인되어 있는가?

대응:

- Xcode `Signing & Capabilities`에서 Team을 다시 선택한다.
- Bundle Identifier 충돌이 있으면 Local Beta용 identifier를 조정한다.
- iPhone을 분리했다가 다시 연결한다.

### Developer Mode 미활성화

확인할 항목:

- iPhone Settings에서 Developer Mode가 켜져 있는가?
- Developer Mode 활성화 후 iPhone을 재시작했는가?

대응:

- iPhone에서 Developer Mode를 켠다.
- 안내에 따라 재시작한다.
- 다시 Xcode Run을 실행한다.

### Trust This Computer 문제

확인할 항목:

- iPhone에서 `Trust This Computer`를 허용했는가?
- Mac에서 iPhone이 정상 인식되는가?

대응:

- 케이블을 다시 연결한다.
- iPhone 잠금을 해제한 상태에서 다시 허용한다.
- Finder 또는 Xcode Devices 창에서 인식 여부를 확인한다.

### 마이크 권한 거부

확인할 항목:

- 앱 첫 실행 시 마이크 권한을 거부했는가?
- iOS Settings에서 BPM 앱의 마이크 권한이 꺼져 있는가?

대응:

- iPhone Settings에서 BPM 앱 마이크 권한을 다시 켠다.
- 앱을 종료 후 재실행한다.

### Superpowered SDK/config 문제

확인할 항목:

- `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`가 로컬에 있는가?
- `native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig`가 로컬에 있는가?
- local config에 license key가 입력되어 있는가?
- SDK와 local config가 Git tracked 대상이 아닌가?

대응:

- `native-ios/BPM-native-field-poc/docs/setup/SUPERPOWERED_LOCAL_SETUP_CHECKLIST.md`를 다시 확인한다.
- local config는 example config를 복사해서 만든다.
- 실제 license key는 문서, Git, 채팅, 로그에 남기지 않는다.

### 앱 실행 crash

확인할 항목:

- Xcode console에 crash 원인이 표시되는가?
- crash가 시작 직후인지, 측정 시작 후인지, 결과 화면 진입 시점인지 구분되는가?
- 특정 iPhone 모델/iOS 버전에서만 발생하는가?

대응:

- crash 시점, iPhone 모델, iOS 버전, Xcode console 요약을 기록한다.
- raw audio나 license key 값은 로그에 남기지 않는다.
- 재현 가능한 경우 별도 Issue로 분리한다.

### 측정 결과 미표시

확인할 항목:

- 마이크 권한이 허용되어 있는가?
- 조용한 환경 또는 입력 부족 상태인가?
- Superpowered SDK status가 ready/running 상태인가?
- 25초 측정이 실제로 완료되었는가?

대응:

- 스피커 볼륨과 iPhone 거리, 주변 소음을 기록한다.
- 드럼/베이스 리듬이 안정된 구간에서 다시 측정한다.
- 후보가 흔들리면 `30S`로 다시 측정한다.
- 계속 표시되지 않으면 설정/debug 화면의 상태를 기록한다.

## 9. 설치 완료 기준

Local Beta 설치 완료는 아래 조건을 모두 만족할 때로 본다.

- iPhone에 `BPM` 앱이 설치되어 있다.
- 앱이 crash 없이 실행된다.
- 마이크 권한이 허용되어 있다.
- 25초 측정이 완료된다.
- 결과 화면에 대표 BPM 후보 또는 no BPM 상태가 표시된다.
- `30S` 재측정이 실행된다.
- raw audio 저장/서버 전송 관련 동작이 없다.

## 10. 다음 단계: 피드백 템플릿

설치가 완료되면 사용자 피드백을 별도 템플릿으로 수집한다.

- 예정 문서: `docs/release/LOCAL_BETA_V0_1_FEEDBACK_TEMPLATE.md`
- 현재 상태: 다음 단계에서 작성 예정

피드백 템플릿에는 최소한 아래 항목을 포함할 예정이다.

- 사용자
- 테스트 장소
- 사용한 음악/장르
- 측정 구간
- 표시된 BPM 후보
- 결과 이해 여부
- 앱 사용 중 막힌 지점
- 재측정 필요 여부
- 개선 요청
