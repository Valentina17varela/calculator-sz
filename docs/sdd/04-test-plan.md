# 04. Test plan


## 1. Strategy

| Layer | Tool | Style | Target |
|---|---|---|---|
| Backend core (`calc`) | `go test` | Table-driven, one row per edge case in [02-backend-design](02-backend-design.md) | 95% statements |
| Backend HTTP (`http_api`) | `go test` + `httptest` | One test per status code and error code | 90% statements |
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
go tool cover -html=coverage.out -o coverage.html

# Frontend
cd frontend
npm run test                               # watch mode
npm run test:coverage                      # one run, writes frontend/coverage/

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
- The HTML coverage report is generated locally and added to the README.
