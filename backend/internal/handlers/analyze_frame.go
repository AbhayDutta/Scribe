package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"scribe-backend/internal/llm"
	"scribe-backend/internal/models"
)

type AnalyzeFrameHandler struct {
	llmClient    llm.LLMClient
	sessionGuard *SessionGuard
}

func NewAnalyzeFrameHandler(llmClient llm.LLMClient, sessionGuard *SessionGuard) *AnalyzeFrameHandler {
	return &AnalyzeFrameHandler{
		llmClient:    llmClient,
		sessionGuard: sessionGuard,
	}
}

func (h *AnalyzeFrameHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.AnalyzeFrameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.Image == "" {
		http.Error(w, "Missing image data", http.StatusBadRequest)
		return
	}

	if h.sessionGuard != nil && req.VideoID != "" {
		if _, err := h.sessionGuard.RecordAndCheck(req.VideoID); err != nil {
			log.Printf("[AnalyzeFrame] %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error":   "session_limit_reached",
				"message": err.Error(),
			})
			return
		}
	}

	log.Printf("[AnalyzeFrame] Analyzing video frame for '%s' at timestamp %.1fs", req.VideoID, req.Timestamp)

	resp, err := h.llmClient.AnalyzeFrame(r.Context(), req)
	if err != nil {
		log.Printf("[AnalyzeFrame] Error analyzing frame: %v", err)
		http.Error(w, "Failed to analyze frame: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
