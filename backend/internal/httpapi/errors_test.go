package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

type envelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func decodeEnvelope(t *testing.T, rec *httptest.ResponseRecorder) envelope {
	t.Helper()
	var env envelope
	dec := json.NewDecoder(strings.NewReader(rec.Body.String()))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&env); err != nil {
		t.Fatalf("body %q is not a valid error envelope: %v", rec.Body.String(), err)
	}
	return env
}

func TestWriteError(t *testing.T) {
	rec := httptest.NewRecorder()

	writeError(rec, http.StatusUnprocessableEntity, calc.CodeDivisionByZero, "cannot divide by zero")

	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q", got, "application/json")
	}
	want := `{"error":{"code":"DIVISION_BY_ZERO","message":"cannot divide by zero"}}`
	if got := strings.TrimSpace(rec.Body.String()); got != want {
		t.Errorf("body = %s, want %s", got, want)
	}
}

func TestWriteErrorEscapesMessage(t *testing.T) {
	rec := httptest.NewRecorder()

	writeError(rec, http.StatusBadRequest, calc.CodeUnknownOperation, `unknown operation "x"`)

	env := decodeEnvelope(t, rec)
	if env.Error.Message != `unknown operation "x"` {
		t.Errorf("message = %q, want %q", env.Error.Message, `unknown operation "x"`)
	}
}

func TestStatusForErrorCodes(t *testing.T) {
	tests := []struct {
		code calc.Code
		want int
	}{
		{calc.CodeInvalidJSON, http.StatusBadRequest},
		{calc.CodeUnknownOperation, http.StatusBadRequest},
		{calc.CodeInvalidOperandCount, http.StatusBadRequest},
		{calc.CodeInvalidOperand, http.StatusBadRequest},
		{calc.CodeDivisionByZero, http.StatusUnprocessableEntity},
		{calc.CodeNegativeSquareRoot, http.StatusUnprocessableEntity},
		{calc.CodeNonIntegerExponent, http.StatusUnprocessableEntity},
		{calc.CodeOutOfRange, http.StatusUnprocessableEntity},
		{calc.CodeMethodNotAllowed, http.StatusMethodNotAllowed},
		{calc.CodePayloadTooLarge, http.StatusRequestEntityTooLarge},
		{codeInternalError, http.StatusInternalServerError},
		{calc.Code("SOMETHING_ELSE"), http.StatusInternalServerError},
		{calc.Code(""), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(string(tt.code), func(t *testing.T) {
			if got := statusFor(tt.code); got != tt.want {
				t.Errorf("statusFor(%q) = %d, want %d", tt.code, got, tt.want)
			}
		})
	}
}

func TestWriteCalcError(t *testing.T) {
	tests := []struct {
		name    string
		err     error
		status  int
		code    string
		message string
	}{
		{
			"division by zero",
			&calc.Error{Code: calc.CodeDivisionByZero, Message: "cannot divide by zero"},
			http.StatusUnprocessableEntity, "DIVISION_BY_ZERO", "cannot divide by zero",
		},
		{
			"invalid operand",
			&calc.Error{Code: calc.CodeInvalidOperand, Message: "operand 1 is not a valid decimal number"},
			http.StatusBadRequest, "INVALID_OPERAND", "operand 1 is not a valid decimal number",
		},
		{
			"unknown operation",
			&calc.Error{Code: calc.CodeUnknownOperation, Message: `unknown operation "x"`},
			http.StatusBadRequest, "UNKNOWN_OPERATION", `unknown operation "x"`,
		},
		{
			"out of range",
			&calc.Error{Code: calc.CodeOutOfRange, Message: "result is out of range"},
			http.StatusUnprocessableEntity, "OUT_OF_RANGE", "result is out of range",
		},
		{
			"wrapped calc error keeps its own code and message",
			fmt.Errorf("handler: %w", &calc.Error{Code: calc.CodeNegativeSquareRoot, Message: "negative"}),
			http.StatusUnprocessableEntity, "NEGATIVE_SQUARE_ROOT", "negative",
		},
		{
			"plain error becomes internal error",
			errors.New("boom"),
			http.StatusInternalServerError, "INTERNAL_ERROR", internalErrorMessage,
		},
		{
			"calc error with unmapped code becomes internal error",
			&calc.Error{Code: calc.Code("WEIRD"), Message: "boom"},
			http.StatusInternalServerError, "INTERNAL_ERROR", internalErrorMessage,
		},
		{
			"calc error carrying internal code stays generic",
			&calc.Error{Code: codeInternalError, Message: "boom"},
			http.StatusInternalServerError, "INTERNAL_ERROR", internalErrorMessage,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()

			writeCalcError(rec, tt.err)

			if rec.Code != tt.status {
				t.Errorf("status = %d, want %d", rec.Code, tt.status)
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("Content-Type = %q, want %q", got, "application/json")
			}
			env := decodeEnvelope(t, rec)
			if env.Error.Code != tt.code {
				t.Errorf("code = %q, want %q", env.Error.Code, tt.code)
			}
			if env.Error.Message != tt.message {
				t.Errorf("message = %q, want %q", env.Error.Message, tt.message)
			}
		})
	}
}

func TestWriteCalcErrorDoesNotLeakDetails(t *testing.T) {
	const secret = "dsn=postgres://user:hunter2@db"
	errs := map[string]error{
		"plain error":       errors.New(secret),
		"wrapped plain":     fmt.Errorf("query failed: %w", errors.New(secret)),
		"unmapped calc err": &calc.Error{Code: calc.Code("WEIRD"), Message: secret},
	}
	for name, err := range errs {
		t.Run(name, func(t *testing.T) {
			rec := httptest.NewRecorder()

			writeCalcError(rec, err)

			if strings.Contains(rec.Body.String(), "hunter2") {
				t.Errorf("response leaks error details: %s", rec.Body.String())
			}
			if rec.Code != http.StatusInternalServerError {
				t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
			}
		})
	}
}
