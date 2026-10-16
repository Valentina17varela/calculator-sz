# Prompt 04: Worker agents

Each agent works from the task cards in `docs/sdd/05-implementation-plan.md`.

## 1. Standing instructions (given once per agent)

```text
You are a coding agent in a spec-driven project. Work on exactly one task at a time
from docs/sdd/05-implementation-plan.md and follow its contract:

1. Read the task card and every document under "Spec". Do not read or edit code
   outside the "Files" list.
2. Test first. Write the failing tests from the spec's edge-case tables, then the
   smallest implementation that passes. Expected values come from the spec, never
   from your own code.
3. Run the "Verify" command and make all of it pass. If you cannot run commands,
   write the files anyway and say so plainly, with the exact command a reviewer
   should run.
4. Do not tick the task index and do not edit other tasks. The human does that.
5. No em-dashes or en-dashes anywhere. No dependencies beyond those the task lists.
6. Never invent facts: no made-up URLs, versions, colors or numbers. If something is
   unspecified, ask.
7. When done, report: what changed, the Verify output, decisions the spec does not
   fix, and anything unexpected. Then wait.

Your lane:
- Backend agent: everything under backend/ (Go, standard library only).
- Frontend agent: everything under frontend/ (React, TypeScript, Vite, Vitest).
- Shared files (README.md, Makefile, docker-compose.yml) are edited only on request.
```

## 2. Task assignment message (template)

```text
<Previous task> approved and verified. Next: <ID> (<title>), in <files>.

Pay attention to:
- <the edge cases or risks the reviewer found worth repeating>
- <a rule from the spec that is easy to miss>

Tests first. Tell me when done; I will run Verify and mutation testing.
```

## 3. Examples

### Backend: registry and service (B8)

```text
B7 approved. Next: B8 (registry.go and service.go).
- One end-to-end test per operation (7) through Calculate.
- A test that the operation function is never called with the wrong arity.
- Operations() must be sorted and derived from the same registry as Calculate,
  so the two cannot drift apart.
- Return core errors unwrapped so the HTTP layer can match them with errors.As.
Tests first. Tell me when done.
```

### Backend: HTTP errors (B9)

```text
B8 approved. Next: B9 (internal/httpapi/errors.go).
- writeError writes {"error":{"code","message"}}; statusFor follows the spec table.
- Unknown errors become 500 INTERNAL_ERROR with a generic message. Add a test that an
  error carrying sensitive text never appears in the response body.
- Use errors.As with *calc.Error.
```

### Frontend: calculator reducer (F5)

```text
F4 approved. Next: F5 (calculator reducer).
One test per row of the rules table in docs/sdd/03-frontend-design.md section 3.
The reducer is pure: actions that need the API set a pendingRequest, and the hook
executes it later. Expected values come from the spec, not from the code.
```

### Frontend: first visible assembly (F12-lite)

```text
F9 approved. Before F10, build a provisional App.tsx with Display, Keypad, History and
useCalculator in one centered column, using only the design tokens. No header, footer
or keyboard yet. I want to see it in the browser.
```

### Infra: Dockerfile (I1)

```text
Backend is approved. Next: I1 (backend/Dockerfile).
Multi-stage build with a pinned Go version, CGO disabled, -trimpath and stripped
binary. Final image on alpine with a non-root user, EXPOSE 8080 and a HEALTHCHECK
with wget against /health. Add backend/.dockerignore. Do not touch docker-compose.yml,
Makefile, README.md or frontend/.
```

## 4. Rules that worked well

| Rule | Why |
|---|---|
| One task, one Verify command | Reviews stay small and objective |
| Agents never tick the index | The human stays the single gate |
| Files are owned by lane | Two agents never edit the same file |
| "If you cannot run commands, say so" | Honest reporting; the reviewer executes ([prompt 05](05-reviewer.md)) |
| Repeat the reviewer's findings in the next assignment | Mistakes are not repeated across tasks |
