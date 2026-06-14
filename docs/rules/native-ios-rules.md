# Native iOS Rules

## 경로

- native project: `native-ios/BPM-native-field-poc`
- Xcode project: `native-ios/BPM-native-field-poc/ios/BPMNativeFieldPOC.xcodeproj`
- scheme: `BPMNativeFieldPOC`

## 작업 원칙

- SwiftUI UI 수정과 audio engine 수정은 분리한다.
- Superpowered bridge 수정은 별도 Issue로 다룬다.
- Xcode signing 변경은 PM 승인 없이 하지 않는다.
- App Store/TestFlight 설정은 현재 범위가 아니다.

## 실기기 기준

- 마이크 QA는 실제 iPhone에서 진행한다.
- 시뮬레이터는 UI 확인용으로만 사용한다.
- iPhone Developer Mode와 signing team을 확인한다.

## 금지

- `ios/Vendor/Superpowered/` 커밋 금지
- `LocalSuperpoweredConfig.xcconfig` 커밋 금지
- `.xcuserdata`, `DerivedData`, `build/` 커밋 금지
