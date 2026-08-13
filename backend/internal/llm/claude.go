package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"scribe-backend/internal/models"
	"strings"
	"time"
)

type ClaudeClient struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewClaudeClient(apiKey, model string) *ClaudeClient {
	if model == "" {
		model = "claude-3-5-sonnet-20241022"
	}
	return &ClaudeClient{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (c *ClaudeClient) ProviderName() string {
	return fmt.Sprintf("claude (%s)", c.model)
}

type claudeContentBlock struct {
	Type   string             `json:"type"`
	Text   string             `json:"text,omitempty"`
	Source *claudeImageSource `json:"source,omitempty"`
}

type claudeImageSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type"`
	Data      string `json:"data"`
}

type claudeMessage struct {
	Role    string               `json:"role"`
	Content []claudeContentBlock `json:"content"`
}

type claudeRequest struct {
	Model       string          `json:"model"`
	MaxTokens   int             `json:"max_tokens"`
	System      string          `json:"system"`
	Messages    []claudeMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
}

type claudeResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *ClaudeClient) GenerateNotes(ctx context.Context, req models.GenerateNotesRequest) (*models.GenerateNotesResponse, error) {
	userPrompt := BuildTranscriptUserPrompt(req.VideoTitle, req.Chunks) + "\n\nRespond with ONLY valid raw JSON."

	claudeReq := claudeRequest{
		Model:     c.model,
		MaxTokens: 4000,
		System:    SystemPromptTranscriptNotes,
		Messages: []claudeMessage{
			{
				Role: "user",
				Content: []claudeContentBlock{
					{Type: "text", Text: userPrompt},
				},
			},
		},
		Temperature: 0.2,
	}

	rawText, err := c.doRequest(ctx, claudeReq)
	if err != nil {
		return nil, err
	}

	cleaned := extractJSONBlock(rawText)
	var resp models.GenerateNotesResponse
	if err := json.Unmarshal([]byte(cleaned), &resp); err != nil {
		return nil, fmt.Errorf("failed to parse Claude JSON response: %w (content: %s)", err, rawText)
	}

	return &resp, nil
}

func (c *ClaudeClient) AnalyzeFrame(ctx context.Context, req models.AnalyzeFrameRequest) (*models.AnalyzeFrameResponse, error) {
	mediaType, base64Data := parseDataURL(req.Image)

	content := []claudeContentBlock{
		{
			Type: "image",
			Source: &claudeImageSource{
				Type:      "base64",
				MediaType: mediaType,
				Data:      base64Data,
			},
		},
		{
			Type: "text",
			Text: fmt.Sprintf("Analyze this lecture screenshot at timestamp %.1fs. Extract slide headers, bullet points, and code. Spoken context: %s\nReturn ONLY valid JSON.", req.Timestamp, req.SpokenContext),
		},
	}

	claudeReq := claudeRequest{
		Model:     c.model,
		MaxTokens: 2000,
		System:    SystemPromptVisionAnalysis,
		Messages: []claudeMessage{
			{
				Role:    "user",
				Content: content,
			},
		},
		Temperature: 0.2,
	}

	rawText, err := c.doRequest(ctx, claudeReq)
	if err != nil {
		return nil, err
	}

	cleaned := extractJSONBlock(rawText)
	var analysis models.AnalyzeFrameResponse
	if err := json.Unmarshal([]byte(cleaned), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse Claude vision JSON: %w (content: %s)", err, rawText)
	}
	analysis.Timestamp = req.Timestamp

	return &analysis, nil
}

func (c *ClaudeClient) MergeNotes(ctx context.Context, req models.MergeNotesRequest) (*models.MergeNotesResponse, error) {
	visJSON, _ := json.Marshal(req.VisualAnalysis)

	userPrompt := fmt.Sprintf(`Video Title: %s
Timestamp: %.1fs
Spoken Transcript: "%s"

Visual Screen Analysis:
%s

Synthesize spoken audio + visual screen into one cohesive developer/study note. Return ONLY valid JSON.`, req.VideoTitle, req.Timestamp, req.TranscriptText, string(visJSON))

	claudeReq := claudeRequest{
		Model:     c.model,
		MaxTokens: 2000,
		System:    SystemPromptMergeNotes,
		Messages: []claudeMessage{
			{
				Role: "user",
				Content: []claudeContentBlock{
					{Type: "text", Text: userPrompt},
				},
			},
		},
		Temperature: 0.2,
	}

	rawText, err := c.doRequest(ctx, claudeReq)
	if err != nil {
		return nil, err
	}

	cleaned := extractJSONBlock(rawText)
	var resp models.MergeNotesResponse
	if err := json.Unmarshal([]byte(cleaned), &resp); err != nil {
		return nil, fmt.Errorf("failed to parse Claude merge JSON: %w (content: %s)", err, rawText)
	}
	resp.Note.Timestamp = req.Timestamp

	return &resp, nil
}

func (c *ClaudeClient) AskAI(ctx context.Context, req models.AskAIRequest) (*models.AskAIResponse, error) {
	var content []claudeContentBlock

	if req.Image != "" {
		mediaType, base64Data := parseDataURL(req.Image)
		content = append(content, claudeContentBlock{
			Type: "image",
			Source: &claudeImageSource{
				Type:      "base64",
				MediaType: mediaType,
				Data:      base64Data,
			},
		})
	}

	promptText := fmt.Sprintf("Video Title: %s\nTimestamp: %.1fs\nSpoken Context: %s\n\nUser Instruction: %s\n\nReturn ONLY valid JSON.", req.VideoTitle, req.Timestamp, req.TranscriptText, req.UserPrompt)
	content = append(content, claudeContentBlock{
		Type: "text",
		Text: promptText,
	})

	claudeReq := claudeRequest{
		Model:     c.model,
		MaxTokens: 2500,
		System:    SystemPromptAskAI,
		Messages: []claudeMessage{
			{Role: "user", Content: content},
		},
		Temperature: 0.3,
	}

	rawText, err := c.doRequest(ctx, claudeReq)
	if err != nil {
		return nil, err
	}

	cleaned := extractJSONBlock(rawText)
	var note models.NoteItem
	if err := json.Unmarshal([]byte(cleaned), &note); err != nil {
		return nil, fmt.Errorf("failed to parse Claude AskAI JSON: %w", err)
	}
	note.Timestamp = req.Timestamp

	return &models.AskAIResponse{Note: note}, nil
}

func (c *ClaudeClient) doRequest(ctx context.Context, body claudeRequest) (string, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	maxRetries := 2
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(bodyBytes))
		if err != nil {
			return "", err
		}

		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("x-api-key", c.apiKey)
		httpReq.Header.Set("anthropic-version", "2023-06-01")

		httpResp, err := c.httpClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("Anthropic HTTP error: %w", err)
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
			lastErr = fmt.Errorf("Anthropic API error %d: %s", httpResp.StatusCode, string(respBytes))
			if attempt < maxRetries {
				time.Sleep(time.Duration(1<<attempt*1000) * time.Millisecond)
				continue
			}
			return "", lastErr
		}

		if httpResp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("Anthropic API error %d: %s", httpResp.StatusCode, string(respBytes))
		}

		var parsed claudeResponse
		if err := json.Unmarshal(respBytes, &parsed); err != nil {
			return "", fmt.Errorf("failed to decode Anthropic response JSON: %w", err)
		}

		if parsed.Error != nil {
			return "", fmt.Errorf("Anthropic error: %s", parsed.Error.Message)
		}

		for _, block := range parsed.Content {
			if block.Type == "text" {
				return block.Text, nil
			}
		}

		return "", fmt.Errorf("no text content in Anthropic response")
	}

	return "", lastErr
}

func parseDataURL(dataURL string) (mediaType string, base64Data string) {
	if strings.HasPrefix(dataURL, "data:") {
		parts := strings.SplitN(dataURL, ",", 2)
		if len(parts) == 2 {
			meta := parts[0]
			base64Data = parts[1]
			if strings.Contains(meta, "image/png") {
				return "image/png", base64Data
			}
			if strings.Contains(meta, "image/webp") {
				return "image/webp", base64Data
			}
			return "image/jpeg", base64Data
		}
	}
	return "image/jpeg", dataURL
}

func extractJSONBlock(s string) string {
	s = strings.TrimSpace(s)
	re := regexp.MustCompile("(?s)```(?:json)?\\s*(.+?)\\s*```")
	matches := re.FindStringSubmatch(s)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	return s
}
