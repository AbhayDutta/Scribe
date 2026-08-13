package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"scribe-backend/internal/models"
	"time"
)

type GeminiClient struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewGeminiClient(apiKey, model string) *GeminiClient {
	if model == "" {
		model = "gemini-flash-latest"
	}
	return &GeminiClient{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (c *GeminiClient) ProviderName() string {
	return fmt.Sprintf("gemini (%s)", c.model)
}

type geminiPart struct {
	Text       string            `json:"text,omitempty"`
	InlineData *geminiInlineData `json:"inline_data,omitempty"`
}

type geminiInlineData struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
	Role  string       `json:"role,omitempty"`
}

type geminiRequest struct {
	Contents          []geminiContent `json:"contents"`
	SystemInstruction *geminiContent  `json:"system_instruction,omitempty"`
	GenerationConfig  struct {
		ResponseMimeType string  `json:"response_mime_type,omitempty"`
		Temperature      float64 `json:"temperature"`
	} `json:"generationConfig"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *GeminiClient) GenerateNotes(ctx context.Context, req models.GenerateNotesRequest) (*models.GenerateNotesResponse, error) {
	userPrompt := BuildTranscriptUserPrompt(req.VideoTitle, req.Chunks)

	gReq := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: userPrompt}}},
		},
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: SystemPromptTranscriptNotes}},
		},
	}
	gReq.GenerationConfig.ResponseMimeType = "application/json"
	gReq.GenerationConfig.Temperature = 0.2

	rawText, err := c.doRequest(ctx, gReq)
	if err != nil {
		return nil, err
	}

	var resp models.GenerateNotesResponse
	if err := json.Unmarshal([]byte(rawText), &resp); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini JSON: %w (content: %s)", err, rawText)
	}

	return &resp, nil
}

func (c *GeminiClient) AnalyzeFrame(ctx context.Context, req models.AnalyzeFrameRequest) (*models.AnalyzeFrameResponse, error) {
	mimeType, base64Data := parseDataURL(req.Image)

	gReq := geminiRequest{
		Contents: []geminiContent{
			{
				Parts: []geminiPart{
					{Text: fmt.Sprintf("Analyze this lecture screenshot at timestamp %.1fs. Extract slide headers, bullet points, and code. Spoken context: %s", req.Timestamp, req.SpokenContext)},
					{
						InlineData: &geminiInlineData{
							MimeType: mimeType,
							Data:     base64Data,
						},
					},
				},
			},
		},
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: SystemPromptVisionAnalysis}},
		},
	}
	gReq.GenerationConfig.ResponseMimeType = "application/json"
	gReq.GenerationConfig.Temperature = 0.2

	rawText, err := c.doRequest(ctx, gReq)
	if err != nil {
		return nil, err
	}

	var analysis models.AnalyzeFrameResponse
	if err := json.Unmarshal([]byte(rawText), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini vision JSON: %w (content: %s)", err, rawText)
	}
	analysis.Timestamp = req.Timestamp

	return &analysis, nil
}

func (c *GeminiClient) MergeNotes(ctx context.Context, req models.MergeNotesRequest) (*models.MergeNotesResponse, error) {
	visJSON, _ := json.Marshal(req.VisualAnalysis)

	userPrompt := fmt.Sprintf(`Video Title: %s
Timestamp: %.1fs
Spoken Transcript: "%s"

Visual Screen Analysis:
%s

Synthesize spoken audio + visual screen into one cohesive study note.`, req.VideoTitle, req.Timestamp, req.TranscriptText, string(visJSON))

	gReq := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: userPrompt}}},
		},
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: SystemPromptMergeNotes}},
		},
	}
	gReq.GenerationConfig.ResponseMimeType = "application/json"
	gReq.GenerationConfig.Temperature = 0.2

	rawText, err := c.doRequest(ctx, gReq)
	if err != nil {
		return nil, err
	}

	var resp models.MergeNotesResponse
	if err := json.Unmarshal([]byte(rawText), &resp); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini merge JSON: %w (content: %s)", err, rawText)
	}
	resp.Note.Timestamp = req.Timestamp

	return &resp, nil
}

func (c *GeminiClient) AskAI(ctx context.Context, req models.AskAIRequest) (*models.AskAIResponse, error) {
	parts := []geminiPart{
		{Text: fmt.Sprintf("Video Title: %s\nTimestamp: %.1fs\nSpoken Context: %s\n\nUser Instruction: %s", req.VideoTitle, req.Timestamp, req.TranscriptText, req.UserPrompt)},
	}

	if req.Image != "" {
		mimeType, base64Data := parseDataURL(req.Image)
		parts = append(parts, geminiPart{
			InlineData: &geminiInlineData{
				MimeType: mimeType,
				Data:     base64Data,
			},
		})
	}

	gReq := geminiRequest{
		Contents: []geminiContent{
			{Parts: parts},
		},
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: SystemPromptAskAI}},
		},
	}
	gReq.GenerationConfig.ResponseMimeType = "application/json"
	gReq.GenerationConfig.Temperature = 0.3

	rawText, err := c.doRequest(ctx, gReq)
	if err != nil {
		return nil, err
	}

	var note models.NoteItem
	if err := json.Unmarshal([]byte(rawText), &note); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini AskAI JSON: %w", err)
	}
	note.Timestamp = req.Timestamp

	return &models.AskAIResponse{Note: note}, nil
}

func (c *GeminiClient) doRequest(ctx context.Context, body geminiRequest) (string, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", c.model, c.apiKey)
	maxRetries := 2
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
		if err != nil {
			return "", err
		}
		httpReq.Header.Set("Content-Type", "application/json")

		httpResp, err := c.httpClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("Gemini HTTP error: %w", err)
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
			lastErr = fmt.Errorf("Gemini API error %d: %s", httpResp.StatusCode, string(respBytes))
			if attempt < maxRetries {
				time.Sleep(time.Duration(1<<attempt*1000) * time.Millisecond)
				continue
			}
			return "", lastErr
		}

		if httpResp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("Gemini API error %d: %s", httpResp.StatusCode, string(respBytes))
		}

		var parsed geminiResponse
		if err := json.Unmarshal(respBytes, &parsed); err != nil {
			return "", fmt.Errorf("failed to decode Gemini response: %w", err)
		}

		if parsed.Error != nil {
			return "", fmt.Errorf("Gemini error: %s", parsed.Error.Message)
		}

		if len(parsed.Candidates) > 0 && len(parsed.Candidates[0].Content.Parts) > 0 {
			return parsed.Candidates[0].Content.Parts[0].Text, nil
		}

		return "", fmt.Errorf("no content in Gemini response")
	}

	return "", lastErr
}
