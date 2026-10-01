# Parallel Executor Skills

Parallel execution skills for OpenSpec, OpenCode, Codex, Kiro, and Spec Kit.

This fork adds an **OpenCode-native, store-aware OpenSpec parallel apply skill** while preserving the original Codex and Kiro targets.

## Quick Start — OpenCode + OpenSpec

### 1. Install

From the root of the project where you want to run OpenSpec apply:

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target opencode
```

This installs:

```text
.opencode/skills/openspec-parallel-apply/SKILL.md
```

Restart or reload OpenCode if the skill list does not refresh immediately.

### 2. Run an OpenSpec change

In OpenCode:

```text
Use openspec-parallel-apply for <change-name>.
```

Example:

```text
Use openspec-parallel-apply for add-dark-mode.
```

The skill resolves the OpenSpec change, builds a dependency graph, groups safe independent work into waves, shows you the execution plan, then uses isolated git worktrees for parallel implementation.

### 3. Run from a registered OpenSpec store

If the change lives in a registered OpenSpec store:

```text
Use openspec-parallel-apply for <change-name> from store <store-id>.
```

Example:

```text
Use openspec-parallel-apply for add-dark-mode from store team-context.
```

The selected store stays attached to the OpenSpec CLI workflow while the implementation repository can remain separate.

### 4. Update

Run the same install command again:

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target opencode
```

The installer replaces the existing OpenCode skill directory with the latest version.

### 5. Uninstall

macOS / Linux / Git Bash:

```bash
rm -rf .opencode/skills/openspec-parallel-apply
```

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .opencode\skills\openspec-parallel-apply
```

Uninstalling only removes the installed OpenCode skill. It does **not** delete OpenSpec changes, implementation files, worktrees from previous runs, or git history.

## What the OpenCode Skill Does

The OpenCode skill:

1. resolves the selected OpenSpec change and optional store through the OpenSpec CLI;
2. reads OpenSpec's apply instructions and resolved context;
3. builds a conservative dependency graph from tasks, shared contracts, file overlap, and explicit ordering;
4. groups independent work into ordered waves;
5. shows the execution plan before creating branches or worktrees;
6. runs independent groups through OpenCode subagents/tasks in isolated git worktrees;
7. integrates and validates each wave before starting dependent work;
8. runs final repository validation;
9. leaves the final implementation as local reviewable changes.

It does **not** assume top-level task headings are sequential. Actual dependencies, shared contracts, and file ownership determine whether work can safely run concurrently.

## OpenSpec CLI Integration

The OpenCode skill uses OpenSpec as the source of truth rather than assuming a fixed `openspec/changes/{change}` layout.

Typical commands include:

```bash
openspec store list --json
openspec status --change "<change>" --json [--store <id>]
openspec instructions apply --change "<change>" --json [--store <id>]
```

The returned OpenSpec context drives execution, including the resolved change root, schema, context files, task state, apply instructions, and referenced stores.

This lets the skill support repo-local changes, registered stores, and custom OpenSpec schemas without hard-coding artifact paths.

## Store-Aware Behavior

A registered OpenSpec store may live outside the implementation repository. The skill keeps those locations separate:

```text
OpenSpec store / change root
          │
          │ requirements + tasks + apply context
          ▼
 parallel apply coordinator
          │
          ▼
 implementation git repository
```

The coordinator resolves OpenSpec state once and passes bounded context to each worker. Parallel workers do not independently rediscover OpenSpec state.

## Wave Execution Model

Dependent waves are created **just in time** from the current validated integration HEAD:

```text
OpenSpec resolve
      │
      ▼
dependency graph
      │
      ▼
Wave 1
 ├─ worker A
 └─ worker B
      │
      ▼
merge + validate
      │
      ▼
current HEAD
      │
      ▼
create Wave 2 worktrees
      │
      ▼
Wave 2
 ├─ worker C
 └─ worker D
      │
      ▼
merge + validate
```

This ensures dependent workers see the implementation produced by earlier waves.

## Other Installation Targets

| Target | Installed path |
| --- | --- |
| `opencode` | `.opencode/skills/openspec-parallel-apply/SKILL.md` |
| `openspec` | `.codex/skills/openspec-parallel-apply/SKILL.md` |
| `speckit` | `.codex/skills/speckit-parallel-implement/SKILL.md` |
| `kiro` | `.kiro/skills/parallel-wave-executor/SKILL.md` |
| `codex` | Installs both Codex OpenSpec and Spec Kit skills |
| `all` | Installs all available skills |

### Codex + OpenSpec

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target openspec
```

Then ask Codex:

```text
Run the OpenSpec tasks in parallel apply batches.
```

### Codex + Spec Kit

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target speckit
```

Then ask Codex:

```text
Run the Spec Kit [P] tasks in parallel while respecting phases.
```

### Kiro

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target kiro
```

Then ask Kiro:

```text
Run the Kiro spec tasks with parallel waves.
```

### Install Everything

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target all
```

## Requirements

- Node.js 16.7 or newer for the installer.
- Git repository for implementation work.
- For OpenCode parallel execution:
  - OpenCode with subagent/task delegation available;
  - OpenSpec CLI installed and available on `PATH`;
  - a resolvable OpenSpec change, repo-local or in a registered store.
- Clean implementation working tree before worktree creation.

## Testing

Run the installer smoke test:

```bash
npm test
```

The test verifies that `--target opencode` installs:

```text
.opencode/skills/openspec-parallel-apply/SKILL.md
```

and that the installed skill contains the OpenCode/OpenSpec CLI workflow.

## Uninstall Other Targets

macOS / Linux / Git Bash:

```bash
rm -rf .codex/skills/openspec-parallel-apply
rm -rf .codex/skills/speckit-parallel-implement
rm -rf .kiro/skills/parallel-wave-executor
```

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .codex\skills\openspec-parallel-apply
Remove-Item -Recurse -Force .codex\skills\speckit-parallel-implement
Remove-Item -Recurse -Force .kiro\skills\parallel-wave-executor
```

## Notes

OpenSpec does not have a native "wave" concept. This project derives safe parallel waves from OpenSpec tasks and their dependencies.

OpenSpec store support is beta, so this fork intentionally treats OpenSpec CLI JSON output as the compatibility boundary rather than parsing registry files or hard-coding store filesystem layouts.
