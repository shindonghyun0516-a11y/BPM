# Mobile UI Rules

## 사용자 화면

- 앱 이름은 BPM이다.
- 언어는 한국어다.
- 일반 사용자 화면은 단순해야 한다.
- 대표 BPM 후보를 크게 보여준다.
- BPM은 정수로 표시한다.
- 결과는 "BPM 후보"로 표현한다.

## 숨길 정보

아래 정보는 일반 사용자 화면에 노출하지 않는다.

- Half / Base / Double
- Superpowered raw result
- 기존 PoC baseline
- interval debug
- SDK internals

이 정보는 settings/debug 화면에서만 확인한다.

## 문구 원칙

- 확정값처럼 보이는 표현을 피한다.
- 후보가 흔들리면 다시 측정을 안내한다.
- 측정 구간 기준 결과임을 설명한다.
