# PRD: BPM native iOS Local Beta v0.1

## 1. 목적

BPM은 iPhone 마이크로 현장 음악이나 외부 스피커 음악을 듣고 BPM 후보를 제안하는 앱이다. Local Beta v0.1의 목적은 완성품 출시가 아니라 실제 사용자 피드백 수집이다.

## 2. 대상 사용자

- 스윙댄스 연습자와 운영자
- 재즈/R&B/뉴올리언스 음악을 자주 다루는 사용자
- 카페, 연습장, 클럽 등 외부 스피커 환경에서 BPM 후보가 필요한 사용자

## 3. 문제

- Tap Tempo는 사용자의 흐름을 끊는다.
- 스트리밍 음악은 파일 분석을 바로 사용할 수 없다.
- 웹 마이크 PoC는 현장 테스트에서 충분히 안정적이지 않았다.
- 현장 소리는 공간, 스피커, 거리, 리듬 구간에 따라 BPM 후보가 흔들릴 수 있다.

## 4. 제품 방향

- iPhone 마이크 기반 현장 BPM 후보 분석을 유지한다.
- 현재 메인 구현은 native iOS Local Beta다.
- Superpowered LiveAnalyzer를 experimental engine으로 사용한다.
- 기존 자체 PoC baseline은 debug/reference로만 유지한다.

## 5. 핵심 사용자 흐름

1. 사용자가 측정을 시작한다.
2. 앱이 25초 기준으로 현재 구간을 듣는다.
3. 대표 BPM 후보를 정수로 표시한다.
4. 후보가 흔들리면 `30S` 재측정을 안내한다.
5. PM/debug 정보는 settings 뒤에서 확인한다.

## 6. 포함 범위

- SwiftUI 기반 Local Beta UI
- iPhone 마이크 입력
- Superpowered LiveAnalyzer 기반 BPM 후보
- 대표 BPM 후보 정수 표시
- debug/settings 화면
- raw audio 저장/서버 전송 금지
- 약 10명 제한 로컬 개발자 설치 beta

## 7. 제외 범위

- App Store 배포
- TestFlight 외부 beta
- Vercel production 배포
- 계정/로그인
- 서버 기반 오디오 분석
- 파일 분석
- 링크 조회
- Tap/BLE/IMU를 메인 입력으로 사용하는 기능
- Superpowered SDK 또는 license key를 repo에 포함

## 8. 성공 기준

- Local Beta 사용자가 대표 BPM 후보를 이해한다.
- silence/no BPM 상황에서 후보를 과장하지 않는다.
- Superpowered SDK와 license key가 repo에 포함되지 않는다.
- raw audio 저장/서버 전송이 없다.
- PM이 iPhone 실기기에서 반복 QA를 진행할 수 있다.
