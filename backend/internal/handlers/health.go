package handlers

import (
	"encoding/json"
	"net/http"
	"scribe-backend/internal/config"
	"scribe-backend/internal/llm"
	"scribe-backend/internal/models"
)

type HealthHandler struct {
	cfg       *config.Config
	llmClient llm.LLMClient
}

func NewHealthHandler(cfg *config.Config, llmClient llm.LLMClient) *HealthHandler {
	return &HealthHandler{
		cfg:       cfg,
		llmClient: llmClient,
	}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	hasKey := (h.cfg.OpenAIAPIKey != "" || h.cfg.AnthropicAPIKey != "" || h.cfg.GeminiAPIKey != "")

	resp := models.HealthResponse{
		Status:    "online",
		Provider:  h.llmClient.ProviderName(),
		Model:     h.cfg.ModelName,
		HasAPIKey: hasKey,
		Version:   "1.0.0",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
