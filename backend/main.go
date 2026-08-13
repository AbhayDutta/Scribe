package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"scribe-backend/internal/config"
	"scribe-backend/internal/handlers"
	"scribe-backend/internal/llm"
	"syscall"
	"time"
)

func main() {
	cfg := config.LoadConfig()
	llmClient := llm.NewClient(cfg)

	rateLimiter := handlers.NewRateLimiter(cfg.RateLimitRPM)
	sessionGuard := handlers.NewSessionGuard(cfg.MaxFramesPerSession)

	mux := http.NewServeMux()

	// Register API endpoints
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"service":   "Scribe Backend API",
			"status":    "online",
			"provider":  llmClient.ProviderName(),
			"version":   "1.0.0",
			"endpoints": []string{"/health", "/generate-notes", "/analyze-frame", "/merge-notes", "/ask-ai"},
			"docs":      "https://github.com/AbhayDutta/Scribe",
		})
	})
	mux.Handle("/health", handlers.NewHealthHandler(cfg, llmClient))
	mux.Handle("/generate-notes", handlers.NewGenerateNotesHandler(llmClient))
	mux.Handle("/analyze-frame", handlers.NewAnalyzeFrameHandler(llmClient, sessionGuard))
	mux.Handle("/merge-notes", handlers.NewMergeNotesHandler(llmClient))
	mux.Handle("/ask-ai", handlers.NewAskAIHandler(llmClient))

	// Chain middleware: Security/CORS/10MB max -> Rate Limiter -> Handler
	securityMiddleware := handlers.SecurityAndLoggingMiddleware(cfg.AllowedOrigins)
	rateLimitMiddleware := handlers.RateLimitMiddleware(rateLimiter)

	handler := securityMiddleware(rateLimitMiddleware(mux))

	addr := fmt.Sprintf(":%s", cfg.Port)

	printBanner(cfg, llmClient.ProviderName())

	server := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Graceful shutdown listener
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-stopChan
	log.Println("[Scribe] Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("[Scribe] Server shutdown error: %v", err)
	} else {
		log.Println("[Scribe] Server stopped cleanly.")
	}
}

func printBanner(cfg *config.Config, provider string) {
	fmt.Println("=========================================================")
	fmt.Println("   Scribe Backend — AI Video Note Generation Engine")
	fmt.Println("=========================================================")
	fmt.Printf(" [✓] Server listening on port :%s\n", cfg.Port)
	fmt.Printf(" [✓] Active LLM Provider: %s\n", provider)
	fmt.Printf(" [✓] Rate Limit: %d req/min per client IP\n", cfg.RateLimitRPM)
	fmt.Printf(" [✓] Session Frame Cap: %d frames/video\n", cfg.MaxFramesPerSession)
	if cfg.OpenAIAPIKey == "" && cfg.AnthropicAPIKey == "" && cfg.GeminiAPIKey == "" {
		fmt.Println(" [!] Note: No API keys configured in .env (running with mock fallback).")
		fmt.Println("     To configure real LLM APIs, copy .env.example to .env and add your key.")
	} else {
		fmt.Println(" [✓] LLM API credentials loaded.")
	}
	fmt.Println("=========================================================")
}
