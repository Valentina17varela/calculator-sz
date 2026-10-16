package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

// NewRouter wires the API routes and middleware to the given calculation service.
func NewRouter(svc *calc.Service) http.Handler {
	return withMiddleware(slog.Default(), newMux(svc))
}

func newMux(svc *calc.Service) *http.ServeMux {
	h := &handler{svc: svc}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", h.calculate)
	mux.HandleFunc("GET /api/v1/operations", h.operations)
	mux.HandleFunc("GET /health", h.health)

	// Method-less patterns are less specific, so they only catch other methods.
	mux.HandleFunc("/api/v1/calculate", methodNotAllowed("POST"))
	mux.HandleFunc("/api/v1/operations", methodNotAllowed("GET, HEAD"))
	mux.HandleFunc("/health", methodNotAllowed("GET, HEAD"))
	return mux
}
