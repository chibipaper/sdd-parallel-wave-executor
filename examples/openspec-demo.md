# OpenSpec Parallel Apply Demo

This demo shows how to install and exercise the OpenCode OpenSpec parallel apply skill.

## Prerequisites

- Git repository with a clean working tree
- OpenCode with task/subagent delegation available for actual parallel execution
- OpenSpec CLI installed and available on `PATH`
- At least one resolvable OpenSpec change, either repo-local or in a registered store

## Install

```bash
npx github:chibipaper/sdd-parallel-wave-executor --target opencode
```

This installs:

```text
.opencode/skills/openspec-parallel-apply/SKILL.md
```

Restart or reload OpenCode if the skill list does not refresh immediately.

## Repo-Local Change

In OpenCode, ask:

```text
Use openspec-parallel-apply for add-dark-mode.
```

The coordinator should resolve the change with OpenSpec rather than directly assuming a filesystem path:

```bash
openspec status --change "add-dark-mode" --json
openspec instructions apply --change "add-dark-mode" --json
```

## Registered Store Change

If the change belongs to a registered store, ask:

```text
Use openspec-parallel-apply for add-dark-mode from store team-context.
```

The coordinator should verify the store:

```bash
openspec store list --json
```

and then keep the selected store sticky through the workflow:

```bash
openspec status --change "add-dark-mode" --json --store team-context
openspec instructions apply --change "add-dark-mode" --json --store team-context
```

## Expected Flow

The skill should:

1. Resolve the selected OpenSpec store, if any.
2. Resolve the change through `openspec status --json`.
3. Fetch dynamic apply instructions through `openspec instructions apply --json`.
4. Keep the OpenSpec change root separate from the implementation repository when they differ.
5. Build a dependency graph from task dependencies, shared contracts, file ownership, and design constraints.
6. Group safe independent work into ordered waves.
7. Show the execution plan and wait for approval.
8. Create isolated worktrees under `.worktrees/openspec-apply-{runId}/`.
9. Run independent groups concurrently through OpenCode tasks/subagents.
10. Validate each integrated wave before starting dependent waves.
11. Run final repository validation.
12. Mark only genuinely completed OpenSpec tasks when the task artifact is writable.
13. Leave the final implementation as local uncommitted changes for review.

## Example Wave Shape

A generated task document might be visually organized like this:

```text
1. Backend
2. Frontend
3. Integration
4. Tests
```

The skill must not automatically interpret that as:

```text
Backend -> Frontend -> Integration -> Tests
```

If backend and frontend only depend on a previously defined contract, the dependency model may instead be:

```text
              +-> Backend --+
Contract -----+              +-> Integration -> Tests
              +-> Frontend --+
```

Backend and frontend can then run in the same wave if they do not modify the same files or redefine the shared contract independently.

## Verification

After completion:

```bash
git status --short
git diff
```

You should see local implementation changes on the original branch. No remote push should have occurred.

## Installer Smoke Test

From this repository:

```bash
npm test
```

The test installs the OpenCode target into a temporary directory and verifies the expected skill file exists and contains the OpenCode/OpenSpec CLI workflow.

## Notes

OpenSpec does not have a native "wave" concept. The skill derives waves from dependency evidence.

OpenSpec store support is beta. The skill therefore consumes OpenSpec CLI JSON output instead of parsing store registries or assuming fixed store directory layouts.
