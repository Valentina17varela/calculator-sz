package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"testing/iotest"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func newTestLogger() (*slog.Logger, *syncBuffer) {
	logs := &syncBuffer{}
	return slog.New(slog.NewJSONHandler(logs, nil)), logs
}

func logEntries(t *testing.T, logs *syncBuffer) []map[string]any {
	t.Helper()
	var entries []map[string]any
	for _, line := range strings.Split(strings.TrimSpace(logs.String()), "\n") {
		if line == "" {
			continue
		}
		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			t.Fatalf("log line %q is not JSON: %v", line, err)
		}
		entries = append(entries, entry)
	}
	return entries
}

func requestEntries(t *testing.T, logs *syncBuffer) []map[string]any {
	t.Helper()
	var out []map[string]any
	for _, entry := range logEntries(t, logs) {
		if entry["msg"] == "request" {
			out = append(out, entry)
		}
	}
	return out
}

func panicHandler(value any) http.Handler {
	return http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic(value) })
}

func TestRecoverPanicsReturnsInternalError(t *testing.T) {
	logger, logs := newTestLogger()
	h := recoverPanics(logger, panicHandler("boom-secret"))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	assertErrorResponse(t, rec, http.StatusInternalServerError, "INTERNAL_ERROR")
	if got := decodeEnvelope(t, rec).Error.Message; got != internalErrorMessage {
		t.Errorf("message = %q, want %q", got, internalErrorMessage)
	}
	if strings.Contains(rec.Body.String(), "boom-secret") {
		t.Errorf("response leaks panic value: %s", rec.Body.String())
	}
	out := logs.String()
	if !strings.Contains(out, "panic recovered") || !strings.Contains(out, "boom-secret") {
		t.Errorf("panic not logged: %s", out)
	}
}

func TestRecoverPanicsKeepsServerRunning(t *testing.T) {
	logger, _ := newTestLogger()
	mux := http.NewServeMux()
	mux.Handle("/panic", panicHandler("boom"))
	mux.HandleFunc("/ok", func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("fine")) })
	srv := httptest.NewServer(withMiddleware(logger, mux))
	defer srv.Close()

	resp, err := srv.Client().Get(srv.URL + "/panic")
	if err != nil {
		t.Fatalf("panic request: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("panic status = %d, want 500", resp.StatusCode)
	}

	resp, err = srv.Client().Get(srv.URL + "/ok")
	if err != nil {
		t.Fatalf("request after panic: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK || string(body) != "fine" {
		t.Errorf("after panic got %d %q, want 200 %q", resp.StatusCode, body, "fine")
	}
}

func TestRecoverPanicsRepanicsAbortHandler(t *testing.T) {
	logger, _ := newTestLogger()
	h := recoverPanics(logger, panicHandler(http.ErrAbortHandler))

	defer func() {
		if p := recover(); p != http.ErrAbortHandler {
			t.Errorf("recovered %v, want http.ErrAbortHandler", p)
		}
	}()
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
}

func TestLogRequests(t *testing.T) {
	tests := []struct {
		name    string
		handler http.HandlerFunc
		want    float64
	}{
		{
			"implicit 200 on write",
			func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("ok")) },
			200,
		},
		{
			"implicit 200 without write",
			func(w http.ResponseWriter, r *http.Request) {},
			200,
		},
		{
			"explicit status",
			func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusTeapot) },
			418,
		},
		{
			"first status wins",
			func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusCreated)
				w.WriteHeader(http.StatusInternalServerError)
			},
			201,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger, logs := newTestLogger()
			h := logRequests(logger, tt.handler)

			h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/things?x=1", nil))

			entries := requestEntries(t, logs)
			if len(entries) != 1 {
				t.Fatalf("got %d request log lines, want 1: %s", len(entries), logs.String())
			}
			entry := entries[0]
			if entry["method"] != "POST" {
				t.Errorf("method = %v, want POST", entry["method"])
			}
			if entry["path"] != "/things" {
				t.Errorf("path = %v, want /things", entry["path"])
			}
			if entry["status"] != tt.want {
				t.Errorf("status = %v, want %v", entry["status"], tt.want)
			}
			if d, ok := entry["duration"].(float64); !ok || d < 0 {
				t.Errorf("duration = %v, want a non-negative number", entry["duration"])
			}
		})
	}
}

func TestLogRequestsRecordsPanicAsInternalError(t *testing.T) {
	logger, logs := newTestLogger()
	h := withMiddleware(logger, panicHandler("boom"))

	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/boom", nil))

	entries := requestEntries(t, logs)
	if len(entries) != 1 {
		t.Fatalf("got %d request log lines, want 1: %s", len(entries), logs.String())
	}
	if entries[0]["status"] != float64(500) || entries[0]["path"] != "/boom" {
		t.Errorf("entry = %v, want status 500 for /boom", entries[0])
	}
}

func TestLimitBodyPassesBodyToHandler(t *testing.T) {
	want := strings.Repeat("a", 1024)
	var got string
	h := limitBody(1024, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("handler read: %v", err)
		}
		got = string(b)
	}))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(want)))

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	if got != want {
		t.Errorf("handler saw %d bytes, want %d", len(got), len(want))
	}
}

const validCalculateBody = `{"operation":"add","operands":["1","2"]}`

func paddedBody(size int) string {
	return validCalculateBody + strings.Repeat(" ", size-len(validCalculateBody))
}

func TestLimitBodyRejectsOversize(t *testing.T) {
	tests := []struct {
		name          string
		body          string
		unknownLength bool
	}{
		{"valid json one byte over", paddedBody(1025), false},
		{"valid json well over", paddedBody(4096), false},
		{"invalid json over limit", strings.Repeat("{", 2000), false},
		{"unknown field over limit", `{"pad":"` + strings.Repeat("x", 2000) + `"}`, false},
		{"unknown length", paddedBody(1025), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger, _ := newTestLogger()
			h := withMiddleware(logger, newMux(calc.NewService()))
			req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(tt.body))
			if tt.unknownLength {
				req.ContentLength = -1
			}
			rec := httptest.NewRecorder()

			h.ServeHTTP(rec, req)

			assertErrorResponse(t, rec, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE")
		})
	}
}

func TestLimitBodyAcceptsExactLimit(t *testing.T) {
	logger, _ := newTestLogger()
	h := withMiddleware(logger, newMux(calc.NewService()))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(paddedBody(1024)))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	want := `{"operation":"add","operands":["1","2"],"result":"3"}`
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != want {
		t.Errorf("got %d %s, want 200 %s", rec.Code, rec.Body.String(), want)
	}
}

func TestLimitBodyReadError(t *testing.T) {
	logger, _ := newTestLogger()
	h := withMiddleware(logger, newMux(calc.NewService()))
	body := iotest.ErrReader(errors.New("connection reset"))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", body)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	assertErrorResponse(t, rec, http.StatusBadRequest, "INVALID_JSON")
}

func TestMiddlewareLeavesNormalRequestsAlone(t *testing.T) {
	logger, logs := newTestLogger()
	h := withMiddleware(logger, newMux(calc.NewService()))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(validCalculateBody))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	entries := requestEntries(t, logs)
	if len(entries) != 1 || entries[0]["status"] != float64(200) || entries[0]["path"] != "/api/v1/calculate" {
		t.Errorf("unexpected request log: %s", logs.String())
	}
}
