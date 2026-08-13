package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"scribe-backend/internal/llm"
	"scribe-backend/internal/models"
)

type MergeNotesHandler struct {
	llmClient llm.LLMClient
}

func NewMergeNotesHandler(llmClient llm.LLMClient) *MergeNotesHandler {
	return &MergeNotesHandler{llmClient: llmClient}
}

func (h *MergeNotesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.MergeNotesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body: "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("[MergeNotes] Synthesizing transcript & visual signals for '%s' at %.1fs", req.VideoID, req.Timestamp)

	resp, err := h.llmClient.MergeNotes(r.Context(), req)
	if err != nil {
		log.Printf("[MergeNotes] Error merging notes: %v", err)
		http.Error(w, "Failed to merge notes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
