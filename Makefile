.PHONY: dev dev-api dev-web test test-api test-web coverage coverage-api coverage-web lint lint-api lint-web up down smoke

COVERAGE_DIR := $(CURDIR)/docs/coverage
BASE_URL ?= http://localhost:8080

# Backend on :8080 and Vite on :5173 (proxies /api to the backend).
dev:
	$(MAKE) -j2 dev-api dev-web

dev-api:
	cd backend && go run ./cmd/server

dev-web:
	cd frontend && npm run dev

test: test-api test-web

test-api:
	cd backend && go test ./... -race

test-web:
	cd frontend && npm run test -- --run

# Reports are versioned at fixed paths and overwritten on every run.
coverage: coverage-api coverage-web

coverage-api:
	mkdir -p $(COVERAGE_DIR)
	cd backend && go test ./internal/... -race -coverprofile=coverage.out
	cd backend && go tool cover -func=coverage.out
	cd backend && go tool cover -html=coverage.out -o $(COVERAGE_DIR)/backend.html
	rm -f backend/coverage.out

coverage-web:
	cd frontend && npm run test:coverage

lint: lint-api lint-web

lint-api:
	@out="$$(cd backend && gofmt -l .)"; \
	if [ -n "$$out" ]; then echo "gofmt needed on:"; echo "$$out"; exit 1; fi
	cd backend && go vet ./...

lint-web:
	cd frontend && npm run lint

up:
	docker compose up --build -d

down:
	docker compose down

# Runs against a live stack, for example after `make up`.
smoke:
	BASE_URL=$(BASE_URL) backend/scripts/smoke.sh
