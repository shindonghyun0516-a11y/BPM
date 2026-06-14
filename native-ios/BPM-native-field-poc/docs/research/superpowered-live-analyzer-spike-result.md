# Superpowered LiveAnalyzer Spike Result

## 1. Spike 목적

PoC-4 자체 periodicity 알고리즘은 metronome 90/120/128 QA에서 BPM 후보를 안정적으로 만들지 못했다.

이 Spike의 목적은 검증된 BPM/beat tracking 엔진 후보인 Superpowered LiveAnalyzer가 iPhone 마이크 기반 현장 BPM 후보 분석에 적합한지 확인하는 것이다.

이번 단계는 제품 기본 결과 전환이 아니다. Superpowered는 experimental engine으로만 비교하며, 기존 PoC baseline은 삭제하지 않는다.

## 2. 구현 방식

- 기존 `AVAudioEngine` input tap을 유지했다.
- 기존 PoC baseline debug와 candidate 결과를 유지했다.
- Superpowered bridge / adapter를 추가했다.
- iPhone mono mic input을 Superpowered가 요구하는 32-bit interleaved stereo float로 변환했다.
- Superpowered LiveAnalyzer 결과는 experimental panel에서만 표시한다.
- Superpowered 결과는 기본 제품 결과를 대체하지 않는다.
- raw audio는 파일로 저장하지 않는다.
- raw audio는 서버로 전송하지 않는다.
- raw sample은 debug 화면이나 로그에 출력하지 않는다.
- Superpowered SDK binary/header와 local license config는 Git에 포함하지 않는다.

## 3. 테스트 요약

### 기존 PoC baseline

- 대부분의 실제 테스트에서 기존 PoC baseline은 `입력 부족` 또는 후보 실패 상태였다.
- 같은 iPhone 마이크 입력에서 Superpowered는 대부분 BPM 후보를 산출했다.
- 따라서 이번 QA는 자체 PoC baseline 대비 Superpowered가 명확히 개선되었는지를 보는 비교 검증으로 판단한다.

### Bench lane

- metronome 90 BPM: 통과
- metronome 120 BPM: 통과
- metronome 128 BPM: 통과

PM 반복 테스트 결과, metronome 90/120/128은 동일한 BPM 근처로 반복 측정되었다.

### Product reference lane

103~153 BPM 구간의 스윙 재즈, R&B/Soul, 블루스 테스트곡은 대체로 실용 후보를 제공했다.

169/186/201 BPM 구간에서는 half-time 또는 후보 흔들림이 확인되었다. 이 구간은 엔진 실패라기보다 제품 표시 정책이 필요한 영역으로 본다.

## 4. 잘 된 케이스

| Reference BPM | Superpowered BPM | 판단 |
|---:|---:|---|
| 103 | 103.5 / 104.5 | 성공 후보 |
| 116 | 117.2 / 114.5 | 성공 후보 |
| 119 | 119.1 / 118.8 | 성공 후보 |
| 123 | 125.0 | 성공 후보 |
| 127 | 127.1 / 125 | 성공 후보 |
| 136 | 133 / 136.4 | 성공 후보 |
| 153 | 153.8 / 152.9 | 성공 후보 |

위 결과는 대부분 ±5 BPM 안에 들어온다. 123 BPM 음원이 125 BPM으로 표시된 것도 Product reference lane에서는 성공 후보로 본다.

## 5. 문제 케이스

| Reference BPM | 관찰 결과 | 판단 |
|---:|---|---|
| 169 | 166.7 / 170으로 맞는 순간이 있으나 중간에 112 / 133 등으로 흔들림 | 보류 |
| 186 | 187 / 180 후보가 있으나 90대 / 120대 후보로 흔들림 | 보류 |
| 201 | 103 / 105 근처로 표시됨 | half-time 후보 가능성 |

high BPM 스윙/빅밴드 구간에서는 half-time, double-time, backbeat, 브라스/피아노 어택, 드럼 강세 때문에 표시 후보가 흔들릴 수 있다.

이 문제는 Superpowered 자체를 버릴 이유라기보다, 제품에서 후보를 어떻게 보여줄지 정해야 하는 표시 정책 문제로 본다.

## 6. PM 판단

- Superpowered Spike는 Bench lane 기준으로 통과한다.
- Product reference lane은 부분 통과 이상으로 본다.
- 기존 자체 PoC보다 명확히 개선되었다.
- Superpowered는 iPhone 마이크 기반 현장 BPM 분석의 experimental engine 후보로 유효하다.
- 하지만 아직 제품 기본 결과로 전환하지 않는다.
- 다음 과제는 후보 표시 정책과 half/double 안정성 처리다.

## 7. 남은 리스크

- Superpowered LiveAnalyzer는 현재 integration에서 confidence 값을 제공하지 않는다.
- 신뢰도는 반복 측정 안정성으로 판단해야 한다.
- high BPM 스윙/빅밴드에서 half-time 후보가 나올 수 있다.
- black-box 엔진이라 reason 설명에는 한계가 있다.
- 현장 환경에서는 스피커 품질, 거리, 잔향, 주변 소음, 마이크 위치에 영향을 받을 수 있다.
- Superpowered license / commercial use / App Store 배포 조건은 대고객 출시 전에 별도 검토가 필요하다.

## 8. 다음 Issue 제안

1. `[Product/UX] Superpowered BPM 후보 표시 정책 및 half/double 안정성 처리`
2. `[QA] Superpowered Field Reference Set 확장 검증`

## 9. 현재 금지 사항

- Superpowered 결과를 제품 기본 결과로 즉시 전환하지 않는다.
- Tap, BLE, IMU를 메인 입력으로 추가하지 않는다.
- 파일 분석, 링크 조회, 서버 분석을 메인 방향으로 바꾸지 않는다.
- raw audio를 저장하지 않는다.
- raw audio를 서버로 전송하지 않는다.
- raw sample을 debug 화면이나 로그에 출력하지 않는다.

