# Testing Rules

## 필수 테스트

- `scripts/harness/native-ios-check.sh --scan-only`
- iPhone 실기기 측정 QA
- silence/no BPM 테스트
- metronome sanity check
- reference track QA

## Local Beta QA

- 마이크 권한 요청 확인
- 25초 기본 측정 확인
- `30S` 재측정 확인
- 중지/취소 동작 확인
- 결과 화면 확인
- settings/debug 화면 확인

## 기록 항목

- 테스트 날짜
- iPhone 모델 / iOS 버전
- 장소
- 스피커 종류
- 거리
- 볼륨
- 측정 구간
- 측정 시간
- Superpowered BPM
- PM 판단

## 자동 차단

- harness FAIL
- 민감정보 포함
- SDK tracked
- raw audio 파일 포함
- raw audio 저장/서버 전송 코드 발견
