#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const targetRoot = process.cwd();

const targets = {
  kiro: {
    label: "Kiro",
    source: path.join(packageRoot, ".kiro", "skills", "parallel-wave-executor"),
    target: path.join(targetRoot, ".kiro", "skills", "parallel-wave-executor"),
  },
  openspec: {
    label: "Codex OpenSpec",
    source: path.join(packageRoot, ".codex", "skills", "openspec-parallel-apply"),
    target: path.join(targetRoot, ".codex", "skills", "openspec-parallel-apply"),
  },
  opencode: {
    label: "OpenCode OpenSpec",
    source: path.join(packageRoot, ".opencode", "skills", "openspec-parallel-apply"),
    target: path.join(targetRoot, ".opencode", "skills", "openspec-parallel-apply"),
  },
  speckit: {
    label: "Codex Spec Kit",
    source: path.join(packageRoot, ".codex", "skills", "speckit-parallel-implement"),
    target: path.join(targetRoot, ".codex", "skills", "speckit-parallel-implement"),
  },
};

const aliases = {
  "spec-kit": "speckit",
  spec: "speckit",
  "opencode-openspec": "opencode",
  codex: "codex",
};

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

function usage() {
  console.log(`Usage: npx github:chibipaper/sdd-parallel-wave-executor [--target <target>]

Targets:
  kiro       Install .kiro/skills/parallel-wave-executor (default)
  openspec   Install .codex/skills/openspec-parallel-apply
  opencode   Install .opencode/skills/openspec-parallel-apply
  speckit    Install .codex/skills/speckit-parallel-implement
  codex      Install both Codex skills: openspec and speckit
  all        Install kiro, Codex OpenSpec, OpenCode OpenSpec, and Spec Kit

Examples:
  npx github:chibipaper/sdd-parallel-wave-executor --target opencode
  npx github:chibipaper/sdd-parallel-wave-executor --target openspec
  npx github:chibipaper/sdd-parallel-wave-executor --target speckit
  npx github:chibipaper/sdd-parallel-wave-executor --target codex`);
}

function parseTarget(argv) {
  let value = "kiro";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }

    if (arg === "--target" || arg === "-t") {
      value = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--target=")) {
      value = arg.slice("--target=".length);
      continue;
    }

    if (!arg.startsWith("-")) {
      value = arg;
    }
  }

  if (!value) {
    fail("Missing target value.");
  }

  const normalized = aliases[value] || value;

  if (normalized === "all") {
    return Object.keys(targets);
  }

  if (normalized === "codex") {
    return ["openspec", "speckit"];
  }

  if (!targets[normalized]) {
    fail(`Unknown target "${value}". Run with --help to see valid targets.`);
  }

  return [normalized];
}

function installTarget(key) {
  const entry = targets[key];

  if (!fs.existsSync(entry.source)) {
    fail(`Skill source not found: ${entry.source}`);
  }

  if (!fs.existsSync(path.join(entry.source, "SKILL.md"))) {
    fail(`SKILL.md not found in skill source: ${entry.source}`);
  }

  if (samePath(entry.source, entry.target)) {
    console.log(`${entry.label} skill is already available at ${entry.target}`);
    return;
  }

  fs.mkdirSync(path.dirname(entry.target), { recursive: true });
  fs.rmSync(entry.target, { recursive: true, force: true });
  fs.cpSync(entry.source, entry.target, { recursive: true });

  console.log(`Installed ${entry.label} skill to ${entry.target}`);
}

const selectedTargets = parseTarget(process.argv.slice(2));

for (const selectedTarget of selectedTargets) {
  installTarget(selectedTarget);
}

console.log("Restart or reload your Kiro/Codex/OpenCode session if the skill list does not update immediately.");
