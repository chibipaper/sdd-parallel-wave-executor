#!/usr/bin/env node

const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const installScript = path.join(repoRoot, "bin", "install.cjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sdd-pwe-opencode-"));

try {
  const result = spawnSync(process.execPath, [installScript, "--target", "opencode"], {
    cwd: tempRoot,
    encoding: "utf-8",
  });

  assert.strictEqual(
    result.status,
    0,
    `installer exited with ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const installedSkill = path.join(
    tempRoot,
    ".opencode",
    "skills",
    "openspec-parallel-apply",
    "SKILL.md",
  );

  assert.ok(fs.existsSync(installedSkill), `expected ${installedSkill} to exist`);

  const content = fs.readFileSync(installedSkill, "utf-8");
  assert.match(content, /^name: openspec-parallel-apply$/m);
  assert.match(content, /OpenCode/i);
  assert.match(content, /openspec instructions apply/);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("OpenCode installer smoke test passed.");
