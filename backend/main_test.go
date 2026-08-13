package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"scribe-backend/internal/config"
	"scribe-backend/internal/handlers"
	"scribe-backend/internal/llm"
	"scribe-backend/internal/models"
	"testing"
)

func setupTestServer() http.Handler {
	cfg := &config.Config{
		Port:                "8080",
		LLMProvider:         "mock",
		AllowedOrigins:      "*",
		RateLimitRPM:        60,
		MaxFramesPerSession: 5,
	}
	mockClient := llm.NewMockClient()
	rateLimiter := handlers.NewRateLimiter(cfg.RateLimitRPM)
	sessionGuard := handlers.NewSessionGuard(cfg.MaxFramesPerSession)

	mux := http.NewServeMux()
	mux.Handle("/health", handlers.NewHealthHandler(cfg, mockClient))
	mux.Handle("/generate-notes", handlers.NewGenerateNotesHandler(mockClient))
	mux.Handle("/analyze-frame", handlers.NewAnalyzeFrameHandler(mockClient, sessionGuard))
	mux.Handle("/merge-notes", handlers.NewMergeNotesHandler(mockClient))
	mux.Handle("/ask-ai", handlers.NewAskAIHandler(mockClient))

	securityMiddleware := handlers.SecurityAndLoggingMiddleware(cfg.AllowedOrigins)
	rateLimitMiddleware := handlers.RateLimitMiddleware(rateLimiter)

	return securityMiddleware(rateLimitMiddleware(mux))
}

func TestHealthEndpoint(t *testing.T) {
	handler := setupTestServer()
	req := httptest.NewRequest("GET", "/health", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp models.HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != "online" {
		t.Errorf("expected status 'online', got '%s'", resp.Status)
	}
}

func TestGenerateNotesEndpoint(t *testing.T) {
	handler := setupTestServer()

	reqBody := models.GenerateNotesRequest{
		VideoID:    "test1234",
		VideoTitle: "Operating Systems Lecture: Goals of OS",
		Chunks: []models.TranscriptChunk{
			{Start: 0, Duration: 5, Text: "Today we discuss the goals of an operating system."},
			{Start: 5, Duration: 6, Text: "The primary goals are convenience, efficiency, and reliability."},
			{Start: 11, Duration: 7, Text: "Convenience provides a user-friendly abstraction layer."},
			{Start: 18, Duration: 8, Text: "Efficiency ensures optimal hardware and CPU utilization."},
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/generate-notes", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var resp models.GenerateNotesResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if len(resp.Notes) == 0 {
		t.Errorf("expected at least 1 note, got 0")
	}

	t.Logf("Generated %d notes successfully.", len(resp.Notes))
}

func TestAskAIEndpoint(t *testing.T) {
	handler := setupTestServer()

	reqBody := models.AskAIRequest{
		VideoID:        "test1234",
		VideoTitle:     "Goals of Operating System",
		Timestamp:      38.5,
		UserPrompt:     "Explain the 6 goals of OS with bullet points and examples",
		TranscriptText: "Convenience, Efficiency, Portability, Reliability, Scalability, Robustness",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/ask-ai", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var resp models.AskAIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if len(resp.Note.BulletPoints) == 0 {
		t.Errorf("expected bullet points in note, got 0")
	}
}

func TestSessionGuardCap(t *testing.T) {
	mockClient := llm.NewMockClient()
	sessionGuard := handlers.NewSessionGuard(2)
	handler := handlers.NewAnalyzeFrameHandler(mockClient, sessionGuard)

	reqBody := models.AnalyzeFrameRequest{
		VideoID:   "limited_video_1",
		Timestamp: 10.0,
		Image:     "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
	}
	bodyBytes, _ := json.Marshal(reqBody)

	// Call 1: OK
	req1 := httptest.NewRequest("POST", "/analyze-frame", bytes.NewReader(bodyBytes))
	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusOK {
		t.Fatalf("expected call 1 to succeed, got %d", rec1.Code)
	}

	// Call 2: OK
	req2 := httptest.NewRequest("POST", "/analyze-frame", bytes.NewReader(bodyBytes))
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("expected call 2 to succeed, got %d", rec2.Code)
	}

	// Call 3: Exceeded Limit -> 429
	req3 := httptest.NewRequest("POST", "/analyze-frame", bytes.NewReader(bodyBytes))
	rec3 := httptest.NewRecorder()
	handler.ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusTooManyRequests {
		t.Fatalf("expected call 3 to return 429, got %d", rec3.Code)
	}
}
