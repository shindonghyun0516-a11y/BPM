# QA-2 iPhone onset envelope 및 input stability graph 결과

## 1. 테스트 목적

QA-2의 목적은 PoC-2에서 추가한 onset envelope와 input stability graph가 iPhone 실기기에서 해석 가능한지 확인하는 것이다.

PoC-2는 BPM 계산 단계가 아니다. 이번 QA에서는 마이크 입력의 에너지 변화, smoothed envelope, local peak 후보, graph sample count가 현장 입력 판단에 쓸 수 있는지 확인한다.

## 2. 테스트 결과 요약

PM 실기기 확인 결과, PoC-2 입력 상태와 그래프는 다음 단계로 넘어가기에 충분한 것으로 판단했다.

확인된 내용:

- iPhone에서 앱 실행 가능
- 측정 시작 가능
- 마이크 입력 상태가 `적정` 범위로 표시됨
- RMS / Peak 입력이 충분히 들어오는 것으로 판단
- input stability graph와 debug 값이 PoC-2 목적에 맞게 확인됨
- raw audio 저장/서버 전송 없음
- BPM 계산, tempo candidate, half/double 후보 없음

## 3. PM 판단

PM 판단:

- PoC-2 통과
- onset envelope와 input stability graph 구현 방향 승인
- PoC-3로 넘어가기 위한 입력 변화 관찰 단계는 충분히 통과한 것으로 판단

다음 단계에서는 BPM 계산으로 바로 확정값을 만들기보다, PoC-3에서 tempo candidate와 half/double 후보가 실제로 의미 있게 나오는지 별도로 검증해야 한다.

## 4. 남은 리스크

PoC-2 통과 후에도 아래 리스크는 남아 있다.

- 아직 BPM 후보 계산은 검증하지 않음
- tempo candidate는 아직 없음
- half/double 후보는 아직 없음
- local peak가 실제 박자 후보로 충분한지는 PoC-3에서 확인해야 함
- 현장 소음, 잔향, 사람 소리 환경은 별도 QA가 필요함
- local peak threshold와 smoothing 기준은 PoC-3 또는 현장 QA에서 조정될 수 있음

## 5. Privacy 확인

PoC-2는 raw audio를 저장하지 않는다.

PoC-2는 raw audio를 서버로 전송하지 않는다.

PoC-2는 raw audio buffer가 아니라 아래 숫자형 debug 값만 유지한다.

- RMS
- Peak
- energy delta
- smoothed envelope
- local peak count
- graph sample count

## 6. 다음 단계

다음 Issue 후보:

`[PoC-3] iOS tempo candidate 및 half/double 후보 표시`

PoC-3에서는 PoC-2에서 확인한 onset envelope와 local peak 후보를 바탕으로 tempo candidate를 검증한다.
