import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "src/app/page.tsx");
const typesPath = path.join(root, "src/types/app.ts");
const analysisPath = path.join(root, "src/lib/bpm-analysis.ts");

const [pageSource, typesSource, analysisSource] = await Promise.all([
  readFile(pagePath, "utf8"),
  readFile(typesPath, "utf8"),
  readFile(analysisPath, "utf8")
]);

const combinedSource = [pageSource, typesSource, analysisSource].join("\n");
const failures = [];

const requiredTestIds = [
  {
    testId: "bpm-result-section",
    message: 'Missing BPM result section: data-testid="bpm-result-section"'
  },
  {
    testId: "recommended-bpm",
    message: 'Missing recommended BPM UI: data-testid="recommended-bpm"'
  },
  {
    testId: "bpm-candidates",
    message: 'Missing BPM candidates UI: data-testid="bpm-candidates"'
  },
  {
    testId: "bpm-confidence",
    message: 'Missing BPM confidence UI: data-testid="bpm-confidence"'
  },
  {
    testId: "remeasure-button",
    message: 'Missing remeasure button: data-testid="remeasure-button"'
  },
  {
    testId: "unstable-result-message",
    message: 'Missing unstable result message: data-testid="unstable-result-message"'
  },
  {
    testId: "permission-denied-message",
    message: 'Missing permission denied message: data-testid="permission-denied-message"'
  },
  {
    testId: "tap-calibration-coming-soon",
    message:
      'Missing tap calibration coming soon notice: data-testid="tap-calibration-coming-soon"'
  },
  {
    testId: "bpm-result-disclaimer",
    message: 'Missing result disclaimer: data-testid="bpm-result-disclaimer"'
  }
];

for (const requirement of requiredTestIds) {
  if (!hasTestId(pageSource, requirement.testId)) {
    failures.push(requirement.message);
  }
}

const requiredTexts = [
  {
    label: "recommended BPM label",
    pattern: /추천 BPM/,
    message: "Missing recommended BPM label: 추천 BPM"
  },
  {
    label: "BPM candidates label",
    pattern: /후보 BPM/,
    message: "Missing BPM candidates label: 후보 BPM"
  },
  {
    label: "confidence label",
    pattern: /신뢰도/,
    message: "Missing confidence label: 신뢰도"
  },
  {
    label: "unstable result guidance",
    pattern: /측정이 불안정합니다\.\s*다시 측정해 주세요\./,
    message: "Missing unstable result guidance: 측정이 불안정합니다. 다시 측정해 주세요."
  },
  {
    label: "tap calibration coming soon",
    pattern: /탭 보정 기능은 다음 버전에서 제공 예정입니다\.|탭 보정은 다음 버전에서 제공됩니다\./,
    message: "Missing tap calibration coming soon notice"
  }
];

for (const requirement of requiredTexts) {
  if (!requirement.pattern.test(pageSource)) {
    failures.push(requirement.message);
  }
}

for (const confidenceLabel of ["낮음", "보통", "높음"]) {
  if (!combinedSource.includes(confidenceLabel)) {
    failures.push(`Missing confidence label: ${confidenceLabel}`);
  }
}

if (!/V0 임시 추정값/.test(pageSource)) {
  failures.push("Missing result disclaimer: V0 임시 추정값 안내");
}

if (!/단일 정답/.test(pageSource)) {
  failures.push("Missing result disclaimer: 단일 정답이 아니라는 안내");
}

if (!/후보 BPM/.test(pageSource) || !/신뢰도/.test(pageSource)) {
  failures.push("Missing result disclaimer: 후보 BPM과 신뢰도를 함께 확인하는 안내");
}

const forbiddenPhrases = [
  "탭으로 측정하기",
  "탭 측정 시작",
  "탭해서 BPM 측정",
  "탭으로 BPM 계산"
];

for (const phrase of forbiddenPhrases) {
  if (pageSource.includes(phrase)) {
    failures.push(`Forbidden tap measurement CTA found: ${phrase}`);
  }
}

if (failures.length > 0) {
  console.error("BPM UI check failed. Review required BPM result UI safeguards:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  "BPM UI check passed. Required BPM result, confidence, remeasure, unstable, and permission-denied safeguards are present."
);

function hasTestId(source, testId) {
  return new RegExp(`data-testid=["']${escapeRegExp(testId)}["']`).test(source);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
