# 01. API specification

## 1. Principles

- Numbers are sent and returned as **decimal strings** (`"0.1"`), never JSON numbers, to keep exact precision.
- One endpoint performs every operation; the operation is part of the payload.
- Every error returns the same envelope with a stable machine-readable `code`.
- Malformed requests return `400`; well-formed requests that are mathematically invalid return `422`.

## 2. Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/calculate` | Perform one operation |
| `GET` | `/api/v1/operations` | List supported operations and their arity |
| `GET` | `/health` | Liveness probe |

## 3. Operations

| `operation` | Operands | Meaning |
|---|---|---|
| `add` | `[a, b]` | a + b |
| `subtract` | `[a, b]` | a - b |
| `multiply` | `[a, b]` | a x b |
| `divide` | `[a, b]` | a / b, `b` must not be 0 |
| `power` | `[base, exponent]` | base ^ exponent, exponent must be an integer |
| `sqrt` | `[a]` | square root, `a` must be >= 0 |
| `percent` | `[p, base]` | p percent of base = base x p / 100 |

## 4. `POST /api/v1/calculate`

Request:

```json
{ "operation": "divide", "operands": ["10", "4"] }
```

Success `200 OK`:

```json
{ "operation": "divide", "operands": ["10", "4"], "result": "2.5" }
```

Rules:

- `operands` are decimal strings matching `^-?\d+(\.\d+)?$` (no exponent notation, no spaces).
- Result precision: up to **12 decimal places**, trailing zeros trimmed.
- Maximum operand length: 32 characters; maximum request body: 1 KB.

## 5. Errors

Envelope:

```json
{ "error": { "code": "DIVISION_BY_ZERO", "message": "cannot divide by zero" } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `INVALID_JSON` | Body is not valid JSON or has unknown fields |
| 400 | `UNKNOWN_OPERATION` | `operation` is not supported |
| 400 | `INVALID_OPERAND_COUNT` | Wrong number of operands for the operation |
| 400 | `INVALID_OPERAND` | Operand is not a valid decimal string |
| 422 | `DIVISION_BY_ZERO` | `divide` with `b = 0` |
| 422 | `NEGATIVE_SQUARE_ROOT` | `sqrt` of a negative number |
| 422 | `NON_INTEGER_EXPONENT` | `power` with a non-integer exponent |
| 422 | `OUT_OF_RANGE` | Result or exponent exceeds safe limits |
| 405 | `METHOD_NOT_ALLOWED` | Wrong HTTP method |
| 413 | `PAYLOAD_TOO_LARGE` | Body larger than 1 KB |

## 6. Examples

```bash
# Add with exact decimals
curl -s -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add","operands":["0.1","0.2"]}'
# {"operation":"add","operands":["0.1","0.2"],"result":"0.3"}

# 15 percent of 200
curl -s -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"percent","operands":["15","200"]}'
# {"operation":"percent","operands":["15","200"],"result":"30"}

# Division by zero
curl -s -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","operands":["1","0"]}'
# 422 {"error":{"code":"DIVISION_BY_ZERO","message":"cannot divide by zero"}}
```

## 7. `GET /api/v1/operations`

```json
{ "operations": [
  { "name": "add", "arity": 2 },
  { "name": "sqrt", "arity": 1 }
] }
```

## 8. Open questions

- Percent semantics: `[p, base]` means "p percent of base". The UI maps the `%` key to the common calculator behavior on top of this.
- CORS: handled by the Vite dev proxy locally and by an nginx reverse proxy in Docker, so the API does not need CORS headers.
