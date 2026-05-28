import { readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const testOutputDir = path.join(process.cwd(), ".tmp", "test-dist");
const testOutputFilesDir = path.join(testOutputDir, "tests");
const tscBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

await rm(testOutputDir, { recursive: true, force: true });

await run(tscBin, ["-p", "tsconfig.test.json"]);

const testFiles = (await readdir(testOutputFilesDir))
  .filter((fileName) => fileName.endsWith(".test.js"))
  .map((fileName) => path.join(testOutputFilesDir, fileName));

await run("node", ["--test", ...testFiles]);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}
