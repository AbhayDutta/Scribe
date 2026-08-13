package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"scribe-backend/internal/models"
	"strings"
	"time"
)

type OpenAIClient struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewOpenAIClient(apiKey, model string) *OpenAIClient {
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAIClient{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (c *OpenAIClient) ProviderName() string {
	return fmt.Sprintf("openai (%s)", c.model)
}

type openAIChatMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type openAIChatRequest struct {
	Model          string              `json:"model"`
	Messages       []openAIChatMessage `json:"messages"`
	ResponseFormat *responseFormat     `json:"response_format,omitempty"`
	Temperature    float64             `json:"temperature"`
}

type responseFormat struct {
	Type string `json:"type"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *OpenAIClient) GenerateNotes(ctx context.Context, req models.GenerateNotesRequest) (*models.GenerateNotesResponse, error) {
	userContent := BuildTranscriptUserPrompt(req.VideoTitle, req.Chunks)

	chatReq := openAIChatRequest{
		Model: c.model,
		Messages: []openAIChatMessage{
			{Role: "system", Content: SystemPromptTranscriptNotes},
			{Role: "user", Content: userContent},
		},
		ResponseFormat: &responseFormat{Type: "json_object"},
		Temperature:    0.2,
	}

	rawResp, err := c.doRequest(ctx, chatReq)
	if err != nil {
		return nil, err
	}

	var resp models.GenerateNotesResponse
	if err := json.Unmarshal([]byte(rawResp), &resp); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI JSON response: %w (content: %s)", err, rawResp)
	}

	return &resp, nil
}

func (c *OpenAIClient) AnalyzeFrame(ctx context.Context, req models.AnalyzeFrameRequest) (*models.AnalyzeFrameResponse, error) {
	imageUrl := req.Image
	if !strings.HasPrefix(imageUrl, "data:image") {
		imageUrl = "data:image/jpeg;base64," + imageUrl
	}

	userContent := []map[string]interface{}{
		{
			"type": "text",
			"text": fmt.Sprintf("Analyze this lecture/coding screenshot at timestamp %.1fs. Extract slide headers, bullet points, and code.\nSpoken context: %s", req.Timestamp, req.SpokenContext),
		},
		{
			"type": "image_url",
			"image_url": map[string]string{
				"url":    imageUrl,
				"detail": "high",
			},
		},
	}

	chatReq := openAIChatRequest{
		Model: c.model,
		Messages: []openAIChatMessage{
			{Role: "system", Content: SystemPromptVisionAnalysis},
			{Role: "user", Content: userContent},
		},
		ResponseFormat: &responseFormat{Type: "json_object"},
		Temperature:    0.2,
	}

	rawResp, err := c.doRequest(ctx, chatReq)
	if err != nil {
		return nil, err
	}

	var analysis models.AnalyzeFrameResponse
	if err := json.Unmarshal([]byte(rawResp), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI vision response: %w", err)
	}
	analysis.Timestamp = req.Timestamp

	return &analysis, nil
}

func (c *OpenAIClient) MergeNotes(ctx context.Context, req models.MergeNotesRequest) (*models.MergeNotesResponse, error) {
	visJSON, _ := json.Marshal(req.VisualAnalysis)

	userPrompt := fmt.Sprintf(`Video Title: %s
Timestamp: %.1fs
Spoken Transcript: "%s"

Visual Screen Analysis:
%s

Synthesize spoken audio + visual screen into one cohesive developer/study note.`, req.VideoTitle, req.Timestamp, req.TranscriptText, string(visJSON))

	chatReq := openAIChatRequest{
		Model: c.model,
		Messages: []openAIChatMessage{
			{Role: "system", Content: SystemPromptMergeNotes},
			{Role: "user", Content: userPrompt},
		},
		ResponseFormat: &responseFormat{Type: "json_object"},
		Temperature:    0.2,
	}

	rawResp, err := c.doRequest(ctx, chatReq)
	if err != nil {
		return nil, err
	}

	var resp models.MergeNotesResponse
	if err := json.Unmarshal([]byte(rawResp), &resp); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI merge response: %w", err)
	}
	resp.Note.Timestamp = req.Timestamp

	return &resp, nil
}

func (c *OpenAIClient) AskAI(ctx context.Context, req models.AskAIRequest) (*models.AskAIResponse, error) {
	var userContent interface{}

	if req.Image != "" {
		imageUrl := req.Image
		if !strings.HasPrefix(imageUrl, "data:image") {
			imageUrl = "data:image/jpeg;base64," + imageUrl
		}

		userContent = []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Video Title: %s\nTimestamp: %.1fs\nSpoken Context: %s\n\nUser Instruction: %s", req.VideoTitle, req.Timestamp, req.TranscriptText, req.UserPrompt),
			},
			{
				"type": "image_url",
				"image_url": map[string]string{
					"url":    imageUrl,
					"detail": "high",
				},
			},
		}
	} else {
		userContent = fmt.Sprintf("Video Title: %s\nTimestamp: %.1fs\nSpoken Context: %s\n\nUser Instruction: %s", req.VideoTitle, req.Timestamp, req.TranscriptText, req.UserPrompt)
	}

	chatReq := openAIChatRequest{
		Model: c.model,
		Messages: []openAIChatMessage{
			{Role: "system", Content: SystemPromptAskAI},
			{Role: "user", Content: userContent},
		},
		ResponseFormat: &responseFormat{Type: "json_object"},
		Temperature:    0.3,
	}

	rawResp, err := c.doRequest(ctx, chatReq)
	if err != nil {
		return nil, err
	}

	var note models.NoteItem
	if err := json.Unmarshal([]byte(rawResp), &note); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI AskAI response: %w", err)
	}
	note.Timestamp = req.Timestamp

	return &models.AskAIResponse{Note: note}, nil
}

func (c *OpenAIClient) doRequest(ctx context.Context, body openAIChatRequest) (string, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	maxRetries := 2
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
		if err != nil {
			return "", err
		}

		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

		httpResp, err := c.httpClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("OpenAI HTTP error: %w", err)
			if attempt < maxRetries {
				time.Sleep(time.Duration(1<<attempt*600) * time.Millisecond)
				continue
			}
			return "", lastErr
		}

		respBytes, err := io.ReadAll(httpResp.Body)
		httpResp.Body.Close()
		if err != nil {
			lastErr = err
			if attempt < maxRetries {
				time.Sleep(time.Duration(1<<attempt*600) * time.Millisecond)
				continue
			}
			return "", lastErr
		}

		if httpResp.StatusCode == http.StatusTooManyRequests || httpResp.StatusCode >= 500 {
			lastErr = fmt.Errorf("OpenAI API returned error %d: %s", httpResp.StatusCode, string(respBytes))
			if attempt < maxRetries {
				time.Sleep(time.Duration(1<<attempt*1000) * time.Millisecond)
				continue
			}
			return "", lastErr
		}

		if httpResp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("OpenAI API returned error %d: %s", httpResp.StatusCode, string(respBytes))
		}

		var parsed openAIChatResponse
		if err := json.Unmarshal(respBytes, &parsed); err != nil {
			return "", fmt.Errorf("failed to decode response JSON: %w", err)
		}

		if parsed.Error != nil {
			return "", fmt.Errorf("OpenAI error: %s", parsed.Error.Message)
		}

		if len(parsed.Choices) == 0 {
			return "", fmt.Errorf("OpenAI returned no choices")
		}

		return parsed.Choices[0].Message.Content, nil
	}

	return "", lastErr
}
