# Superpowered Rules

## SDK 관리

- Superpowered SDK는 repo에 포함하지 않는다.
- SDK는 PM 로컬에 직접 설치한다.
- local path: `native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/`

## License key 관리

- license key는 repo에 커밋하지 않는다.
- license key는 문서, 코드, README, PR 본문, 로그에 출력하지 않는다.
- local config만 사용한다.
- local config path: `native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig`
- example config에는 placeholder만 둔다.

## 제품 상태

- Superpowered LiveAnalyzer는 현재 Local Beta experimental engine이다.
- 상용 출시, App Store 배포, 유료 license 결정은 별도 PM 승인 전까지 하지 않는다.

## 금지

- SDK binary/header commit 금지
- license key 노출 금지
- SDK 설치 자동화 임의 추가 금지
- Superpowered 결과를 확정 정답처럼 표시 금지
