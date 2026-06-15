# Superpowered Setup

이 문서는 Superpowered LiveAnalyzer Spike를 위한 로컬 전용 setup 방법을 설명합니다.

현재 커밋된 앱은 Superpowered SDK가 설치되지 않은 환경에서도 build가 가능해야 합니다. SDK가 로컬에 설정되기 전에는 experimental panel에 `Superpowered SDK not configured` 상태가 표시됩니다.

## 기본 규칙

- Superpowered SDK binary 또는 header를 커밋하지 않습니다.
- 실제 license key를 커밋하지 않습니다.
- license key를 log에 출력하지 않습니다.
- license key를 화면에 표시하지 않습니다.
- raw audio를 저장하지 않습니다.
- raw audio를 서버로 전송하지 않습니다.
- raw audio sample을 debug output에 출력하지 않습니다.
- 별도 PM 결정 없이 이 Spike를 App Store, TestFlight 외부 배포, 대고객 출시로 진행하지 않습니다.

## 로컬 SDK 위치

통합 repo 기준 SDK는 아래 경로에 로컬로만 배치합니다.

```text
native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/
```

native iOS 프로젝트 내부 상대 경로는 아래와 같습니다.

```text
ios/Vendor/Superpowered/
```

이 경로는 Git 추적에서 제외됩니다.

## Local config

example config를 복사합니다.

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.example.xcconfig
```

아래 local config 파일을 만듭니다.

```text
native-ios/BPM-native-field-poc/ios/Config/LocalSuperpoweredConfig.xcconfig
```

그 다음 local config 파일만 수정합니다.

```text
SUPERPOWERED_ENABLED = YES
SUPERPOWERED_LICENSE_KEY = your-local-evaluation-key
SUPERPOWERED_SDK_ROOT = $(SRCROOT)/Vendor/Superpowered
```

`LocalSuperpoweredConfig.xcconfig`는 Git 추적에서 제외됩니다.

## 현재 stub 상태

커밋된 Spike는 stub analyzer로 시작합니다.

- SDK status: `not configured`
- Superpowered BPM: `-`
- Superpowered silence: `-`
- Failure reason: `Superpowered SDK not configured`

이 stub은 의도된 구조입니다. SDK가 설치되지 않은 Mac에서도 기존 native microphone PoC가 build 실패로 깨지지 않도록 보호합니다.

## 다음 통합 단계

stub build가 통과한 뒤 다음 구현 단계는 Superpowered LiveAnalyzer를 감싸는 Objective-C++ bridge입니다.

예상 bridge 파일:

```text
SuperpoweredLiveAnalyzerBridge.h
SuperpoweredLiveAnalyzerBridge.mm
```

bridge는 기존 `AVAudioEngine` input tap을 유지해야 합니다. 첫 Spike 단계에서 input pipeline을 `SuperpoweredIOSAudioIO`로 교체하지 않습니다.
