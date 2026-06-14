# Superpowered BPM Candidate Display Policy

## 1. 문서 목적

이 문서는 Superpowered LiveAnalyzer 결과를 제품에서 단일 정답이 아니라 BPM 후보로 안전하게 표시하기 위한 정책을 정의한다.

Superpowered 결과는 현재 experimental engine 결과이며, 제품 기본 결과로 즉시 전환하지 않는다. 이 정책은 PM QA, 제품 문구, half/double 후보 표시, 안정성 판단 기준을 정리하기 위한 기준 문서다.

## 2. 정책 배경

Superpowered LiveAnalyzer Spike는 Bench lane에서 metronome 90/120/128 BPM 기준 통과 신호를 보였다.

Product reference lane에서도 103~153 BPM 구간은 대체로 실용적인 BPM 후보를 만들었다. 예를 들어 103 BPM, 116 BPM, 119 BPM, 123 BPM, 127 BPM, 136 BPM, 153 BPM 테스트에서는 reference BPM과 가까운 후보가 반복적으로 나왔다.

다만 169/186/201 BPM 같은 빠른 스윙/빅밴드 구간에서는 half-time 후보 또는 후보 흔들림이 확인되었다.

또한 현재 Superpowered integration에서는 confidence 값을 제공하지 않는다. 따라서 제품 화면에서 BPM을 단일 정답처럼 표시하면 안 된다. 사용자가 결과를 안전하게 해석할 수 있도록 후보, 안정성 라벨, 안내 문구를 함께 표시해야 한다.

## 3. 핵심 원칙

- BPM은 정답이 아니라 후보로 표시한다.
- Half 후보, Base 후보, Double 후보를 함께 보여준다.
- 결과가 불안정하면 안정성 라벨과 안내 문구를 함께 표시한다.
- 기존 PoC baseline은 debug/reference로만 유지한다.
- Superpowered 결과를 제품 기본 결과로 즉시 전환하지 않는다.
- high BPM 스윙/빅밴드에서는 half-time 또는 double-time 가능성을 제품 문구로 설명한다.
- confidence 값이 없으므로 반복 측정 안정성을 신뢰도 근거로 사용한다.

## 4. 용어

| 용어 | 의미 |
|---|---|
| 대표 후보 | 사용자에게 가장 먼저 보여주는 BPM 후보. 기본적으로 Base 후보와 같다. |
| Half 후보 | Superpowered BPM의 절반 후보 |
| Base 후보 | Superpowered BPM 원값 |
| Double 후보 | Superpowered BPM의 두 배 후보 |
| 안정성 라벨 | 반복 측정 결과가 얼마나 일관적인지 나타내는 라벨 |
| 안내 문구 | half/double 가능성, 후보 흔들림, 입력 부족 등을 설명하는 문구 |

## 5. 후보 표시 규칙

Superpowered BPM을 `X`라고 할 때 후보는 아래처럼 계산한다.

| 후보 | 계산식 |
|---|---|
| Half 후보 | `X / 2` |
| Base 후보 | `X` |
| Double 후보 | `X * 2` |

대표 후보는 기본적으로 Superpowered가 반환한 Base 후보다. 다만 빠른 스윙/빅밴드 곡에서는 Base 후보가 half-time으로 감지되었을 수 있으므로, Half / Base / Double 후보를 함께 표시한다.

half/double 혼선이 있어도 Base 후보를 임의로 다른 값으로 바꾸지 않는다. 대신 후보 묶음과 안내 문구로 해석을 돕는다.

표시 가능 범위 초안은 `40~260 BPM`이다.

- 표시 범위 안의 후보만 활성 표시한다.
- 표시 범위 밖 후보는 숨기거나 비활성 처리한다.
- 최종 표시 범위는 PM 승인 항목으로 둔다.

### 반올림 기준

제품 표시에서는 우선 소수점 1자리 표시를 기본값으로 제안한다.

예:

| 원값 | 표시 |
|---:|---:|
| 125.04 | 125.0 |
| 103.46 | 103.5 |
| 206.92 | 206.9 |

PM QA 표에서는 필요하면 정수 반올림 값을 함께 기록할 수 있다. 제품 최종 표시 형식은 확장 QA 이후 결정한다.

## 6. 안정성 라벨

Superpowered confidence가 제공되지 않으므로 안정성 라벨은 반복 측정 결과를 기준으로 판단한다.

| 라벨 | 기준 |
|---|---|
| 안정 | 같은 곡 3회 중 2회 이상이 reference BPM 또는 PM 체감 BPM의 ±5 BPM 안에 들어옴 |
| 변동 있음 | 후보는 나오지만 ±5 BPM을 벗어나는 회차가 많거나, 측정마다 후보가 크게 흔들림 |
| 판단 보류 | half/double 혼선, 입력 부족, 후보 불안정, 알려진 BPM 없음, 테스트 환경 불확실 |

### 참고 기준

- ±5 BPM: 성공 후보 판단 기준
- ±10 BPM: 참고 후보 판단 기준
- ±10 BPM 밖: 실패 또는 half/double 가능성 재검토

### known BPM이 없는 경우

known BPM이 없는 곡에서는 정확도 성공 여부를 판단하지 않는다. 대신 같은 곡을 3회 측정했을 때 2회 이상 후보 간 차이가 ±5 BPM 안이면 반복 안정성이 있다고 본다.

이 경우 `안정적인 실용 후보 가능성`으로 분류하되, 실제 정확도는 `판단 보류`로 둔다.

### 입력 부족 처리

아래 경우에는 `판단 보류`를 사용한다.

- Superpowered silence가 `yes`인 경우
- 후보가 표시되지 않는 경우
- 입력 레벨이 너무 낮은 경우
- 주변 소음이나 스피커 상태 때문에 측정 조건이 불확실한 경우

## 7. Half/Double 처리 기준

빠른 스윙/빅밴드에서는 실제 체감 BPM과 엔진이 잡는 BPM이 절반 또는 두 배 관계로 나타날 수 있다.

- 150 BPM 이상에서 후보 흔들림이 있으면 half/double 안내를 검토한다.
- 160 BPM 이상에서는 half-time 가능성을 더 적극적으로 안내한다.
- 200 BPM 이상에서는 Base 후보가 100 BPM대에 머무를 수 있으므로 Double 후보를 함께 보여준다.

알려진 BPM이 201인 곡에서 Base 후보가 103 또는 105로 나온 경우, 이는 half-time으로 감지된 상태일 수 있다. 이때 Double 후보인 206 또는 210이 실제 체감 BPM에 가까울 수 있으므로, 화면에는 Base 후보와 Double 후보를 함께 표시하고 `빠른 스윙/빅밴드 곡에서는 2배 후보가 실제 체감 BPM일 수 있습니다`라는 안내를 제공한다.

예:

| Reference BPM | Superpowered BPM | 표시 해석 |
|---:|---:|---|
| 201 | 103 | Base 후보 103, Double 후보 206 |
| 201 | 105 | Base 후보 105, Double 후보 210 |
| 169 | 112 / 133 / 170 | 변동 있음 또는 판단 보류 |

## 8. 케이스 분류

| 케이스 | 분류 | 설명 |
|---|---|---|
| 123 BPM -> 125 BPM | 성공 후보 | ±5 BPM 안에 있으므로 Product reference lane에서 성공 후보로 본다. |
| 201 BPM -> 103/105 BPM | half-time 후보 | Base 후보가 half-time으로 감지된 상태일 수 있다. Double 후보 206/210이 실제 체감 BPM에 가까울 수 있으므로 함께 표시한다. |
| 169 BPM -> 112/133/170 BPM | 판단 보류 또는 변동 있음 | 맞는 후보가 나오기도 하지만 반복 측정 중 흔들림이 있어 안정성 검증이 필요하다. |

## 9. 제품 문구 초안

화면에는 BPM을 단일 정답처럼 표현하지 않는다.

권장 문구:

- `BPM 후보`
- `정확한 단일 정답이 아니라 현장 입력 기반 후보입니다.`
- `빠른 스윙/빅밴드 곡에서는 2배 후보가 실제 체감 BPM일 수 있습니다.`
- `반복 측정 결과가 흔들려 판단 보류가 필요합니다.`
- `입력 환경에 따라 후보가 달라질 수 있습니다. 같은 구간을 2~3회 반복 측정해 주세요.`

피해야 할 문구:

- `정확한 BPM`
- `정답 BPM`
- `확정 BPM`
- `자동으로 정확히 측정됨`

## 10. PM QA 기준

Product reference lane은 아래 기준으로 기록한다.

- 스윙 재즈 5곡 이상
- R&B / 뉴올리언스 5곡 이상
- 빅밴드 3곡 이상
- 같은 곡 3회 반복 측정
- known BPM 또는 외부 reference BPM 기록
- Superpowered BPM 기록
- Half/Base/Double 후보 기록
- ±5 포함 여부 기록
- ±10 포함 여부 기록
- 안정성 라벨 기록
- PM 판단 기록

### PM 판단 분류

PM이 실제로 판단해야 하는 상위 질문은 `이 곡에서 쓸 수 있는 후보인가?`다. 따라서 `실용 후보`를 상위 판단으로 사용한다.

실용 후보는 다음 중 하나에 해당하는 경우로 분류한다.

1. 성공 후보
   - known BPM 대비 Base 후보가 ±5 BPM 안에 들어오는 경우
2. 설명 가능한 half/double 후보
   - Base 후보는 known BPM과 다르지만, Half 또는 Double 후보가 known BPM ±5 BPM 안에 들어오고, 해당 현상을 half-time 또는 double-time으로 설명할 수 있는 경우
3. 반복 안정 후보
   - known BPM은 없지만 같은 곡 3회 측정 중 2회 이상 후보가 ±5 BPM 안에 반복되는 경우
   - 단, 이 경우 정확도는 판단 보류로 둔다.

| 분류 | 기준 |
|---|---|
| 실용 후보 | 성공 후보, 설명 가능한 half/double 후보, 반복 안정 후보 중 하나에 해당함 |
| 성공 후보 | 3회 중 2회 이상 ±5 BPM 안에 들어옴 |
| 참고 후보 | ±10 BPM 안에 들거나 half/double 후보로 설명 가능 |
| half-time 후보 | Base 후보가 reference의 절반 근처이고 Double 후보가 reference에 가까움 |
| 반복 안정 후보 | known BPM은 없지만 3회 중 2회 이상 후보 간 차이가 ±5 BPM 안에 반복됨. 정확도는 판단 보류로 둔다. |
| 변동 있음 | 후보는 나오지만 반복 측정 안정성이 부족함 |
| 판단 보류 | reference BPM이 없거나 입력 조건이 불확실함 |
| 실패 | 후보 없음 또는 half/double로도 설명이 어려움 |

## 11. 제품 기본 결과 전환 승인 조건

Superpowered 결과를 제품 기본 결과로 전환하려면 아래 조건을 모두 충족해야 한다.

1. Bench lane 통과
2. Product reference set 확장 QA 통과
3. half/double 표시 정책 확정
4. license / commercial use 검토 완료
5. PM 최종 승인

위 조건이 충족되기 전까지 Superpowered 결과는 experimental result 또는 후보 표시 정책 검증용으로만 사용한다.

## 12. 제외 범위

이번 정책 문서는 아래를 포함하지 않는다.

- 새로운 BPM 엔진 도입
- aubio 구현
- Tap / BLE / IMU 구현
- 파일 분석
- 링크 조회
- 서버 분석
- App Store 배포
- 제품 기본 결과 즉시 전환

## 13. 다음 작업 제안

1. `[QA] Superpowered Field Reference Set 확장 검증`
2. `[Product/UX] BPM 후보 UI 문구 및 레이아웃 설계`
3. `[Decision] Superpowered 결과 제품 기본 전환 여부 판단`
