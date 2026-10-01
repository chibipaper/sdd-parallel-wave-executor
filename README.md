# Parallel Executor Skills

Install SDD parallel execution skills directly from GitHub with `npx`.

This fork adds an OpenCode-native, store-aware OpenSpec parallel apply skill while preserving the existing Kiro and Codex targets.

## Install

From the root of the project where you want to install the skill.

OpenCode + OpenSpec:

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target opencode
```

Codex + OpenSpec:

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target openspec
```

Codex + Spec Kit:

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target speckit
```

Kiro remains available:

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target kiro
```

Install everything:

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target all
```

For reproducible installs, pin a tag or commit once you create one for this fork.

## Targets

| Target | Installed path |
| --- | --- |
| `opencode` | `.opencode/skills/openspec-parallel-apply/SKILL.md` |
| `openspec` | `.codex/skills/openspec-parallel-apply/SKILL.md` |
| `speckit` | `.codex/skills/speckit-parallel-implement/SKILL.md` |
| `kiro` | `.kiro/skills/parallel-wave-executor/SKILL.md` |
| `codex` | Installs both Codex skills: OpenSpec and Spec Kit |
| `all` | Installs Kiro, OpenCode OpenSpec, Codex OpenSpec, and Spec Kit |

## OpenCode + OpenSpec

After installation, reload OpenCode if the skill list does not update immediately.

Ask OpenCode to use the skill:

```text
Use openspec-parallel-apply for add-dark-mode.
```

If the change lives in a registered OpenSpec store:

```text
Use openspec-parallel-apply for add-dark-mode from store team-context.
```

The OpenCode skill resolves OpenSpec state through the CLI instead of assuming a fixed `openspec/changes/{change}` path. It uses commands such as:

```bash
openspec store list --json
openspec status --change "<change>" --json [--store <id>]
openspec instructions apply --change "<change>" --json [--store <id>]
```

The returned OpenSpec context drives execution. This means custom schemas and registered stores can provide their own resolved change root, context files, task artifact, and apply instructions.

## Parallel Apply Model

The OpenCode skill:

1. resolves the selected OpenSpec change and optional store through the OpenSpec CLI;
2. reads the apply instructions and resolved context;
3. builds a conservative dependency graph from tasks, shared contracts, file overlap, and explicit ordering;
4. groups independent work into ordered waves;
5. runs independent groups through OpenCode tasks/subagents in isolated git worktrees;
6. validates each wave before starting dependent work;
7. integrates successful branches in deterministic order;
8. runs final repository validation;
9. leaves the final implementation as local uncommitted changes for review.

It does **not** treat top-level task headings as automatically sequential. Headings are considered organizational evidence; actual dependencies, shared contracts, and file ownership determine whether work can run concurrently.

## Store-Aware Behavior

A registered OpenSpec store may live outside the implementation repository. The skill therefore keeps two locations distinct:

```text
OpenSpec store/change root
        │
        │ requirements + tasks + apply instructions
        ▼
parallel apply coordinator
        │
        ▼
implementation git repository
```

The coordinator resolves OpenSpec state once and passes bounded context to workers. Workers do not independently rediscover OpenSpec state, which reduces inconsistent interpretations between parallel agents.

When OpenSpec instructions reference another store, the coordinator should fetch only the required spec or context rather than copying the entire referenced store into every worker.

## Codex + OpenSpec

The original Codex OpenSpec target remains available:

```text
Run the OpenSpec tasks in parallel apply batches.
```

It installs to:

```text
.codex/skills/openspec-parallel-apply/SKILL.md
```

The OpenCode skill is the primary store-aware implementation in this fork.

## Spec Kit

Ask Codex:

```text
Run the Spec Kit [P] tasks in parallel while respecting phases.
```

The Spec Kit skill respects phases, dependencies, user-story groupings, and `[P]` task markers. It downgrades same-file or same-component work to sequential execution.

## Kiro

Ask Kiro:

```text
Run the Kiro spec tasks with parallel waves.
```

## Requirements

- Node.js 16.7 or newer for the installer.
- Git repository for implementation work.
- For OpenCode parallel execution:
  - OpenCode with task/subagent delegation available;
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

## Update

Run the same install command again from the target project root. The installer replaces the selected skill directory.

## Uninstall

Remove the installed skill directory or directories:

```bash
rm -rf .opencode/skills/openspec-parallel-apply
rm -rf .codex/skills/openspec-parallel-apply
rm -rf .codex/skills/speckit-parallel-implement
rm -rf .kiro/skills/parallel-wave-executor
```

## Notes

OpenSpec does not have a native "wave" concept. This project derives safe parallel waves from OpenSpec tasks and their dependencies.

OpenSpec store support is beta, so this fork intentionally treats OpenSpec CLI JSON output as the compatibility boundary instead of parsing registry files or hard-coding store filesystem layouts.
