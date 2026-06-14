# QA-1 iPhone 실기기 마이크 입력 debug 결과

## 1. 테스트 목적

QA-1의 목적은 iPhone 네이티브 앱에서 마이크 입력이 정상적으로 들어오는지 확인하는 것이다.

이번 검수에서는 BPM 계산을 확인하지 않는다. PoC-1의 범위는 마이크 입력 상태와 숫자형 debug 값이 실제 기기에서 표시되는지 확인하는 것이다.

확인 대상:

- iPhone에서 앱이 실행되는가
- 마이크 권한 요청이 정상적으로 표시되는가
- 측정 시작 후 마이크 입력이 들어오는가
- RMS, Peak, sample rate, buffer size가 표시되는가
- 조용한 환경과 소리 있는 환경에서 입력값 차이를 볼 수 있는가
- 측정 중지 후 마이크 입력이 중지되는가
- PoC-2로 넘어갈 수 있는지 판단할 수 있는가

## 2. 테스트 결과 요약

테스트 환경:

- 기기: iPhone 17
- iOS 버전: 26.2
- 테스트 장소: 집, Mac mini 스피커 환경
- 앱 실행 여부: 성공
- 마이크 권한 허용 여부: 허용 완료

확인 결과:

- 앱 실행 성공
- 마이크 권한 요청 성공
- Engine running 값이 `yes`로 표시됨
- Sample rate `48000 Hz` 확인
- Requested buffer size `1024 frames` 확인
- Actual frame length `4800 frames` 확인
- Channel count `1` 확인
- RMS `0.01~0.07` 범위 확인
- Peak `0.1~0.3` 범위 확인
- 입력이 너무 작거나 끊긴 상태는 아닌 것으로 판단
- Peak 값 기준 과입력 또는 클리핑 상태는 아닌 것으로 판단
- 측정 중지 버튼 동작 정상
- 측정 중지 후 iOS 마이크 표시 꺼짐 확인

PoC-1 기준으로 마이크 입력은 정상적으로 들어온다고 판단한다.

## 3. PM 판단

PM 판단:

- PoC-1 통과
- iPhone 네이티브 마이크 입력 debug는 유효하게 동작함
- RMS `0.01~0.07`, Peak `0.1~0.3` 수준이면 현장 입력이 충분히 들어오는 것으로 판단
- 과입력 또는 클리핑 상태는 아닌 것으로 판단
- PoC-2 진행 가능

다음 검증 대상은 RMS와 Peak 자체가 아니다.

PoC-2에서는 아래 항목을 확인해야 한다.

- 반복되는 에너지 변화가 보이는가
- 음악의 박자나 어택이 onset envelope로 드러나는가
- 조용한 환경과 음악 환경의 입력 안정성이 구분되는가
- 현장 소음이나 잔향이 input stability에 어떤 영향을 주는가

## 4. 남은 리스크

PoC-1은 마이크 입력 검증 단계이므로 아래 항목은 아직 검증하지 않았다.

- BPM 계산은 아직 검증하지 않음
- onset 후보는 아직 검증하지 않음
- tempo candidate는 아직 검증하지 않음
- half/double 후보는 아직 검증하지 않음
- 현장 소음, 잔향, 사람 소리의 영향은 아직 검증하지 않음
- 재즈클럽, 카페, 연습장 같은 실제 현장 환경은 아직 검증하지 않음
- 실제 BPM 후보가 안정적으로 나오는지는 아직 판단할 수 없음

Actual frame length가 `4800 frames`로 표시된 것은 PoC-1 단계에서는 실패로 보지 않는다. iOS가 실제 오디오 입력 환경에 맞춰 buffer 길이를 다르게 제공할 수 있으므로, 이후 PoC에서는 requested buffer size보다 actual frame length를 기준으로 처리해야 한다.

## 5. Privacy 확인

PoC-1에서는 raw audio를 저장하지 않는다.

PoC-1에서는 raw audio를 서버로 전송하지 않는다.

이번 QA 문서에는 오디오 원본이 아니라 숫자형 debug 값만 기록한다.

기록한 값:

- RMS
- Peak
- sample rate
- requested buffer size
- actual frame length
- channel count
- engine running 상태

## 6. 다음 단계

다음 Issue 후보:

`[PoC-2] iOS onset envelope 및 input stability graph`

PoC-2의 목적은 BPM 계산이 아니다. PoC-2에서는 마이크 입력에서 반복되는 에너지 변화와 onset envelope를 볼 수 있는지 확인한다.

PoC-2에서 아직 구현하지 않을 것:

- BPM 후보 계산
- tempo candidate
- half/double 후보
- 신뢰도 계산
- raw audio 저장
- raw audio 서버 전송
