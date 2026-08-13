package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"scribe-backend/internal/llm"
	"scribe-backend/internal/models"
)

type GenerateNotesHandler struct {
	llmClient llm.LLMClient
}

func NewGenerateNotesHandler(llmClient llm.LLMClient) *GenerateNotesHandler {
	return &GenerateNotesHandler{llmClient: llmClient}
}

func (h *GenerateNotesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.GenerateNotesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if len(req.Chunks) == 0 {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(models.GenerateNotesResponse{Notes: []models.NoteItem{}})
		return
	}

	log.Printf("[GenerateNotes] Processing %d chunks for video '%s' (ID: %s)", len(req.Chunks), req.VideoTitle, req.VideoID)

	resp, err := h.llmClient.GenerateNotes(r.Context(), req)
	if err != nil {
		log.Printf("[GenerateNotes] Error calling LLM: %v", err)
		http.Error(w, "Failed to generate notes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
