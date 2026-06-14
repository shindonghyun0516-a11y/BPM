#!/usr/bin/env bash
set -u

SCRIPT_NAME="native-ios-check"
NATIVE_PROJECT_PATH="native-ios/BPM-native-field-poc"
IOS_PROJECT_PATH="$NATIVE_PROJECT_PATH/ios/BPMNativeFieldPOC.xcodeproj"
SCHEME="BPMNativeFieldPOC"
INFO_PLIST="$NATIVE_PROJECT_PATH/ios/BPMNativeFieldPOC/Info.plist"
PBXPROJ="$IOS_PROJECT_PATH/project.pbxproj"
LOCAL_CONFIG="$NATIVE_PROJECT_PATH/ios/Config/LocalSuperpoweredConfig.xcconfig"
SDK_ROOT="$NATIVE_PROJECT_PATH/ios/Vendor/Superpowered"
SDK_XCFRAMEWORK="$SDK_ROOT/libSuperpoweredAudio.xcframework"
SCAN_ONLY=0

FAILURES=()
WARNINGS=()
SKIPS=()
PASSES=()

usage() {
  cat <<'USAGE'
Usage: scripts/harness/native-ios-check.sh [--scan-only]

Modes:
  default      Local Full Mode. Requires local Superpowered SDK/config and runs xcodebuild.
  --scan-only  CI-safe scan mode. Skips xcodebuild and only runs safety/privacy checks.
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --scan-only)
      SCAN_ONLY=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[FAIL] Unknown argument: $arg"
      usage
      exit 1
      ;;
  esac
done

pass() {
  echo "[PASS] $1"
  PASSES+=("$1")
}

warn() {
  echo "[WARN] $1"
  WARNINGS+=("$1")
}

fail() {
  echo "[FAIL] $1"
  FAILURES+=("$1")
}

skip() {
  echo "[SKIP] $1"
  SKIPS+=("$1")
}

tracked_files() {
  git ls-files
}

tracked_matches() {
  local pattern="$1"
  tracked_files | grep -E "$pattern" || true
}

require_path() {
  local label="$1"
  local path="$2"
  if [ -e "$path" ]; then
    pass "$label exists: $path"
  else
    fail "$label is missing: $path | action: confirm the native iOS project was copied into the integration repo"
  fi
}

check_no_tracked_match() {
  local label="$1"
  local pattern="$2"
  local action="$3"
  local matches
  matches="$(tracked_matches "$pattern")"
  if [ -n "$matches" ]; then
    fail "$label is tracked | action: $action"
    printf '%s\n' "$matches" | sed 's/^/  - /'
  else
    pass "$label is not tracked"
  fi
}

echo "Native iOS harness-check"
echo "Mode: $([ "$SCAN_ONLY" -eq 1 ] && echo "scan-only" || echo "local-full")"
echo

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  fail "Not inside a Git repository | action: run from /Users/donghyun/Documents/BPM"
else
  cd "$REPO_ROOT" || exit 1
  pass "repo root: $REPO_ROOT"
fi

require_path "native project path" "$NATIVE_PROJECT_PATH"
require_path "iOS project" "$IOS_PROJECT_PATH"
require_path "Info.plist" "$INFO_PLIST"
require_path "project.pbxproj" "$PBXPROJ"

echo
echo "Tracked file safety checks"

check_no_tracked_match \
  "Superpowered SDK folder" \
  '(^|/)ios/Vendor/Superpowered(/|$)|^native-ios/BPM-native-field-poc/ios/Vendor/Superpowered(/|$)' \
  "remove the SDK from Git and keep it local-only"

check_no_tracked_match \
  "LocalSuperpoweredConfig.xcconfig" \
  '(^|/)LocalSuperpoweredConfig\.xcconfig$' \
  "run git rm --cached on the local config and keep only the example config tracked"

check_no_tracked_match \
  "Superpowered binary/header files" \
  '(^|/)ios/Vendor/Superpowered/.*(\.xcframework($|/)|\.framework($|/)|\.a$|\.dylib$|\.h$)|^native-ios/BPM-native-field-poc/ios/Vendor/Superpowered/.*(\.xcframework($|/)|\.framework($|/)|\.a$|\.dylib$|\.h$)' \
  "remove Superpowered SDK binary/header files from Git; app bridge source files are allowed"

check_no_tracked_match \
  "raw audio files" \
  '\.(wav|m4a|mp3|caf|aiff|flac)$' \
  "remove raw audio/recording files from Git"

check_no_tracked_match \
  "Xcode local/build artifacts" \
  '(^|/)\.DS_Store$|(^|/)xcuserdata(/|$)|\.xcuserstate$|(^|/)DerivedData(/|$)|(^|/)build(/|$)' \
  "remove local Xcode/build artifacts from Git"

echo
echo "License key scan"

LICENSE_SCAN_RESULT=""
while IFS= read -r file; do
  [ -f "$file" ] || continue
  case "$file" in
    *.png|*.jpg|*.jpeg|*.gif|*.pdf|*.xcassets/*|*.webp|*.ico)
      continue
      ;;
  esac

  while IFS=: read -r line_number line_text; do
    [ -n "$line_number" ] || continue
    value="$(printf '%s' "$line_text" | sed -E 's/^[^=]*=[[:space:]]*//; s/[[:space:]]*$//')"
    case "$value" in
      ""|"<local-evaluation-key>"|"your-local-evaluation-key")
        continue
        ;;
    esac
    LICENSE_SCAN_RESULT="${LICENSE_SCAN_RESULT}${file}:${line_number}"$'\n'
  done < <(grep -nE '^[[:space:]]*SUPERPOWERED_LICENSE_KEY[[:space:]]*=' "$file" 2>/dev/null || true)
done < <(tracked_files)

if [ -n "$LICENSE_SCAN_RESULT" ]; then
  fail "Potential Superpowered license key found in tracked files | action: move the key to ignored LocalSuperpoweredConfig.xcconfig"
  printf '%s' "$LICENSE_SCAN_RESULT" | sed '/^$/d; s/^/  - /'
else
  pass "No real Superpowered license key assignment found in tracked files"
fi

echo
echo "Source privacy scans"

SOURCE_FILES="$(find "$NATIVE_PROJECT_PATH/ios" \
  -type f \( -name '*.swift' -o -name '*.m' -o -name '*.mm' -o -name '*.h' -o -name '*.plist' -o -name 'project.pbxproj' \) \
  -not -path '*/Vendor/Superpowered/*' \
  -not -path '*/xcuserdata/*' 2>/dev/null || true)"

scan_source() {
  local label="$1"
  local pattern="$2"
  local action="$3"
  local matches=""

  if [ -n "$SOURCE_FILES" ]; then
    matches="$(printf '%s\n' "$SOURCE_FILES" | xargs grep -nE "$pattern" 2>/dev/null || true)"
  fi

  if [ -n "$matches" ]; then
    fail "$label found | action: $action"
    printf '%s\n' "$matches" | sed 's/^/  - /'
  else
    pass "$label not found"
  fi
}

scan_source \
  "AVAudioRecorder usage" \
  'AVAudioRecorder' \
  "remove recorder-based raw audio persistence from the app"

scan_source \
  "raw audio file write indicators" \
  'write\(to:|FileManager|\.wav|\.m4a|\.caf|\.aiff|\.flac|audio[[:space:]_-]*(export|save)|export.*audio|save.*audio|recording.*save' \
  "review and remove raw audio file storage paths"

scan_source \
  "network upload indicators" \
  'URLSession|upload(Task)?|httpBody|multipart|audio[[:space:]_-]*upload' \
  "review and remove audio/network upload paths unless explicitly approved"

echo
echo "README safety check"

README="README.md"
if [ ! -f "$README" ]; then
  fail "README.md is missing | action: add portfolio/local beta README"
else
  readme_fail=0
  check_readme_text() {
    local label="$1"
    local pattern="$2"
    if grep -Eiq "$pattern" "$README"; then
      pass "README mentions $label"
    else
      warn "README may be missing: $label | action: document this before GitHub push"
      readme_fail=1
    fi
  }

  check_readme_text "Local Beta / PoC status" 'Local Beta|PoC|portfolio'
  check_readme_text "Superpowered SDK not included" 'Superpowered SDK.*(not|included|repo|local)|repo.*Superpowered SDK'
  check_readme_text "license key local config" 'license key|LocalSuperpoweredConfig'
  check_readme_text "no raw audio storage" 'raw audio.*(not|no|never|저장 없음|저장하지)'
  check_readme_text "no raw audio server upload" 'raw audio.*(server|upload|전송)|server upload|서버 전송'
  check_readme_text "local SDK setup required" 'local SDK|SDK setup|ios/Vendor/Superpowered'
fi

echo
echo "Build check"

if [ "$SCAN_ONLY" -eq 1 ]; then
  skip "xcodebuild skipped in --scan-only mode"
else
  if [ ! -d "$SDK_ROOT" ]; then
    fail "Superpowered SDK folder missing: $SDK_ROOT | action: place the SDK locally before Local Full Mode"
  elif [ ! -d "$SDK_XCFRAMEWORK" ]; then
    fail "Superpowered xcframework missing: $SDK_XCFRAMEWORK | action: verify local SDK folder contents"
  else
    pass "local Superpowered SDK folder is present"
  fi

  if [ ! -f "$LOCAL_CONFIG" ]; then
    fail "Local Superpowered config missing: $LOCAL_CONFIG | action: copy LocalSuperpoweredConfig.example.xcconfig and add the local key"
  else
    pass "local Superpowered config is present"
  fi

  if [ "${#FAILURES[@]}" -eq 0 ]; then
    if xcodebuild \
      -project "$IOS_PROJECT_PATH" \
      -scheme "$SCHEME" \
      -destination 'generic/platform=iOS' \
      build \
      CODE_SIGNING_ALLOWED=NO; then
      pass "xcodebuild succeeded"
    else
      fail "xcodebuild failed | action: open Xcode and verify SDK path, local config, and scheme"
    fi
  else
    skip "xcodebuild skipped because earlier FAIL checks must be fixed first"
  fi
fi

echo
echo "Summary"
echo "PASS/WARN/SKIP/FAIL counts:"
echo "  PASS: ${#PASSES[@]}"
echo "  WARN: ${#WARNINGS[@]}"
echo "  SKIP: ${#SKIPS[@]}"
echo "  FAIL: ${#FAILURES[@]}"

if [ "${#WARNINGS[@]}" -gt 0 ]; then
  echo
  echo "Warnings:"
  for item in "${WARNINGS[@]}"; do
    echo "  - $item"
  done
fi

if [ "${#SKIPS[@]}" -gt 0 ]; then
  echo
  echo "Skipped:"
  for item in "${SKIPS[@]}"; do
    echo "  - $item"
  done
fi

if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo
  echo "Failed checks:"
  for item in "${FAILURES[@]}"; do
    echo "  - $item"
  done
  echo
  echo "Result: FAIL"
  exit 1
fi

echo
echo "Result: PASS"
