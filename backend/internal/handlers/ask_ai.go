package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"scribe-backend/internal/llm"
	"scribe-backend/internal/models"
)

type AskAIHandler struct {
	llmClient llm.LLMClient
}

func NewAskAIHandler(llmClient llm.LLMClient) *AskAIHandler {
	return &AskAIHandler{llmClient: llmClient}
}

func (h *AskAIHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.AskAIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.UserPrompt == "" {
		http.Error(w, "userPrompt cannot be empty", http.StatusBadRequest)
		return
	}

	log.Printf("[AskAI] Processing prompt '%s' for video '%s' at %.1fs", req.UserPrompt, req.VideoID, req.Timestamp)

	resp, err := h.llmClient.AskAI(r.Context(), req)
	if err != nil {
		log.Printf("[AskAI] Error generating AI response: %v", err)
		http.Error(w, "Failed to process prompt: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
