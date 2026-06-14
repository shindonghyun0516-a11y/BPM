# Privacy Rules

## 절대 원칙

- raw audio 저장 금지
- raw audio 서버 전송 금지
- raw sample debug 출력 금지
- license key 출력 금지
- SDK key 화면 표시 금지

## 허용되는 debug 값

- BPM 후보
- RMS / Peak
- input level
- buffer duration 같은 숫자형 요약
- SDK status
- failure reason

## 금지되는 파일

- `.wav`
- `.m4a`
- `.mp3`
- `.caf`
- `.aiff`
- `.flac`
- raw recording 파일

## 검증

```bash
scripts/harness/native-ios-check.sh --scan-only
```

FAIL이 나오면 커밋/PR을 보류한다.
