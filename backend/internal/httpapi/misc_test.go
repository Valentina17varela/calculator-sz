package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

func doRequest(t *testing.T, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	rec := httptest.NewRecorder()
	NewRouter(calc.NewService()).ServeHTTP(rec, req)
	return rec
}

func TestOperationsList(t *testing.T) {
	rec := doRequest(t, http.MethodGet, "/api/v1/operations")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body %s)", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q", got, "application/json")
	}
	want := `{"operations":[` +
		`{"name":"add","arity":2},` +
		`{"name":"divide","arity":2},` +
		`{"name":"multiply","arity":2},` +
		`{"name":"percent","arity":2},` +
		`{"name":"power","arity":2},` +
		`{"name":"sqrt","arity":1},` +
		`{"name":"subtract","arity":2}` +
		`]}`
	if got := strings.TrimSpace(rec.Body.String()); got != want {
		t.Errorf("body = %s, want %s", got, want)
	}
}

func TestHealthOK(t *testing.T) {
	rec := doRequest(t, http.MethodGet, "/health")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q", got, "application/json")
	}
	if got := strings.TrimSpace(rec.Body.String()); got != `{"status":"ok"}` {
		t.Errorf("body = %s, want %s", got, `{"status":"ok"}`)
	}
}

func TestHealthHead(t *testing.T) {
	rec := doRequest(t, http.MethodHead, "/health")

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
}

func TestMethodNotAllowed(t *testing.T) {
	tests := []struct {
		method string
		path   string
		allow  string
	}{
		{http.MethodPost, "/health", "GET, HEAD"},
		{http.MethodPut, "/health", "GET, HEAD"},
		{http.MethodDelete, "/health", "GET, HEAD"},
		{http.MethodPost, "/api/v1/operations", "GET, HEAD"},
		{http.MethodPatch, "/api/v1/operations", "GET, HEAD"},
		{http.MethodGet, "/api/v1/calculate", "POST"},
		{http.MethodPut, "/api/v1/calculate", "POST"},
		{http.MethodDelete, "/api/v1/calculate", "POST"},
	}
	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			rec := doRequest(t, tt.method, tt.path)

			assertErrorResponse(t, rec, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED")
			if got := rec.Header().Get("Allow"); got != tt.allow {
				t.Errorf("Allow = %q, want %q", got, tt.allow)
			}
		})
	}
}
