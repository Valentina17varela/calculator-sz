package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

func postCalculate(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(body))
	rec := httptest.NewRecorder()
	NewRouter(calc.NewService()).ServeHTTP(rec, req)
	return rec
}

func assertErrorResponse(t *testing.T, rec *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if rec.Code != status {
		t.Errorf("status = %d, want %d (body %s)", rec.Code, status, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q", got, "application/json")
	}
	env := decodeEnvelope(t, rec)
	if env.Error.Code != code {
		t.Errorf("code = %q, want %q", env.Error.Code, code)
	}
	if env.Error.Message == "" {
		t.Error("message is empty")
	}
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want string
	}{
		{
			"add",
			`{"operation":"add","operands":["0.1","0.2"]}`,
			`{"operation":"add","operands":["0.1","0.2"],"result":"0.3"}`,
		},
		{
			"subtract",
			`{"operation":"subtract","operands":["0","0.1"]}`,
			`{"operation":"subtract","operands":["0","0.1"],"result":"-0.1"}`,
		},
		{
			"multiply",
			`{"operation":"multiply","operands":["1.5","1.5"]}`,
			`{"operation":"multiply","operands":["1.5","1.5"],"result":"2.25"}`,
		},
		{
			"divide",
			`{"operation":"divide","operands":["10","4"]}`,
			`{"operation":"divide","operands":["10","4"],"result":"2.5"}`,
		},
		{
			"power",
			`{"operation":"power","operands":["2","10"]}`,
			`{"operation":"power","operands":["2","10"],"result":"1024"}`,
		},
		{
			"sqrt",
			`{"operation":"sqrt","operands":["16"]}`,
			`{"operation":"sqrt","operands":["16"],"result":"4"}`,
		},
		{
			"percent",
			`{"operation":"percent","operands":["15","200"]}`,
			`{"operation":"percent","operands":["15","200"],"result":"30"}`,
		},
		{
			"surrounding whitespace and newline",
			" \n{\"operation\":\"add\",\"operands\":[\"1\",\"2\"]}\n ",
			`{"operation":"add","operands":["1","2"],"result":"3"}`,
		},
		{
			"field order does not matter",
			`{"operands":["1","2"],"operation":"add"}`,
			`{"operation":"add","operands":["1","2"],"result":"3"}`,
		},
		{
			"operands are echoed as sent",
			`{"operation":"add","operands":["007","-0"]}`,
			`{"operation":"add","operands":["007","-0"],"result":"7"}`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postCalculate(t, tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200 (body %s)", rec.Code, rec.Body.String())
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("Content-Type = %q, want %q", got, "application/json")
			}
			if got := strings.TrimSpace(rec.Body.String()); got != tt.want {
				t.Errorf("body = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestCalculateInvalidJSON(t *testing.T) {
	valid := `{"operation":"add","operands":["1","2"]}`
	tests := []struct {
		name string
		body string
	}{
		{"empty body", ""},
		{"only whitespace", "  \n"},
		{"truncated", `{"operation":"add"`},
		{"not json", "not json"},
		{"unknown field", `{"operation":"add","operands":["1","2"],"extra":1}`},
		{"two objects", valid + valid},
		{"trailing garbage", valid + " x"},
		{"trailing brace", valid + "}"},
		{"operands as numbers", `{"operation":"add","operands":[1,2]}`},
		{"operands not an array", `{"operation":"add","operands":"1"}`},
		{"operation as number", `{"operation":5,"operands":["1","2"]}`},
		{"array body", `[]`},
		{"string body", `"add"`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertErrorResponse(t, postCalculate(t, tt.body), http.StatusBadRequest, "INVALID_JSON")
		})
	}
}

func TestCalculateBadRequest(t *testing.T) {
	tests := []struct {
		name string
		body string
		code string
	}{
		{"unknown operation", `{"operation":"modulo","operands":["1","2"]}`, "UNKNOWN_OPERATION"},
		{"missing operation", `{"operands":["1","2"]}`, "UNKNOWN_OPERATION"},
		{"empty operation", `{"operation":"","operands":["1","2"]}`, "UNKNOWN_OPERATION"},
		{"operation is case sensitive", `{"operation":"ADD","operands":["1","2"]}`, "UNKNOWN_OPERATION"},
		{"too few operands", `{"operation":"add","operands":["1"]}`, "INVALID_OPERAND_COUNT"},
		{"too many operands", `{"operation":"add","operands":["1","2","3"]}`, "INVALID_OPERAND_COUNT"},
		{"unary with two operands", `{"operation":"sqrt","operands":["4","4"]}`, "INVALID_OPERAND_COUNT"},
		{"empty operands", `{"operation":"add","operands":[]}`, "INVALID_OPERAND_COUNT"},
		{"missing operands", `{"operation":"add"}`, "INVALID_OPERAND_COUNT"},
		{"null operands", `{"operation":"add","operands":null}`, "INVALID_OPERAND_COUNT"},
		{"letters", `{"operation":"add","operands":["abc","1"]}`, "INVALID_OPERAND"},
		{"exponent notation", `{"operation":"add","operands":["1","1e3"]}`, "INVALID_OPERAND"},
		{"empty operand", `{"operation":"sqrt","operands":[""]}`, "INVALID_OPERAND"},
		{"trailing dot", `{"operation":"add","operands":["1.","1"]}`, "INVALID_OPERAND"},
		{"leading dot", `{"operation":"add","operands":[".5","1"]}`, "INVALID_OPERAND"},
		{"plus sign", `{"operation":"add","operands":["+1","1"]}`, "INVALID_OPERAND"},
		{"null operand", `{"operation":"add","operands":[null,"1"]}`, "INVALID_OPERAND"},
		{
			"operand over 32 chars",
			`{"operation":"add","operands":["` + strings.Repeat("1", 33) + `","1"]}`,
			"INVALID_OPERAND",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertErrorResponse(t, postCalculate(t, tt.body), http.StatusBadRequest, tt.code)
		})
	}
}

func TestCalculateUnprocessable(t *testing.T) {
	tests := []struct {
		name string
		body string
		code string
	}{
		{"division by zero", `{"operation":"divide","operands":["1","0"]}`, "DIVISION_BY_ZERO"},
		{"zero to negative power", `{"operation":"power","operands":["0","-1"]}`, "DIVISION_BY_ZERO"},
		{"negative square root", `{"operation":"sqrt","operands":["-1"]}`, "NEGATIVE_SQUARE_ROOT"},
		{"non integer exponent", `{"operation":"power","operands":["2","0.5"]}`, "NON_INTEGER_EXPONENT"},
		{"exponent out of range", `{"operation":"power","operands":["2","101"]}`, "OUT_OF_RANGE"},
		{
			"result out of range",
			`{"operation":"power","operands":["` + strings.Repeat("9", 32) + `","100"]}`,
			"OUT_OF_RANGE",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertErrorResponse(t, postCalculate(t, tt.body), http.StatusUnprocessableEntity, tt.code)
		})
	}
}

func TestCalculateDivisionByZeroEnvelope(t *testing.T) {
	rec := postCalculate(t, `{"operation":"divide","operands":["1","0"]}`)

	want := `{"error":{"code":"DIVISION_BY_ZERO","message":"cannot divide by zero"}}`
	if got := strings.TrimSpace(rec.Body.String()); got != want {
		t.Errorf("body = %s, want %s", got, want)
	}
}

func TestCalculateBodyTooLarge(t *testing.T) {
	body := `{"operation":"add","operands":["1","2"]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(body))
	rec := httptest.NewRecorder()
	req.Body = http.MaxBytesReader(rec, req.Body, 16)

	NewRouter(calc.NewService()).ServeHTTP(rec, req)

	assertErrorResponse(t, rec, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE")
}

func TestCalculateBodyTooLargeAfterValidValue(t *testing.T) {
	valid := `{"operation":"add","operands":["1","2"]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(valid+strings.Repeat(" ", 100)))
	rec := httptest.NewRecorder()
	req.Body = http.MaxBytesReader(rec, req.Body, int64(len(valid)+10))

	NewRouter(calc.NewService()).ServeHTTP(rec, req)

	assertErrorResponse(t, rec, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE")
}
