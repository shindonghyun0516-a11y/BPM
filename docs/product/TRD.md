# TRD: BPM Automatic Measurement

## 1. 기술 방향 요약

초기 MVP는 모바일웹으로 만든다. 사용자의 마이크 입력은 브라우저 안에서만 분석한다. 오디오는 저장하지 않고 서버로 보내지 않는다.

이후 모바일앱으로 확장할 수 있도록 오디오 처리, BPM 계산, UI를 분리해서 설계한다.

## 2. 권장 기술 스택

- Frontend: Next.js
- Language: TypeScript
- UI: React
- Audio: Web Audio API
- Test: unit test, browser test, harness script
- Deploy: GitHub Actions 기반 자동 배포
- Initial hosting for mobile web MVP: Vercel
- Alternative hosting if using simple React/Vite static app: Cloudflare Pages

PM 관점에서 Next.js는 모바일웹을 빠르게 만들고 배포하기 위한 웹 앱 기술이다. TypeScript는 실수를 줄이기 위해 데이터 모양을 명확하게 정하는 도구다. Vercel은 Next.js 모바일웹 MVP를 빠르게 배포하고 확인하기 쉬운 플랫폼이다.

초기 배포 플랫폼은 Vercel로 결정한다. GitHub main 브랜치 병합 후 Vercel production 배포를 목표로 하며, PR 단계에서는 Vercel preview 배포를 확인할 수 있게 한다.

결정 이유:

- 모바일웹 MVP를 빠르게 배포하기 쉽다.
- GitHub와 연결해 PR별 preview 확인이 쉽다.
- Next.js를 사용할 경우 배포 구조가 단순하다.
- 혼자 하는 프로젝트에서 설정 부담이 적다.

배포 전에는 `harness-check.yml`이 통과해야 한다.

단, Cloudflare Pages는 기본 배포 플랫폼이 아니라 대안으로만 문서에 기록한다. 프로젝트를 단순 React/Vite 정적 앱으로 만들 경우에만 Cloudflare Pages를 검토한다.

## 3. 큰 구조

```text
UI
-> 마이크 권한 요청
-> 오디오 입력 분석
-> BPM 후보 계산
-> 신뢰도 계산
-> 결과 표시
-> 재측정 또는 탭 보정
```

## 4. 주요 모듈

### audio-permission

마이크 권한을 요청하고, 거부되었을 때 안내한다.

### audio-capture

마이크 입력을 받는다. 측정 완료, 취소, 오류 발생 시 마이크를 끈다.

### audio-analysis

오디오에서 박자 후보를 찾기 위한 분석 데이터를 만든다. PM 관점에서는 "소리의 세기 변화에서 반복되는 박자 흔적을 찾는 단계"라고 이해하면 된다.

### bpm-estimator

분석 데이터에서 BPM 후보를 계산한다. 기본 범위는 10~500이다. 결과는 하나의 정답이 아니라 여러 후보와 신뢰도로 표현한다.

### confidence

결과가 얼마나 안정적인지 계산한다.

### tap-correction

사용자가 직접 탭해서 결과를 보정할 수 있게 한다.

### result-ui

BPM 후보, 신뢰도, 안정성 상태, 다음 행동을 보여준다.

## 5. 기본 상태 모델

```ts
type MeasurementState =
  | 'idle'
  | 'requesting_permission'
  | 'measuring'
  | 'analyzing'
  | 'completed'
  | 'unstable'
  | 'permission_denied'
  | 'unsupported'
  | 'error';
```

쉬운 말로 설명하면, 앱은 지금 아무것도 안 하는지, 권한을 요청 중인지, 측정 중인지, 분석 중인지, 결과가 나왔는지, 실패했는지를 명확히 구분해야 한다.

## 6. 결과 데이터 초안

```ts
type BpmCandidate = {
  bpm: number;
  confidence: number;
  label?: 'recommended' | 'candidate';
};

type BpmResult = {
  candidates: BpmCandidate[];
  stability: 'high' | 'medium' | 'low';
  durationSeconds: number;
  minBpm: number;
  maxBpm: number;
  source: 'auto' | 'tap';
  message?: string;
};
```

결과는 숫자 하나가 아니라 후보 목록과 신뢰도를 포함해야 한다.

## 7. 측정 정책

- 기본 측정 시간: 15초
- 기본 BPM 범위: 10~500
- 후보 BPM은 신뢰도와 함께 표시
- 절반/두 배 후보를 별도 정책으로 강제하지 않음
- 낮은 신뢰도는 unstable 상태로 처리

## 8. MVP BPM 분석 접근

초기 버전은 복잡한 음악 인식이 아니라 "15초 안에서 반복되는 박자 후보를 찾는 것"에 집중한다.

MVP 분석 흐름:

1. 마이크 입력의 크기 변화를 읽는다.
2. 음악에서 박자가 강하게 나타나는 지점을 찾는다.
3. 지점 사이의 반복 간격을 계산한다.
4. 반복 간격을 BPM 후보로 바꾼다.
5. 후보가 얼마나 일정한지 보고 신뢰도를 계산한다.
6. 결과가 불안정하면 확정값처럼 보여주지 않고 다시 측정 또는 탭 보정을 안내한다.

MVP에서 하지 않는 것:

- 음악 제목 인식
- 장르 분석
- 악기 분리
- 서버 기반 오디오 분석
- 오디오 파일 저장 후 분석
- 사용자의 녹음 데이터를 서버로 보내는 분석

## 9. 신뢰도 판단 기준

신뢰도는 "이 BPM 후보를 얼마나 믿어도 되는가"를 사용자가 이해할 수 있게 보여주는 값이다.

초기 기준:

- 박자 후보가 15초 동안 일정하게 반복되는가
- 가장 강한 후보와 다른 후보의 차이가 충분한가
- 입력 소리가 너무 작지 않은가
- 주변 소음 때문에 박자 후보가 흔들리지 않는가
- 분석 가능한 박자 지점이 충분히 있는가

## 10. 개인정보 설계

초기 MVP에서는 다음을 금지한다.

- raw audio 파일 저장
- raw audio 서버 전송
- 브라우저 밖으로 raw audio 전송
- 사용자의 녹음 데이터 영구 저장
- 사용자가 모르는 백그라운드 마이크 유지

허용되는 것은 브라우저 메모리 안에서의 임시 분석뿐이다.

쉽게 말하면, 앱은 음악을 "듣고 계산만" 해야 하며 녹음 파일을 남기거나 서버로 보내면 안 된다.

## 11. 모바일웹 제약

- 마이크는 HTTPS 또는 localhost에서만 정상 동작한다.
- iOS Safari는 사용자의 버튼 클릭 이후에 오디오 처리가 시작되어야 할 수 있다.
- 백그라운드로 앱이 이동하면 측정이 중단될 수 있다.
- 권한 거부 후에는 브라우저 설정 안내가 필요할 수 있다.

## 12. 모바일앱 확장 방향

초기에는 모바일웹으로 만들지만, 다음 구조를 유지하면 모바일앱으로 확장하기 쉽다.

- BPM 계산 로직을 UI와 분리
- 오디오 입력 부분을 별도 모듈로 분리
- 결과 데이터 구조를 웹/앱에서 공통으로 사용
- 개인정보 정책을 플랫폼과 무관하게 유지

## 13. 초기 검증 방법

- 15초 측정이 되는지 확인
- BPM 결과가 10~500 범위 안에 있는지 확인
- 신뢰도 없는 결과가 표시되지 않는지 확인
- 불안정 결과에 안내가 나오는지 확인
- 측정 후 마이크가 꺼지는지 확인
- 오디오가 저장되거나 서버로 전송되지 않는지 확인
- 권한 거부 시 대체 안내가 나오는지 확인
- 조용한 환경, 소음 환경, 입력이 작은 환경에서 상태가 적절히 나뉘는지 확인
- 80, 120, 160 BPM 같은 기준 샘플로 후보와 신뢰도 동작을 확인
