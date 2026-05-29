# Essentia.js BPM Spike

## 목적

이번 Spike는 기존 V0 analyzer를 교체하는 작업이 아니다.

목적은 Essentia.js가 스윙 재즈, R&B, 뉴올리언스, 빅밴드 음원에서 기존 V0보다 더 실용적인 BPM 후보를 제공할 수 있는지 확인하는 것이다.

## 구현 원칙

- 기존 V0 analyzer는 유지한다.
- Essentia.js analyzer는 `?debug=1` 실험 패널에서만 사용한다.
- 기본 사용자 화면에는 Essentia.js 결과를 반영하지 않는다.
- 오디오는 메모리 buffer로만 다룬다.
- 오디오를 저장하지 않는다.
- 오디오를 서버로 전송하지 않는다.
- `MediaRecorder`, `Blob`, `FormData` 기반 오디오 전송은 사용하지 않는다.
- Spike 결과가 좋아도 이 Issue에서 기존 V0 결과를 대체하지 않는다.

## 사전 확인

| 항목 | 확인 결과 |
| --- | --- |
| npm package | `essentia.js` |
| version | `0.1.3` |
| license | `AGPL-3.0` |
| unpacked size | 약 10.1 MB |
| WASM | `essentia-wasm.*` 파일을 포함한 WebAssembly 기반 |

브라우저 실행에서는 `essentia-wasm.web.js`를 client-only dynamic import로 불러오고, WASM binary는 `public/essentia-wasm.web.wasm` 정적 파일로 제공한다.

## 라이선스 리스크

Essentia.js는 `AGPL-3.0` 라이선스다.

이번 Spike에서는 실험 목적으로 사용할 수 있지만, 정식 제품에 도입하기 전에는 법적 검토가 필요하다. 상용화 또는 비공개 서비스 형태로 운영할 경우 별도 상업 라이선스 검토가 필요할 수 있다.

## 모바일웹 리스크

- iOS Safari에서 WASM 로딩이 실패할 수 있다.
- Android Chrome에서도 초기 로딩 시간이 길 수 있다.
- 모바일 마이크 sample rate는 48 kHz일 수 있지만, Essentia rhythm 계열 알고리즘은 44.1 kHz 기준을 전제로 할 수 있다.
- 이번 Spike에서는 44.1 kHz로 선형 resampling한 뒤 분석한다.
- 처리 시간이 길면 PM 검수에서 No-Go 후보로 기록한다.

## PM Preview 확인 항목

`?debug=1` URL에서 아래 항목을 확인한다.

| 항목 | 확인 내용 |
| --- | --- |
| 기존 V0 결과 | 기존 analyzer가 만든 결과 또는 실패 사유 |
| Essentia.js 실험 결과 | Essentia.js가 만든 BPM 후보 |
| 가장 강한 후보 | Essentia.js의 대표 BPM 후보 |
| 다른 후보 | half-time / double-time 참고 후보 |
| confidence | 결과를 얼마나 믿을 수 있는지 |
| processing time | 분석에 걸린 시간 |
| WASM load time | WebAssembly 로딩 시간 |
| 132 쏠림 여부 | 후보가 130-134 BPM에 반복적으로 몰리는지 |
| 무음에서 후보 표시 여부 | 무음인데 BPM이 표시되는지 |
| 판단 | 개선 / 동일 / 악화 / 판단 불가 |

## 테스트셋

### 1. Synthetic 또는 controlled test

| BPM | 기대 결과 |
| --- | --- |
| 60 | 후보 생성 여부 확인 |
| 90 | 90 ± 5 BPM |
| 120 | 120 ± 5 BPM |
| 128 | 128 ± 5 BPM |
| 140 | 후보 생성 여부 확인 |

### 2. Metronome test

| BPM | 기대 결과 |
| --- | --- |
| 90 | 90 ± 5 BPM |
| 120 | 120 ± 5 BPM |
| 128 | 128 ± 5 BPM |

### 3. Real music target set

최소 10곡을 기록한다.

| 그룹 | 기대 결과 |
| --- | --- |
| 스윙 재즈 | 기존 V0 대비 개선 여부 확인 |
| R&B | 기존 V0 대비 개선 여부 확인 |
| 뉴올리언스 | 기존 V0 대비 개선 여부 확인 |
| 빅밴드 | 기존 V0 대비 개선 여부 확인 |
| 피아노 솔로/루바토 | 무조건 성공을 요구하지 않음 |

### 4. Negative test

| 조건 | 기대 결과 |
| --- | --- |
| 무음 | BPM 후보 미표시 |
| 입력 부족 | BPM 후보 미표시 |
| 작은 볼륨 | 판단 불가 또는 실패 reason 표시 |
| 주변 소음 | 잘못된 후보 표시 여부 확인 |

## Go / Pivot / No-Go 기준

### Go

- metronome 90/120/128 BPM이 각각 ±5 BPM 범위에 들어온다.
- 타깃 장르 10곡 중 최소 5곡 이상에서 기존 V0보다 개선된다.
- 무음 또는 입력 부족 상태에서 BPM 후보를 표시하지 않는다.
- 모바일 Safari 또는 Android Chrome에서 로딩과 분석이 가능하다.
- 오디오 저장/서버 전송이 없다.

### Pivot

- metronome은 통과하지만 타깃 장르 10곡 중 개선이 5곡 미만이면 자동 + Tap 보정 하이브리드 또는 서버 분석 대안을 검토한다.

### No-Go

- metronome 90/120/128 중 하나라도 안정적으로 통과하지 못한다.
- iPhone Safari에서 WASM 로딩 또는 실행이 어렵다.
- 라이선스 리스크가 정식 제품에 부적합하다.
- 번들 크기나 처리 시간이 모바일웹 MVP에 과도하다.
