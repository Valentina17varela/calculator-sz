package httpapi

import (
	"bytes"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

const maxBodyBytes = 1024

// withMiddleware wraps next with request logging, panic recovery and the body
// size limit. Logging is outermost so a recovered panic is logged as a 500.
func withMiddleware(logger *slog.Logger, next http.Handler) http.Handler {
	return logRequests(logger, recoverPanics(logger, limitBody(maxBodyBytes, next)))
}

type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (s *statusRecorder) WriteHeader(code int) {
	if !s.wroteHeader {
		s.status = code
		s.wroteHeader = true
	}
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	s.wroteHeader = true
	return s.ResponseWriter.Write(b)
}

func logRequests(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rec, r)

		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration", time.Since(start),
		)
	})
}

func recoverPanics(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			p := recover()
			if p == nil {
				return
			}
			if p == http.ErrAbortHandler {
				panic(p)
			}
			logger.Error("panic recovered", "panic", p, "stack", string(debug.Stack()))
			writeError(w, http.StatusInternalServerError, codeInternalError, internalErrorMessage)
		}()
		next.ServeHTTP(w, r)
	})
}

// limitBody reads the whole body up front, so an oversized request is always
// a 413 and never a parse error found earlier in the stream.
func limitBody(limit int64, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, limit))
		if err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				writeError(w, http.StatusRequestEntityTooLarge, calc.CodePayloadTooLarge, "request body is too large")
				return
			}
			writeError(w, http.StatusBadRequest, calc.CodeInvalidJSON, "could not read request body")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))
		next.ServeHTTP(w, r)
	})
}
