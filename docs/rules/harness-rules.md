# Harness Rules

## 기본 명령

```bash
scripts/harness/native-ios-check.sh --scan-only
```

## 검사 항목

- native project path 확인
- Superpowered SDK tracked 여부
- `LocalSuperpoweredConfig.xcconfig` tracked 여부
- license key pattern scan
- raw audio file tracked 여부
- raw audio 저장 코드 검색
- 서버 전송/network upload 코드 검색
- Xcode user/build artifact tracked 여부
- README safety check

## 출력 등급

- PASS: 문제 없음
- FAIL: 커밋/PR 차단
- WARN: 확인 필요
- SKIP: 현재 모드에서 실행하지 않음

## GitHub Actions

- CI에서는 `--scan-only`를 기본으로 한다.
- SDK/config가 없는 GitHub Actions에서 xcodebuild를 요구하지 않는다.
- Local full mode는 PM 로컬 Mac에서만 실행한다.
