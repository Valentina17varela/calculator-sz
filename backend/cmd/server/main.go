package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Valentina17varela/sezzle-calculator/backend/internal/calc"
	"github.com/Valentina17varela/sezzle-calculator/backend/internal/httpapi"
)

const (
	defaultPort       = "8080"
	readHeaderTimeout = 5 * time.Second
	readTimeout       = 10 * time.Second
	writeTimeout      = 10 * time.Second
	idleTimeout       = 60 * time.Second
	shutdownTimeout   = 5 * time.Second
)

func main() {
	if err := run(); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           httpapi.NewRouter(calc.NewService()),
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		slog.Info("server listening", "addr", srv.Addr)
		serveErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	// Restore default signal handling so a second Ctrl-C kills the process.
	stop()
	slog.Info("shutting down", "timeout", shutdownTimeout)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	err := srv.Shutdown(shutdownCtx)
	if errors.Is(err, context.DeadlineExceeded) {
		slog.Warn("forced shutdown, closing open connections", "timeout", shutdownTimeout)
		return srv.Close()
	}
	return err
}
