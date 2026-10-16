# 04. Test plan


## 1. Strategy

| Layer | Tool | Style | Target |
|---|---|---|---|
| Backend core (`calc`) | `go test` | Table-driven, one row per edge case in [02-backend-design](02-backend-design.md) | 95% statements |
| Backend HTTP (`httpapi`) | `go test` + `httptest` | One test per status code and error code | 90% statements |
| Frontend reducer | Vitest | Pure function tests, one per rule in [03-frontend-design](03-frontend-design.md) | 95% |
| Frontend API client | Vitest + mocked `fetch` | Success, each error code, network, abort | 90% |
| Frontend components | Vitest + Testing Library | User-level flows | 80% |

Overall target: **backend 90%+, frontend 85%+**. Coverage is a guide; correctness of edge cases matters more.

## 2. TDD order (SDD)

1. Spec row exists in a design doc.
2. Write the failing test from that row.
3. Implement the smallest code that passes.
4. Refactor with tests green.

## 3. Commands

```bash
# Backend
cd backend
go test ./... -race -coverprofile=coverage.out
go tool cover -func=coverage.out          # summary in the terminal
go tool cover -html=coverage.out -o ../docs/coverage/backend.html   # versioned, overwritten each run

# Frontend
cd frontend
npm run test                               # watch mode
npm run test:coverage                      # one run, writes ../docs/coverage/frontend/ (versioned, overwritten)

# Both (from the repo root)
make test
make coverage
```

## 4. Acceptance scenarios (end to end, run manually and against Docker)

| # | Scenario | Expected |
|---|---|---|
| A1 | Press `0.1 + 0.2 =` | `0.3` |
| A2 | Press `1 / 0 =` | "Cannot divide by zero", keys recover after pressing `C` |
| A3 | Press `16`, `sqrt` | `4` |
| A4 | Press `200 + 15 %` | `230` (percent of left) |
| A5 | Stop the backend, press `1 + 1 =` | "Cannot reach the calculator service" |
| A6 | Resize to 360px | No horizontal scroll, keys at least 44px |
| A7 | Type using the keyboard only | Full calculation works, focus visible |
| A8 | `docker compose up`, open `http://localhost:8080` | App works through the proxy |

## 5. Reporting

- A coverage summary table is added to the README after the final run.
- The HTML coverage reports are **versioned** so reviewers can open the original report:
  - `docs/coverage/backend.html`
  - `docs/coverage/frontend/index.html`
- They live at fixed paths and are **overwritten on every `make coverage` run**, so the repo always holds the latest version (git history keeps the older ones).
- `coverage.out` (the raw Go profile) is not versioned.
- The README links to both reports next to the summary table.

## 6. Acceptance run results

Run in a real Chrome against the Docker stack (`web` and `api` containers, only the proxy port published).

| # | Scenario | Result | Evidence |
|---|---|---|---|
| A1 | `0.1 + 0.2 =` | Pass | display `0.3` |
| A2 | `1 / 0 =`, then `C` | Pass | alert "Cannot divide by zero"; after `C` the alert is gone and keys are enabled |
| A3 | `16`, square root | Pass | display `4` |
| A4 | `200 + 15 % =` | Pass | `15 %` of 200 shows `30`, then `=` shows `230` |
| A5 | Backend stopped, `1 + 1 =` | Pass | alert "Cannot reach the calculator service. Try again"; `C` stays enabled |
| A5b | Backend restarted, `2 + 3 =` | Pass | recovers without reloading the page, display `5` |
| A6 | 360 px width | Pass | `scrollWidth` 360 of 360; no key under 44 px |
| A7 | Keyboard only | Pass | `12.5 * 8 Enter` gives `100`, `9` then `r` gives `3`, first `Tab` shows a solid 3 px ring |
| A8 | `docker compose up`, one port | Pass | UI served, `POST /api/v1/calculate` through the proxy returns `0.3` |

Also verified in the same environment: the 26 API checks of `backend/scripts/smoke.sh` through the proxy, and the 64 digit history layout at 360, 768 and 1280 px.
