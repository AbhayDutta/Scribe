package models

// TranscriptChunk represents a single timed snippet from YouTube captions
type TranscriptChunk struct {
	Start    float64 `json:"start"`
	Duration float64 `json:"duration"`
	Text     string  `json:"text"`
}

// NoteItem is a structured coding tutorial / technical note
type NoteItem struct {
	Timestamp          float64  `json:"timestamp"`
	Title              string   `json:"title"`
	Text               string   `json:"text"`
	BulletPoints       []string `json:"bulletPoints,omitempty"`
	CodeSnippet        string   `json:"codeSnippet,omitempty"`
	CodeLanguage       string   `json:"codeLanguage,omitempty"`
	DiagramDescription string   `json:"diagramDescription,omitempty"`
	Tags               []string `json:"tags,omitempty"`
	Type               string   `json:"type,omitempty"` // concept, syntax, architecture, gotcha, tip, slide
}

// GenerateNotesRequest contains chunks to synthesize
type GenerateNotesRequest struct {
	VideoID    string            `json:"videoId"`
	VideoTitle string            `json:"videoTitle"`
	Chunks     []TranscriptChunk `json:"chunks"`
}

// GenerateNotesResponse returns generated notes
type GenerateNotesResponse struct {
	Notes []NoteItem `json:"notes"`
}

// AnalyzeFrameRequest contains a captured screen frame
type AnalyzeFrameRequest struct {
	VideoID       string  `json:"videoId"`
	Timestamp     float64 `json:"timestamp"`
	Image         string  `json:"image"` // base64 data URL
	SpokenContext string  `json:"spokenContext,omitempty"`
}

// AnalyzeFrameResponse contains visual analysis results
type AnalyzeFrameResponse struct {
	Timestamp          float64  `json:"timestamp"`
	VisualSummary      string   `json:"visualSummary"`
	BulletPoints       []string `json:"bulletPoints,omitempty"`
	CodeSnippet        string   `json:"codeSnippet,omitempty"`
	CodeLanguage       string   `json:"codeLanguage,omitempty"`
	DiagramDescription string   `json:"diagramDescription,omitempty"`
	DetectedElements   []string `json:"detectedElements"` // code, slide, diagram, terminal, handwriting
}

// MergeNotesRequest contains both spoken transcript and visual context
type MergeNotesRequest struct {
	VideoID        string               `json:"videoId"`
	VideoTitle     string               `json:"videoTitle"`
	Timestamp      float64              `json:"timestamp"`
	TranscriptText string               `json:"transcriptText"`
	VisualAnalysis AnalyzeFrameResponse `json:"visualAnalysis"`
}

// MergeNotesResponse returns the synthesized multimodal note
type MergeNotesResponse struct {
	Note NoteItem `json:"note"`
}

// AskAIRequest allows users to prompt the AI to add/refine specific notes
type AskAIRequest struct {
	VideoID        string  `json:"videoId"`
	VideoTitle     string  `json:"videoTitle"`
	Timestamp      float64 `json:"timestamp"`
	UserPrompt     string  `json:"userPrompt"`
	TranscriptText string  `json:"transcriptText,omitempty"`
	Image          string  `json:"image,omitempty"` // base64 screenshot
}

// AskAIResponse returns the custom AI generated note
type AskAIResponse struct {
	Note NoteItem `json:"note"`
}

// HealthResponse returns server status
type HealthResponse struct {
	Status    string `json:"status"`
	Provider  string `json:"provider"`
	Model     string `json:"model"`
	HasAPIKey bool   `json:"hasApiKey"`
	Version   string `json:"version"`
}
