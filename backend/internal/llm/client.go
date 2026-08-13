package llm

import (
	"context"
	"fmt"
	"log"
	"scribe-backend/internal/config"
	"scribe-backend/internal/models"
)

type LLMClient interface {
	GenerateNotes(ctx context.Context, req models.GenerateNotesRequest) (*models.GenerateNotesResponse, error)
	AnalyzeFrame(ctx context.Context, req models.AnalyzeFrameRequest) (*models.AnalyzeFrameResponse, error)
	MergeNotes(ctx context.Context, req models.MergeNotesRequest) (*models.MergeNotesResponse, error)
	AskAI(ctx context.Context, req models.AskAIRequest) (*models.AskAIResponse, error)
	ProviderName() string
}

func NewClient(cfg *config.Config) LLMClient {
	switch cfg.LLMProvider {
	case "claude", "anthropic":
		if cfg.AnthropicAPIKey != "" {
			log.Printf("[LLM] Initializing Anthropic Claude client with model: %s", cfg.ModelName)
			return NewClaudeClient(cfg.AnthropicAPIKey, cfg.ModelName)
		}
	case "gemini", "google":
		if cfg.GeminiAPIKey != "" {
			log.Printf("[LLM] Initializing Google Gemini client with model: %s", cfg.ModelName)
			return NewGeminiClient(cfg.GeminiAPIKey, cfg.ModelName)
		}
	case "openai":
		if cfg.OpenAIAPIKey != "" {
			log.Printf("[LLM] Initializing OpenAI client with model: %s", cfg.ModelName)
			return NewOpenAIClient(cfg.OpenAIAPIKey, cfg.ModelName)
		}
	}

	// Auto-fallback: check any available key
	if cfg.OpenAIAPIKey != "" {
		return NewOpenAIClient(cfg.OpenAIAPIKey, "gpt-4o-mini")
	}
	if cfg.AnthropicAPIKey != "" {
		return NewClaudeClient(cfg.AnthropicAPIKey, "claude-3-5-sonnet-20241022")
	}
	if cfg.GeminiAPIKey != "" {
		return NewGeminiClient(cfg.GeminiAPIKey, "gemini-1.5-flash")
	}

	fmt.Println("[LLM] No API key detected in .env. Initializing intelligent heuristic mock client.")
	return NewMockClient()
}
