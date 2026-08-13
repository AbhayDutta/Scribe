package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"
)

type clientVisitor struct {
	tokens     float64
	lastSeen   time.Time
	maxTokens  float64
	refillRate float64 // tokens per second
}

// RateLimiter implements a thread-safe token bucket rate limiter per client IP
type RateLimiter struct {
	mu         sync.Mutex
	visitors   map[string]*clientVisitor
	rateRPM    int
	maxTokens  float64
	refillRate float64
}

func NewRateLimiter(rateRPM int) *RateLimiter {
	if rateRPM <= 0 {
		rateRPM = 30
	}
	rl := &RateLimiter{
		visitors:   make(map[string]*clientVisitor),
		rateRPM:    rateRPM,
		maxTokens:  float64(rateRPM),
		refillRate: float64(rateRPM) / 60.0,
	}

	// Periodic cleanup of stale visitor records (every 3 minutes)
	go rl.cleanupRoutine()

	return rl
}

func (rl *RateLimiter) Allow(clientKey string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	v, exists := rl.visitors[clientKey]
	if !exists {
		rl.visitors[clientKey] = &clientVisitor{
			tokens:     rl.maxTokens - 1,
			lastSeen:   now,
			maxTokens:  rl.maxTokens,
			refillRate: rl.refillRate,
		}
		return true
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(v.lastSeen).Seconds()
	v.lastSeen = now
	v.tokens += elapsed * v.refillRate
	if v.tokens > v.maxTokens {
		v.tokens = v.maxTokens
	}

	if v.tokens >= 1.0 {
		v.tokens -= 1.0
		return true
	}

	return false
}

func (rl *RateLimiter) cleanupRoutine() {
	ticker := time.NewTicker(3 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-5 * time.Minute)
		for ip, v := range rl.visitors {
			if v.lastSeen.Before(cutoff) {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func RateLimitMiddleware(rl *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Health checks bypass rate limiting
			if r.URL.Path == "/health" || r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			clientKey := getClientKey(r)
			if !rl.Allow(clientKey) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "30")
				w.WriteHeader(http.StatusTooManyRequests)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error":   "rate_limit_exceeded",
					"message": "Too many requests. Please wait a few seconds before trying again.",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func getClientKey(r *http.Request) string {
	// Check custom header if provided
	if clientID := r.Header.Get("X-Client-ID"); clientID != "" {
		return clientID
	}

	// Check X-Forwarded-For (if behind reverse proxy like Render/Railway)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}

	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return xrip
	}

	// Fallback to RemoteAddr (strip port)
	parts := strings.Split(r.RemoteAddr, ":")
	if len(parts) > 0 {
		return parts[0]
	}

	return r.RemoteAddr
}
