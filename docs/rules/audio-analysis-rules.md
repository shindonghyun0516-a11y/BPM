# Audio Analysis Rules

## 제품 방향

- 메인 입력은 iPhone 마이크다.
- 현장 스피커/라이브 음악을 듣고 BPM 후보를 만든다.
- 파일 분석, 링크 조회, 서버 분석은 현재 범위가 아니다.

## 결과 표시

- BPM은 정답이 아니라 후보다.
- 일반 사용자 화면에는 대표 BPM 후보만 표시한다.
- PM/debug 화면에서만 Half / Base / Double을 표시한다.
- 측정 구간에 따라 후보가 달라질 수 있음을 안내한다.

## Superpowered

- Superpowered LiveAnalyzer는 현재 experimental engine이다.
- confidence가 제공되지 않는 경우 반복 안정성과 QA 기록으로 판단한다.
- high BPM 곡에서 half-time/double-time 해석 가능성을 debug에서 확인한다.

## 금지

- 자체 알고리즘 튜닝을 큰 범위로 임의 재개하지 않는다.
- 새 BPM 엔진 도입은 별도 Issue와 PM 승인 후 진행한다.
- Tap/BLE/IMU를 메인 입력으로 추가하지 않는다.
