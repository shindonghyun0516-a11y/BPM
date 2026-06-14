# Local Beta Release Strategy

## 목적

Local Beta v0.1은 공개 출시가 아니라 실제 사용자 피드백 수집을 위한 제한 beta다.

## 대상

- 약 10명
- PM이 직접 관리하는 테스트 사용자
- iPhone 실기기 사용자

## 설치 방식

- PM Mac의 Xcode에서 직접 iPhone에 설치
- App Store 배포 없음
- TestFlight 외부 beta 없음
- Vercel 배포 없음

## 설치 전 준비

- Xcode 설치
- Apple Developer signing team 확인
- iPhone Developer Mode 확인
- Superpowered SDK local setup 확인
- `LocalSuperpoweredConfig.xcconfig` local-only 확인

## 설치 QA

- 앱 실행
- 마이크 권한 요청
- 25초 측정
- `30S` 재측정
- 대표 BPM 후보 표시
- settings/debug 진입
- raw audio 저장/전송 없음 확인

## 피드백 수집 기준

- BPM 후보가 이해되는가?
- 측정 시간이 부담스럽지 않은가?
- 리듬 구간에 따라 결과가 달라지는 것을 이해하는가?
- 다시 측정 안내가 충분한가?
- 현장 스피커 환경에서 사용할 의지가 있는가?

## 다음 판단

- Local Beta 유지
- UI 문구 개선
- QA set 확장
- 제품 기본 결과 정책 조정
- App Store/TestFlight 검토는 별도 승인 후 진행
