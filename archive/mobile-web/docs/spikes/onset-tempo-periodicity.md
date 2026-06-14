# Onset Envelope + Tempo Periodicity Spike

## 목적

이번 Spike는 기존 V0 BPM 분석을 바로 교체하기 위한 작업이 아니다. 기존 V0 결과와
experimental analyzer 결과를 나란히 비교해, 스윙 재즈/R&B/뉴올리언스/빅밴드 음원에서
onset envelope + tempo periodicity 방식이 제품 방향으로 의미가 있는지 판단한다.

## 성공 기준

### 필수 통과

- Metronome 90 BPM에서 experimental 후보가 90 +/- 5 BPM 안에 들어온다.
- Metronome 120 BPM에서 experimental 후보가 120 +/- 5 BPM 안에 들어온다.
- Metronome 128 BPM에서 experimental 후보가 128 +/- 5 BPM 안에 들어온다.
- 무음 또는 입력 부족 상태에서 BPM 후보를 표시하지 않는다.
- 기존 V0 기본 사용자 화면을 깨지 않는다.
- 오디오 저장 또는 서버 전송이 없다.
- build, lint, test, privacy check, bpm-ui-check가 통과한다.

### 타깃 장르 개선

스윙/R&B/뉴올리언스/빅밴드 테스트셋 최소 10곡 중 5곡 이상에서 기존 V0보다 개선되어야
한다.

개선으로 보는 경우:

- 실제 또는 체감 BPM에 더 가까운 후보를 제공한다.
- 기존 V0는 실패했지만 experimental analyzer는 참고 후보를 제공한다.
- 132 BPM 근처로 반복되는 쏠림이 줄어든다.
- half-time 또는 double-time 후보가 더 합리적으로 표시된다.

## 테스트 결과 기록표

| 그룹 | 곡/소스 | 알려진 BPM 또는 체감 BPM | 기존 V0 결과 | 실험 분석 결과 | 가장 강한 후보 | 다른 후보 | 132 쏠림 여부 | 무음 후보 표시 여부 | 판단 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Synthetic | 60 BPM | 60 |  |  |  |  |  |  |  |  |
| Synthetic | 90 BPM | 90 |  |  |  |  |  |  |  |  |
| Synthetic | 120 BPM | 120 |  |  |  |  |  |  |  |  |
| Synthetic | 128 BPM | 128 |  |  |  |  |  |  |  |  |
| Synthetic | 140 BPM | 140 |  |  |  |  |  |  |  |  |
| Metronome | 90 BPM | 90 |  |  |  |  |  |  |  |  |
| Metronome | 120 BPM | 120 |  |  |  |  |  |  |  |  |
| Metronome | 128 BPM | 128 |  |  |  |  |  |  |  |  |
| Real music | Swing jazz |  |  |  |  |  |  |  |  |  |
| Real music | R&B / New Orleans |  |  |  |  |  |  |  |  |  |
| Real music | Big band |  |  |  |  |  |  |  |  |  |
| Real music | Piano solo / rubato |  |  |  |  |  |  |  |  |  |
| Negative | Silence | 없음 |  |  |  |  |  |  |  |  |
| Negative | Low volume |  |  |  |  |  |  |  |  |  |

## PM 판단 라벨

- 개선: 기존 V0보다 실제/체감 BPM에 가까워졌거나, 기존 실패 케이스에서 참고 후보를 제공한다.
- 동일: 기존 V0와 큰 차이가 없다.
- 악화: 기존 V0보다 후보가 더 멀어졌거나, 정규 비트 결과가 나빠졌다.
- 판단 불가: 입력 부족, 테스트 환경 문제, 후보 부족으로 비교가 어렵다.

## Go / Pivot / Stop

- Go: metronome 90/120/128 필수 통과, 무음 false positive 0건, 타깃 장르 10곡 중 5곡 이상 개선.
- Pivot: metronome은 통과하지만 타깃 장르 10곡 중 개선이 5곡 미만이면 자동 + Tap 보정 하이브리드를 검토한다.
- Stop 또는 별도 기술 Spike: metronome 90/120/128 중 하나라도 안정적으로 통과하지 못하면 자체 분석 방향 중단 또는 Essentia.js Spike를 검토한다.

## 범위 제한

- 새 오디오 분석 라이브러리를 추가하지 않는다.
- Essentia.js는 이번 Issue에서 도입하지 않는다.
- 탭 보정 기능을 구현하지 않는다.
- Vercel 설정을 변경하지 않는다.
- 오디오를 저장하거나 서버로 전송하지 않는다.
- 기존 V0 analyzer를 바로 대체하지 않는다.
