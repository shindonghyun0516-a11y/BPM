# MVP Scope: Local Beta v0.1

## 포함 범위

- native iOS 앱
- iPhone 마이크 기반 현장 음악 BPM 후보 분석
- 25초 기본 측정
- `30S` 재측정
- 대표 BPM 후보 정수 표시
- 한국어 사용자 화면
- settings/debug 화면
- Half / Base / Double debug 표시
- Superpowered LiveAnalyzer experimental engine
- 기존 PoC baseline debug/reference 유지
- 약 10명 제한 로컬 개발자 설치 beta

## 제외 범위

- App Store 배포
- TestFlight 외부 beta
- Vercel production 배포
- Library 저장 기능
- Stats 기능
- 계정/로그인
- 서버 분석
- raw audio 저장
- raw audio 서버 전송
- 파일 분석
- 링크 조회
- Tap/BLE/IMU 메인 입력
- Superpowered SDK/license key repo 포함

## 차단 조건

- license key가 tracked file에 포함됨
- Superpowered SDK가 tracked 대상이 됨
- `LocalSuperpoweredConfig.xcconfig`가 tracked 대상이 됨
- raw audio 파일이 repo에 포함됨
- raw audio 저장/서버 전송 코드가 추가됨
- BPM 후보를 확정 정답처럼 표시함
