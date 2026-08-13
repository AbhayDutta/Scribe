package handlers

import (
	"log"
	"net/http"
	"time"
)

type statusResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *statusResponseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

// SecurityAndLoggingMiddleware sets CORS headers, enforces 10MB max body, and logs requests
func SecurityAndLoggingMiddleware(allowedOrigins string) func(http.Handler) http.Handler {
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigins)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Client-ID")
			w.Header().Set("Access-Control-Max-Age", "86400")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			// Enforce 10MB maximum payload size limit on incoming requests to prevent DOS
			if r.Body != nil && r.Method == http.MethodPost {
				r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
			}

			start := time.Now()
			wrappedWriter := &statusResponseWriter{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			next.ServeHTTP(wrappedWriter, r)

			duration := time.Since(start)
			log.Printf("[%s] %s %d (%v) - %s", r.Method, r.URL.Path, wrappedWriter.statusCode, duration, getClientKey(r))
		})
	}
}

// EnableCORS is a backward-compatible wrapper
func EnableCORS(next http.Handler) http.Handler {
	return SecurityAndLoggingMiddleware("*")(next)
}
