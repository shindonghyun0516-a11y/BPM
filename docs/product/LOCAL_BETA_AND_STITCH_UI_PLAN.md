# Local Beta and Stitch UI Plan

## 배경

Stitch mockup은 Local Beta v0.1 사용자 화면의 디자인 기준이다. SwiftUI 구현은 Stitch 화면을 참고하되, 엔진/분석 로직은 변경하지 않는다.

## UI 방향

- 앱 이름은 BPM
- 전체 문구는 한국어
- 흐름은 측정 시작 → 분석 중 → 결과
- 일반 사용자 화면은 대표 BPM 후보 중심
- debug/reference 정보는 settings 뒤로 숨김

## 사용자 화면

- 시작 화면: 측정 시작
- 측정 화면: 남은 시간, input stability, 취소
- 결과 화면: 대표 BPM 후보, BPM 후보 안내, 다시 측정, `30S`

## debug/settings 화면

- Superpowered Base
- Half / Base / Double
- 기존 PoC baseline
- RMS / Peak / input level
- SDK status
- raw audio 저장/서버 전송 없음 안내

## 금지

- Superpowered 결과를 확정 정답처럼 표시하지 않음
- Library / Stats / Save to Library 구현하지 않음
- 엔진/분석 로직 변경하지 않음
- SDK/license 설정 변경하지 않음
- raw audio 저장/서버 전송하지 않음
