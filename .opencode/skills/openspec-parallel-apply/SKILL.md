---
name: openspec-parallel-apply
description: Execute OpenSpec change tasks in parallel apply waves from OpenCode, using OpenSpec CLI-resolved context, optional stores, isolated git worktrees, ordered integration, and final local uncommitted changes for review.
---

# Parallel Apply Executor for OpenSpec (OpenCode)

Use this skill when the user asks OpenCode to implement an OpenSpec change in parallel, for example:

- "Run the OpenSpec tasks in parallel."
- "OpenSpec apply in parallel."
- "Use parallel waves for this OpenSpec change."
- "opsx apply 병렬로 실행해줘"

## Scope

This skill implements an existing OpenSpec change. OpenSpec itself remains the source of truth for change location, schema, apply instructions, context files, and task state.

Do not hard-code `openspec/changes/{change}` as the only valid location. A change may live in the current project or in a registered OpenSpec store.

Do not archive or sync the change unless the user explicitly asks. This skill only applies implementation tasks and updates completed task checkboxes when appropriate.

## Requirements

- OpenCode with task/subagent delegation available for actual parallel execution.
- OpenSpec CLI available on `PATH`.
- A git repository for the implementation target.
- A clean working tree before worktree creation.

## Store Selection

A store is a standalone OpenSpec repository registered on the machine.

1. If the user explicitly names a store, run:

   ```bash
   openspec store list --json
   ```

   Verify the requested store id exists.

2. If the work is already known to live in a store, resolve that store id the same way.

3. Once a store is selected, treat it as sticky for the rest of the OpenSpec workflow. Append:

   ```text
   --store <id>
   ```

   to OpenSpec commands that support store selection.

4. If no store is selected, operate against the nearest repo-local `openspec/` root. Do not invent a store.

Store support is beta in OpenSpec. Prefer OpenSpec CLI JSON output over parsing registry files or assuming filesystem layouts.

## Resolve the Change Through OpenSpec

Never infer the change root or context files from conventional paths when the CLI can resolve them.

If the user names the change, use that change id. Otherwise run:

```bash
openspec list --json [--store <id>]
```

and ask the user to choose when more than one active change is plausible.

Resolve status:

```bash
openspec status --change "<change>" --json [--store <id>]
```

Require planning artifacts to be complete enough for apply. Respect `nextSteps` from OpenSpec instead of guessing what artifact is missing.

Fetch apply instructions:

```bash
openspec instructions apply --change "<change>" --json [--store <id>]
```

Treat this JSON as the authoritative execution context. Capture, when present:

- change name
- schema name
- resolved change root
- task artifact/path
- task list and completion state
- context files
- apply instructions / operation guidance
- referenced-store indexes or fetch hints

Do not assume the context consists only of `proposal.md`, `design.md`, `specs/**/*.md`, and `tasks.md`; custom schemas may return different files.

If the instructions reference specs from another registered store, fetch only the relevant spec through the command supplied by OpenSpec (for example `openspec show ... --store <id>`). Do not copy an entire referenced store into worker context.

## OpenCode Capability Check

Before executing in parallel, verify that the current OpenCode session can delegate independent work to separate tasks/subagents.

- If delegation is available, use one worker per independent task group or wave unit.
- If delegation is unavailable, do not pretend work is parallel. Show the plan and execute sequentially only with the user's approval.

## Safety Rules

- Show the execution plan and get user approval before creating worktrees, branches, commits, or workers.
- Require a clean git working tree before starting.
- Never run `git push`.
- Never run `git reset --hard`.
- Never delete branches, worktrees, or manifests after a failure without user approval.
- Create a backup branch before integration.
- Keep intermediate work under `.worktrees/openspec-apply-{runId}/`.
- Leave the final implementation on the user's current branch as local uncommitted changes for review.

## Preflight

1. Resolve the selected store, if any.
2. Resolve the selected change with `openspec status --json`.
3. Fetch `openspec instructions apply --json`.
4. Identify the implementation repository. The OpenSpec store and implementation repository may be different directories; do not assume the change root is the git repo to edit.
5. Read only the resolved context needed to understand the change and task dependencies.
6. Run in the implementation repository:

   ```bash
   git status --short
   git branch --show-current
   git rev-parse HEAD
   ```

7. Stop if the implementation repository has uncommitted changes.
8. Check that `.gitignore` contains `.worktrees/`. If missing, include adding it in the approval plan.
9. Check for leftovers from earlier runs:

   ```text
   .worktrees/openspec-apply-*
   .opencode/tmp/openspec-apply-*.json
   branches matching openspec-apply-*
   ```

10. Generate `runId`:

   ```text
   openspec-{changeSlug}-{YYYYMMDDHHmmss}
   ```

## Build the Dependency Model

Use OpenSpec's returned tasks and instructions first. Use the rendered task artifact only as additional evidence.

For every task, capture:

- task id / checkbox text
- description
- explicit dependencies
- target files or modules mentioned
- related requirements/scenarios from the resolved context
- shared contracts such as API routes, schemas, migrations, or common configuration

Build a conservative dependency graph.

A task depends on another task when any of the following is true:

- OpenSpec explicitly says so.
- Its task text names the other task as a prerequisite.
- It consumes an API/schema/type/migration/config produced by the other task.
- Both tasks must modify the same file or tightly coupled component and cannot be safely merged independently.
- The design/instructions establish an ordering constraint.

Do not treat top-level headings as inherently sequential if the underlying tasks are actually independent. Headings are organizational evidence, not a dependency graph.

## Parallel Wave Rules

Create ordered waves from the dependency graph.

Within one wave, tasks may run concurrently only when all of the following hold:

- all dependencies are satisfied by earlier waves
- workers modify disjoint files or safely independent modules
- workers do not independently redefine the same shared contract
- no shared migration/config/schema/route ownership conflict exists

Downgrade to sequential execution when independence is unclear.

Prefer larger coherent task groups over excessive worker fragmentation. Avoid assigning two workers changes that will obviously require manual conflict resolution.

Run at most 10 workers concurrently.

## Execution Plan

Before modifying anything, show:

- selected OpenSpec change
- selected store or `repo-local`
- resolved change root
- implementation repository
- schema name
- task count
- wave count
- tasks per wave
- parallel groups
- groups downgraded to sequential and why
- likely files/modules touched
- worktree paths
- branch names
- integration order
- backup branch name
- risks and shared-contract dependencies

Continue only after user approval.

## Preparation

In the implementation repository, record:

```bash
git branch --show-current
git rev-parse HEAD
```

Create:

```bash
git branch backup/openspec-apply-before-{runId} {startCommit}
mkdir -p .opencode/tmp
```

Write:

```text
.opencode/tmp/openspec-apply-{runId}.json
```

Include:

- runId
- change
- store id, if any
- schema
- changeRoot
- implementationRepo
- baseBranch
- startCommit
- backupBranch
- OpenSpec command inputs
- resolved context files
- wave metadata
- worker status
- changed files
- checks run
- errors

Create one worktree per concurrently executed task group:

```bash
git worktree add .worktrees/openspec-apply-{runId}/wave-{W}-group-{G} -b openspec-apply-{runId}-w{W}-g{G}
```

## Worker Context

Delegate each independent group to an OpenCode task/subagent with an explicit working directory.

Every worker prompt must include:

- absolute worktree path
- assigned task ids only
- OpenSpec apply instructions relevant to those tasks
- resolved context files relevant to those tasks
- fetched referenced-store specs when required
- shared API/schema/type contracts that must not be changed independently
- required validation commands

Every worker must:

- work only inside its assigned worktree
- implement only assigned tasks
- inspect repository code before editing
- preserve shared contracts supplied in its prompt
- run relevant focused tests/build checks
- report changed files, checks, failures, and completed task ids
- not commit, push, merge, reset, create/delete worktrees, or perform cleanup

Do not make every worker independently rediscover OpenSpec state. The coordinator resolves the change once and gives workers bounded context.

## Wave Execution

For each wave in order:

1. Launch all safe groups in that wave concurrently.
2. Wait for every group in the wave to finish.
3. Review each worker's changed-file list and validation results.
4. Do not start dependent waves when a prerequisite group failed.
5. Commit successful worktree changes on their temporary branches.
6. Integrate successful groups in a deterministic order.
7. Run wave-level validation after integration.
8. If validation fails, stop before starting the next dependent wave and report the failure.

Parallelism applies within a wave; dependency ordering applies between waves.

## Integration

Commit each successful worker branch:

```bash
git -C <worktree> add -A
git -C <worktree> commit -m "feat(openspec apply): {task-group-summary}"
```

Merge groups into the original branch in wave order:

```bash
git merge <worker-branch> --no-edit
```

If a merge conflict occurs:

- stop immediately
- report the conflicting branches/files
- do not auto-resolve unless the conflict is trivial and the user explicitly authorized automatic conflict resolution
- do not abort or delete evidence without user approval
- point to `backup/openspec-apply-before-{runId}`

After all waves integrate successfully, run the repository's full required validation suite.

Then convert the integration commits back into reviewable local changes:

```bash
git reset --soft {startCommit}
```

If the task artifact is writable from the current workflow, mark only genuinely completed tasks `[x]`. Use the resolved task path from OpenSpec rather than assuming `openspec/changes/{change}/tasks.md`.

When the change lives in a different store/repository, do not mutate that store from an implementation worktree accidentally. Update its task artifact only through its resolved path and only after successful implementation evidence exists.

## Cleanup

For a successful run, remove only resources created by this run:

```bash
git worktree remove --force <worktree>
git branch -D <worker-branch>
```

Remove `.worktrees/openspec-apply-{runId}` if empty.

Preserve the manifest until the final report is produced. For a failed run, preserve the manifest and report exact cleanup targets instead of deleting them.

## Final Report

Report:

- selected change and store
- completed waves / total waves
- completed tasks / total tasks
- failed or skipped tasks
- changed files
- focused checks run by workers
- wave-level checks
- final validation suite
- backup branch
- start commit
- whether final changes are staged/uncommitted
- task artifact updates
- cleanup still needed

Never describe execution as parallel unless independent workers actually ran concurrently.
