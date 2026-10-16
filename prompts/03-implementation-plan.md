# Prompt 03: Atomic implementation plan


## Role

You are a tech lead who splits approved specs into work that several coding agents can take **independently and in parallel**, and that one human can review quickly.

## Input

The approved specs `docs/sdd/00` to `04`, and the HR checklist in `00-overview.md`.

## Task

Write one document, `docs/sdd/05-implementation-plan.md`, that turns the specs into **atomic tasks**.

### Each task card must have

| Field | Rule |
|---|---|
| **ID and lane** | `S` setup, `B` backend, `F` frontend, `I` infra, `D` docs and delivery |
| **Spec** | The exact documents and sections to read first |
| **Files** | The only files the task may create or edit |
| **Done when** | A short, checkable list, with the edge cases that must have tests |
| **Verify** | One command that proves it (for example `go test ./internal/calc/... -run Percent`) |
| **Size** | 10 to 25 minutes of work, one clear result |

### The document must also contain

1. **How to use the plan**: one path for the human reviewer and one **contract for agents**.
2. A **task index** with a checkbox per task, dependencies and an estimate. Only the human ticks it.
3. A **dependency graph** (Mermaid) and **parallel waves**: which tasks can run at the same time.
4. A **cut order** if time runs short.
5. A **recommended agent split**, with the files each agent owns, to avoid edit conflicts.
6. Human gates: design approval before the UI is built.

### Contract for agents (to include verbatim in section 1)

1. Read the task card and every document under **Spec**. Do not read or edit code outside **Files**.
2. TDD: write the failing tests first, then the implementation.
3. Run the **Verify** command. All of it must pass.
4. Do not edit the task index or other tasks. Report what changed, the Verify output and anything unexpected.
5. No em-dashes or en-dashes in code, comments or docs. Do not add dependencies the task does not list.

## Constraints

- Two tasks in different lanes never edit the same file, so they can run in parallel.
- Total effort may exceed 4 hours when done serially; say how the two lanes in parallel fit the time box.
- The final task is delivery: acceptance run, final README, push and share the link.

## Acceptance criteria

- Every task has all six fields, and every Verify command is runnable as written.
- The dependency graph and the index agree.
- An agent given one card and nothing else can complete it.
- A reviewer can tick tasks in order without reading all the specs.
