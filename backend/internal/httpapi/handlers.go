package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
)

type handler struct {
	svc *calc.Service
}

type calculateRequest struct {
	Operation string   `json:"operation"`
	Operands  []string `json:"operands"`
}

type calculateResponse struct {
	Operation string   `json:"operation"`
	Operands  []string `json:"operands"`
	Result    string   `json:"result"`
}

func (h *handler) calculate(w http.ResponseWriter, r *http.Request) {
	var req calculateRequest
	if err := decodeBody(r, &req); err != nil {
		writeCalcError(w, err)
		return
	}

	result, err := h.svc.Calculate(req.Operation, req.Operands)
	if err != nil {
		writeCalcError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, calculateResponse{
		Operation: req.Operation,
		Operands:  req.Operands,
		Result:    result,
	})
}

// decodeBody reads exactly one JSON value into dst and rejects unknown fields.
func decodeBody(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return bodyError(err)
	}

	var extra json.RawMessage
	err := dec.Decode(&extra)
	if err == io.EOF {
		return nil
	}
	if err == nil {
		err = errors.New("unexpected data after JSON value")
	}
	return bodyError(err)
}

func bodyError(err error) *calc.Error {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return &calc.Error{Code: calc.CodePayloadTooLarge, Message: "request body is too large"}
	}
	return &calc.Error{
		Code:    calc.CodeInvalidJSON,
		Message: "request body must be a single JSON object with a string operation and string operands",
	}
}

type operationItem struct {
	Name  string `json:"name"`
	Arity int    `json:"arity"`
}

type operationsResponse struct {
	Operations []operationItem `json:"operations"`
}

type healthResponse struct {
	Status string `json:"status"`
}

func (h *handler) operations(w http.ResponseWriter, r *http.Request) {
	infos := h.svc.Operations()
	items := make([]operationItem, len(infos))
	for i, info := range infos {
		items[i] = operationItem{Name: info.Name, Arity: info.Arity}
	}
	writeJSON(w, http.StatusOK, operationsResponse{Operations: items})
}

func (h *handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}

// methodNotAllowed answers any method not registered for a known path.
func methodNotAllowed(allow string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Allow", allow)
		writeError(w, http.StatusMethodNotAllowed, calc.CodeMethodNotAllowed, "method not allowed")
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
