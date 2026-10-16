package httpapi

import (
	"net/http"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

// NewRouter wires the API routes to the given calculation service.
func NewRouter(svc *calc.Service) http.Handler {
	h := &handler{svc: svc}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", h.calculate)
	return mux
}
