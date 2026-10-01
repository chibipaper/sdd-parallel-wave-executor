---
name: openspec-parallel-apply
description: Execute OpenSpec change tasks in parallel apply waves from OpenCode, using OpenSpec CLI-resolved context, optional stores, isolated git worktrees, ordered integration, and final local uncommitted changes for review.
compatibility: Requires OpenCode, OpenSpec CLI, and git.
---

# Parallel Apply Executor for OpenSpec (OpenCode)

Use this skill when the user asks OpenCode to implement an existing OpenSpec change in parallel.

OpenSpec is the source of truth for change location, schema, apply state, context files, instructions, references, and tasks. Do not assume a fixed `openspec/changes/{change}` layout when the CLI can resolve it.

Do not archive or sync a change unless explicitly requested.

## Requirements

- OpenCode with subagent/task delegation available for actual parallel execution.
- OpenSpec CLI on `PATH`.
- A git repository containing the implementation target.
- A clean implementation working tree before worktree creation.

## Store Selection

If the user names a store, or the work is known to live in one:

```bash
openspec store list --json
```

Verify the store id exists, then keep `--store <id>` sticky on OpenSpec commands that support it.

Without a selected store, let OpenSpec resolve the nearest/default repo-local root. Do not parse the store registry or guess store paths.

OpenSpec stores are beta, so consume CLI JSON rather than relying on internal file layouts.

## Resolve the Change Through OpenSpec

If the user did not name a change:

```bash
openspec list --json [--store <id>]
```

If more than one active change is plausible, ask the user to choose.

Resolve status:

```bash
openspec status --change "<change>" --json [--store <id>]
```

Use these fields when present:

- `changeName`
- `schemaName`
- `changeRoot`
- `artifactPaths`
- `nextSteps`
- `actionContext`
- `isPlanningComplete`
- `applyRequires`
- `root`

Do not treat `isComplete` as implementation completion; it is a planning-completeness compatibility alias.

Fetch the authoritative apply payload:

```bash
openspec instructions apply --change "<change>" --json [--store <id>]
```

Use its returned:

- `changeName`
- `changeDir`
- `schemaName`
- `contextFiles`
- `progress`
- `tasks`
- `state`
- `missingArtifacts`
- `instruction`
- `references`
- `context`
- `operationGuidance`
- `root`

If `state` is `blocked`, stop and report `missingArtifacts` / relevant `nextSteps`.
If `state` is `all_done`, do not run implementation workers.

Read only the returned context needed for the assigned work. Custom schemas may return different artifact sets, so do not hard-code proposal/design/spec/tasks paths.

For referenced stores, follow the fetch command/hints supplied by OpenSpec and retrieve only the relevant specs.

## Determine the Implementation Repository

The OpenSpec root and the code repository may be different directories.

Use user context plus OpenSpec `actionContext`/apply context to identify the code repository to edit. Do not silently assume a registered planning store is also the implementation repository.

If the implementation repository cannot be determined from available context, stop before any write operation and report the ambiguity.

## OpenCode Capability Check

Before claiming parallel execution, verify the current OpenCode session can invoke independent child agents/tasks.

- When delegation is available, use separate workers for safe independent groups.
- When delegation is unavailable, do not describe the run as parallel. Show the plan and execute sequentially only with user approval.

## Safety Rules

- Show the execution plan and get user approval before creating worktrees, branches, commits, or workers.
- Require a clean implementation working tree.
- Never run `git push`.
- Never run `git reset --hard`.
- Create a backup branch before integration.
- Keep run resources under `.worktrees/openspec-apply-{runId}/` and `.opencode/tmp/`.
- On failure, preserve evidence unless the user approves cleanup.
- Leave the final implementation as local reviewable changes on the user's branch.

## Preflight

In the implementation repository:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
```

Stop if there are uncommitted changes.

Check `.gitignore` for `.worktrees/`; include adding it in the approval plan if absent.

Check for leftovers:

```text
.worktrees/openspec-apply-*
.opencode/tmp/openspec-apply-*.json
branches matching openspec-apply-*
```

Generate:

```text
runId = openspec-{changeSlug}-{YYYYMMDDHHmmss}
```

## Build the Dependency Model

Use the apply payload's `tasks` plus resolved context and instructions.

For each task capture:

- task id and description
- explicit prerequisite text
- likely target files/modules
- related requirements/scenarios
- API/schema/type/migration/config contracts consumed or produced

A task depends on another when OpenSpec says so, task text establishes a prerequisite, it consumes a contract produced by the other task, both must edit a tightly coupled area, or the design/instructions establish ordering.

Top-level task headings are organizational evidence only. Do not automatically convert headings into sequential waves.

## Parallel Wave Rules

Create ordered waves from the dependency graph.

Tasks/groups may share a wave only when:

- all dependencies are satisfied by earlier waves
- edits are disjoint or safely independent
- they do not independently redefine the same shared contract
- there is no shared migration/config/schema/route ownership conflict

When independence is unclear, run sequentially.
Prefer coherent groups over excessive fragmentation.
Run at most 10 workers concurrently.

## Execution Plan

Before writes, show:

- change and selected store / repo-local root
- schema and resolved change root
- implementation repository
- task count and wave count
- tasks/groups per wave
- parallel vs sequential groups and reasons
- likely files/modules touched
- worktree and branch naming
- integration order
- backup branch
- key dependency/contract risks

Continue only after approval.

## Preparation

Record:

```bash
git branch --show-current
git rev-parse HEAD
```

Call these `baseBranch` and `startCommit`.

Create:

```bash
git branch backup/openspec-apply-before-{runId} {startCommit}
mkdir -p .opencode/tmp
```

Write `.opencode/tmp/openspec-apply-{runId}.json` containing the run id, change/store/schema, change root, implementation repo, base branch, start commit, backup branch, resolved OpenSpec inputs, wave plan, worker status, changed files, checks, and errors.

Do **not** create every wave's worktree up front.

## Just-in-Time Worktrees

Dependency correctness requires later waves to see earlier integrated changes.

At the start of each wave:

1. Record the current integration HEAD:

   ```bash
   waveBase=$(git rev-parse HEAD)
   ```

2. For each group in that wave, create its worktree explicitly from `waveBase`:

   ```bash
   git worktree add \
     .worktrees/openspec-apply-{runId}/wave-{W}-group-{G} \
     -b openspec-apply-{runId}-w{W}-g{G} \
     "$waveBase"
   ```

3. Only then launch the wave's workers.

Never launch a dependent wave from `startCommit` after earlier waves have integrated. Each wave must branch from the current validated integration HEAD.

## Worker Context

Delegate each group to a separate OpenCode subagent/task with an explicit absolute worktree path.

Provide:

- assigned task ids only
- relevant OpenSpec instruction/context content
- relevant referenced specs
- shared contracts that must remain stable
- required focused validation commands

Workers must:

- work only inside the assigned worktree
- implement only assigned tasks
- inspect repository code before editing
- preserve supplied shared contracts
- run focused tests/build checks
- report changed files, checks, failures, and completed task ids
- not commit, push, merge, reset, create/delete worktrees, or clean up

The coordinator resolves OpenSpec state once. Do not make every worker independently rediscover the change.

## Wave Execution and Integration

For each wave, in order:

1. Create that wave's worktrees just-in-time from current HEAD.
2. Launch all safe groups concurrently.
3. Wait for every group in the wave.
4. Review worker changed-file lists and validation results.
5. Do not continue if a prerequisite group failed.
6. Commit each successful worker branch:

   ```bash
   git -C <worktree> add -A
   git -C <worktree> commit -m "feat(openspec apply): {task-group-summary}"
   ```

7. Merge successful group branches into `baseBranch` in deterministic order:

   ```bash
   git merge <worker-branch> --no-edit
   ```

8. If conflicts occur, stop and report the branches/files. Do not auto-resolve, abort, or delete evidence without user authorization.
9. Run wave-level validation on the integrated branch.
10. Start the next wave only after wave-level validation succeeds.

After all waves integrate, run the repository's full required validation suite.

## Finalize Review State

After successful final validation, convert temporary integration commits back into reviewable local changes:

```bash
git reset --soft {startCommit}
```

This intentionally leaves the implementation staged relative to `startCommit`.

If the OpenSpec progress artifact is writable, mark only tasks supported by successful implementation evidence as complete. Use the resolved task/progress path from OpenSpec rather than assuming `openspec/changes/{change}/tasks.md`.

If the change lives in another store/repository, do not mutate that store from an implementation worktree. Update it only through its resolved path after successful implementation evidence exists.

## Cleanup

After a successful run, remove only this run's worktrees and temporary worker branches. Preserve the backup branch unless the user asks to remove it.

For failures, preserve the manifest and exact cleanup targets.

## Final Report

Report:

- change/store
- completed waves and tasks
- failed/skipped tasks
- changed files
- focused worker checks
- wave-level validation
- final validation suite
- backup branch and start commit
- whether final changes are staged/uncommitted
- OpenSpec progress updates
- remaining cleanup

Never describe execution as parallel unless independent workers actually ran concurrently.
