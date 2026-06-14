import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src", "app", "pages", "components", "lib"];
const codeExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "out"
]);

const blockingChecks = [
  {
    id: "audio-file-upload",
    description: "Audio file upload UI or handler",
    matches(line) {
      return (
        /accept\s*=\s*["'`][^"'`]*audio\//i.test(line) ||
        /upload(?:Audio|Recording)|(?:audio|recording)Upload/i.test(line)
      );
    }
  },
  {
    id: "microphone-server-transfer",
    description: "Microphone or audio data sent through a network API",
    matches(line) {
      const networkApi = /\b(fetch|sendBeacon|XMLHttpRequest|WebSocket|axios)\b/i;
      const audioData = /\b(audio|microphone|mic|mediaStream|stream|blob|recording|pcm|waveform)\b/i;
      return networkApi.test(line) && audioData.test(line);
    }
  },
  {
    id: "recording-upload-api",
    description: "Obvious recording upload API endpoint",
    matches(line) {
      return /\/api\/(?:audio|recording|recordings|microphone|mic|upload)|upload[-_/]?(?:audio|recording)/i.test(
        line
      );
    }
  },
  {
    id: "formdata-audio-upload",
    description: "Audio-like data appended to FormData",
    matches(line) {
      return (
        /\bFormData\b|\.append\s*\(/i.test(line) &&
        /\b(audio|microphone|mic|blob|recording|pcm|waveform)\b/i.test(line)
      );
    }
  },
  {
    id: "recording-file-save",
    description: "Recording or audio-like data saved to a file or browser storage",
    matches(line) {
      const storageApi =
        /\b(saveAs|showSaveFilePicker|createWritable|writeFile|writeFileSync)\b/i;
      const browserStorage =
        /\b(localStorage|sessionStorage|indexedDB)\b.*\b(audio|microphone|mic|blob|recording|pcm|waveform|wav|mp3|m4a|webm)\b/i;
      const downloadAttribute =
        /\.download\s*=.*\b(audio|recording|recorded|wav|mp3|m4a|webm)\b/i;
      const audioData =
        /\b(audio|microphone|mic|blob|recording|pcm|waveform|wav|mp3|m4a|webm)\b/i;

      return (
        (storageApi.test(line) && audioData.test(line)) ||
        browserStorage.test(line) ||
        downloadAttribute.test(line)
      );
    }
  }
];

const warningChecks = [
  {
    id: "recording-api-review",
    description: "Recording or object URL API requires PM/privacy review if audio data is persisted",
    matches(line) {
      return /\b(MediaRecorder|URL\.createObjectURL)\b/i.test(line);
    }
  }
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await collectFiles(absolutePath)));
      }
      continue;
    }

    if (entry.isFile() && codeExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(root, filePath);
}

const filesToScan = [];

for (const scanRoot of scanRoots) {
  const absoluteScanRoot = path.join(root, scanRoot);

  if (existsSync(absoluteScanRoot)) {
    filesToScan.push(...(await collectFiles(absoluteScanRoot)));
  }
}

const findings = [];
const warnings = [];

for (const filePath of filesToScan) {
  const content = await readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const check of blockingChecks) {
      if (check.matches(line)) {
        findings.push({
          check: check.id,
          description: check.description,
          file: relative(filePath),
          line: index + 1,
          content: line.trim()
        });
      }
    }

    for (const check of warningChecks) {
      if (check.matches(line)) {
        warnings.push({
          check: check.id,
          description: check.description,
          file: relative(filePath),
          line: index + 1,
          content: line.trim()
        });
      }
    }
  });
}

if (findings.length > 0) {
  console.error(
    "Privacy check failed. Review possible audio upload, microphone transfer, or recording file storage code:"
  );

  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.check}] ${finding.description}`
    );
    console.error(`  ${finding.content}`);
  }

  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("Privacy check warnings. These patterns do not fail Issue #3 but need PM review:");

  for (const warning of warnings) {
    console.warn(
      `- ${warning.file}:${warning.line} [${warning.check}] ${warning.description}`
    );
    console.warn(`  ${warning.content}`);
  }
}

console.log(
  `Privacy check passed. Scanned ${filesToScan.length} code file(s); no obvious audio upload, microphone-to-server transfer, or recording file storage patterns found.`
);
