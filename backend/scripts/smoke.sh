#!/usr/bin/env bash
# Smoke test against a running API.
# Usage: BASE_URL=http://localhost:8080 ./scripts/smoke.sh
# Exits with a non-zero code if any check fails.
set -u

BASE_URL="${BASE_URL:-http://localhost:8080}"
WAIT_SECONDS="${WAIT_SECONDS:-10}"
CALC="$BASE_URL/api/v1/calculate"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

pass=0
fail=0
STATUS=""
BODY=""

ok() {
  pass=$((pass + 1))
  printf 'PASS  %s\n' "$1"
}

bad() {
  fail=$((fail + 1))
  printf 'FAIL  %s\n      %s\n' "$1" "$2"
}

wait_for_api() {
  local i
  for ((i = 0; i < WAIT_SECONDS; i++)); do
    if curl -sf --max-time 2 -o /dev/null "$BASE_URL/health"; then
      return 0
    fi
    sleep 1
  done
  echo "API not reachable at $BASE_URL after ${WAIT_SECONDS}s" >&2
  return 1
}

# request METHOD URL [DATA]  (DATA starting with @ is read from a file)
# Sets STATUS and BODY and stores response headers in $tmp/headers.
request() {
  local method=$1 url=$2 data=${3-}
  local args=(-sS --max-time 5 -o "$tmp/body" -D "$tmp/headers" -w '%{http_code}' -X "$method")
  if [ -n "$data" ]; then
    args+=(-H 'Content-Type: application/json' --data-binary "$data")
  fi
  STATUS=$(curl "${args[@]}" "$url" 2>"$tmp/err") || STATUS=000
  BODY=$(cat "$tmp/body" 2>/dev/null)
}

header_value() {
  grep -i "^$1:" "$tmp/headers" | head -n 1 | tr -d '\r' | sed 's/^[^:]*:[[:space:]]*//'
}

# check_exact NAME METHOD URL DATA STATUS BODY
check_exact() {
  local name=$1 method=$2 url=$3 data=$4 status=$5 body=$6
  local problems=""
  request "$method" "$url" "$data"
  [ "$STATUS" = "$status" ] || problems="status $STATUS, want $status. "
  [ "$BODY" = "$body" ] || problems="${problems}body $BODY, want $body. "
  [ "$(header_value Content-Type)" = "application/json" ] || problems="${problems}Content-Type is not application/json. "
  if [ -z "$problems" ]; then ok "$name"; else bad "$name" "$problems"; fi
}

# check_error NAME METHOD URL DATA STATUS CODE [ALLOW]
check_error() {
  local name=$1 method=$2 url=$3 data=$4 status=$5 code=$6 allow=${7-}
  local problems=""
  request "$method" "$url" "$data"
  [ "$STATUS" = "$status" ] || problems="status $STATUS, want $status. "
  case "$BODY" in
    *"\"code\":\"$code\""*) ;;
    *) problems="${problems}body $BODY lacks code $code. " ;;
  esac
  [ "$(header_value Content-Type)" = "application/json" ] || problems="${problems}Content-Type is not application/json. "
  if [ -n "$allow" ] && [ "$(header_value Allow)" != "$allow" ]; then
    problems="${problems}Allow is '$(header_value Allow)', want '$allow'. "
  fi
  if [ -z "$problems" ]; then ok "$name"; else bad "$name" "$problems"; fi
}

wait_for_api || exit 1

VALID='{"operation":"add","operands":["1","2"]}'

echo "== Spec examples (01 section 6)"
check_exact "add 0.1 + 0.2" POST "$CALC" \
  '{"operation":"add","operands":["0.1","0.2"]}' 200 \
  '{"operation":"add","operands":["0.1","0.2"],"result":"0.3"}'
check_exact "15 percent of 200" POST "$CALC" \
  '{"operation":"percent","operands":["15","200"]}' 200 \
  '{"operation":"percent","operands":["15","200"],"result":"30"}'
check_exact "division by zero" POST "$CALC" \
  '{"operation":"divide","operands":["1","0"]}' 422 \
  '{"error":{"code":"DIVISION_BY_ZERO","message":"cannot divide by zero"}}'

echo "== Other endpoints"
check_exact "health" GET "$BASE_URL/health" "" 200 '{"status":"ok"}'
check_exact "operations list" GET "$BASE_URL/api/v1/operations" "" 200 \
  '{"operations":[{"name":"add","arity":2},{"name":"divide","arity":2},{"name":"multiply","arity":2},{"name":"percent","arity":2},{"name":"power","arity":2},{"name":"sqrt","arity":1},{"name":"subtract","arity":2}]}'

echo "== Operations"
check_exact "subtract 0 - 0.1" POST "$CALC" \
  '{"operation":"subtract","operands":["0","0.1"]}' 200 \
  '{"operation":"subtract","operands":["0","0.1"],"result":"-0.1"}'
check_exact "multiply 1.5 x 1.5" POST "$CALC" \
  '{"operation":"multiply","operands":["1.5","1.5"]}' 200 \
  '{"operation":"multiply","operands":["1.5","1.5"],"result":"2.25"}'
check_exact "divide 1 / 3 rounds to 12 dp" POST "$CALC" \
  '{"operation":"divide","operands":["1","3"]}' 200 \
  '{"operation":"divide","operands":["1","3"],"result":"0.333333333333"}'
check_exact "power 2 ^ 10" POST "$CALC" \
  '{"operation":"power","operands":["2","10"]}' 200 \
  '{"operation":"power","operands":["2","10"],"result":"1024"}'
check_exact "sqrt 2" POST "$CALC" \
  '{"operation":"sqrt","operands":["2"]}' 200 \
  '{"operation":"sqrt","operands":["2"],"result":"1.414213562373"}'

echo "== 422 domain errors"
check_error "negative square root" POST "$CALC" \
  '{"operation":"sqrt","operands":["-1"]}' 422 NEGATIVE_SQUARE_ROOT
check_error "non integer exponent" POST "$CALC" \
  '{"operation":"power","operands":["2","0.5"]}' 422 NON_INTEGER_EXPONENT
check_error "exponent out of range" POST "$CALC" \
  '{"operation":"power","operands":["2","101"]}' 422 OUT_OF_RANGE
check_error "zero to a negative power" POST "$CALC" \
  '{"operation":"power","operands":["0","-1"]}' 422 DIVISION_BY_ZERO

echo "== 400 malformed requests"
check_error "invalid json" POST "$CALC" 'not json' 400 INVALID_JSON
check_error "unknown field" POST "$CALC" \
  '{"operation":"add","operands":["1","2"],"extra":1}' 400 INVALID_JSON
check_error "unknown operation" POST "$CALC" \
  '{"operation":"modulo","operands":["1","2"]}' 400 UNKNOWN_OPERATION
check_error "wrong operand count" POST "$CALC" \
  '{"operation":"add","operands":["1"]}' 400 INVALID_OPERAND_COUNT
check_error "invalid operand" POST "$CALC" \
  '{"operation":"add","operands":["abc","1"]}' 400 INVALID_OPERAND
check_error "exponent notation operand" POST "$CALC" \
  '{"operation":"add","operands":["1e3","1"]}' 400 INVALID_OPERAND

echo "== 405 wrong method"
check_error "GET on calculate" GET "$CALC" "" 405 METHOD_NOT_ALLOWED "POST"
check_error "POST on health" POST "$BASE_URL/health" "" 405 METHOD_NOT_ALLOWED "GET, HEAD"
check_error "POST on operations" POST "$BASE_URL/api/v1/operations" "" 405 METHOD_NOT_ALLOWED "GET, HEAD"

echo "== 413 body limit (1 KB)"
{
  printf '{"operation":"add","operands":["1","2"],"pad":"'
  head -c 2000 /dev/zero | tr '\0' 'x'
  printf '"}'
} >"$tmp/big.json"
printf '%s%984s' "$VALID" '' >"$tmp/at-limit.json"
printf '%s%985s' "$VALID" '' >"$tmp/over-limit.json"
check_error "2000 byte body" POST "$CALC" "@$tmp/big.json" 413 PAYLOAD_TOO_LARGE
check_error "1025 byte body" POST "$CALC" "@$tmp/over-limit.json" 413 PAYLOAD_TOO_LARGE
check_exact "1024 byte body is accepted" POST "$CALC" "@$tmp/at-limit.json" 200 \
  '{"operation":"add","operands":["1","2"],"result":"3"}'

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
