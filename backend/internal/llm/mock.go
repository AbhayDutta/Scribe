package llm

import (
	"context"
	"fmt"
	"scribe-backend/internal/models"
	"strings"
	"time"
)

type MockClient struct{}

func NewMockClient() *MockClient {
	return &MockClient{}
}

func (m *MockClient) ProviderName() string {
	return "mock (demo mode)"
}

func (m *MockClient) GenerateNotes(ctx context.Context, req models.GenerateNotesRequest) (*models.GenerateNotesResponse, error) {
	time.Sleep(300 * time.Millisecond)

	notes := make([]models.NoteItem, 0)
	if len(req.Chunks) == 0 {
		return &models.GenerateNotesResponse{Notes: notes}, nil
	}

	for i := 0; i < len(req.Chunks); i += 4 {
		chunk := req.Chunks[i]
		var combinedText strings.Builder
		for j := i; j < i+4 && j < len(req.Chunks); j++ {
			combinedText.WriteString(req.Chunks[j].Text)
			combinedText.WriteString(" ")
		}

		text := strings.TrimSpace(combinedText.String())
		title, bullets := generateMockSlideTopic(text)
		codeSnippet, codeLang := extractCodeHints(text)

		notes = append(notes, models.NoteItem{
			Timestamp:    chunk.Start,
			Title:        title,
			Text:         fmt.Sprintf("Explanation: %s", text),
			BulletPoints: bullets,
			CodeSnippet:  codeSnippet,
			CodeLanguage: codeLang,
			Tags:         []string{"lecture", "notes", "concepts"},
			Type:         "slide",
		})
	}

	return &models.GenerateNotesResponse{Notes: notes}, nil
}

func (m *MockClient) AnalyzeFrame(ctx context.Context, req models.AnalyzeFrameRequest) (*models.AnalyzeFrameResponse, error) {
	time.Sleep(200 * time.Millisecond)

	return &models.AnalyzeFrameResponse{
		Timestamp:     req.Timestamp,
		VisualSummary: "Slide presentation showing core technical concepts and goals.",
		BulletPoints: []string{
			"Convenience (User-friendly interface & hardware abstraction)",
			"Efficiency (Optimal resource allocation for CPU and memory)",
			"Portability (Hardware independence)",
			"Reliability (Fault tolerance & error handling)",
			"Scalability (Performance across varying workloads)",
			"Robustness (System stability)",
		},
		CodeSnippet:        "",
		CodeLanguage:       "",
		DiagramDescription: "Hierarchy diagram showing Application layer interacting with OS kernel and Hardware.",
		DetectedElements:   []string{"slide", "diagram"},
	}, nil
}

func (m *MockClient) MergeNotes(ctx context.Context, req models.MergeNotesRequest) (*models.MergeNotesResponse, error) {
	time.Sleep(200 * time.Millisecond)

	title := "Goals of Operating System"
	bullets := req.VisualAnalysis.BulletPoints
	if len(bullets) == 0 {
		bullets = []string{
			"Convenience (User-friendly interface)",
			"Efficiency (Maximizing throughput & CPU utilization)",
			"Portability (Cross-platform compatibility)",
			"Reliability & Fault tolerance",
		}
	}

	return &models.MergeNotesResponse{
		Note: models.NoteItem{
			Timestamp:    req.Timestamp,
			Title:        title,
			Text:         fmt.Sprintf("The instructor discusses the primary objectives of operating systems, balancing user accessibility with hardware efficiency. Spoken Context: %s", req.TranscriptText),
			BulletPoints: bullets,
			CodeSnippet:  req.VisualAnalysis.CodeSnippet,
			CodeLanguage: req.VisualAnalysis.CodeLanguage,
			Tags:         []string{"operating-systems", "goals", "system-design"},
			Type:         "slide",
		},
	}, nil
}

func (m *MockClient) AskAI(ctx context.Context, req models.AskAIRequest) (*models.AskAIResponse, error) {
	time.Sleep(300 * time.Millisecond)

	title := fmt.Sprintf("AI Response: %s", req.UserPrompt)
	if len(title) > 60 {
		title = title[:60] + "..."
	}

	return &models.AskAIResponse{
		Note: models.NoteItem{
			Timestamp: req.Timestamp,
			Title:     title,
			Text:      fmt.Sprintf("Based on your prompt '%s', here is the detailed breakdown:\n\nIn operating systems, the primary goals dictate architectural trade-offs between user convenience (GUIs, high-level abstractions) and raw system efficiency (kernel scheduling, minimal overhead).", req.UserPrompt),
			BulletPoints: []string{
				"Convenience: Simplifies program execution and shields users from complex register/hardware manipulation.",
				"Efficiency: Ensures CPU, RAM, and I/O devices are utilized with minimal idle cycles.",
				"Trade-off: High convenience may introduce abstraction overhead, while maximum efficiency requires lower-level hardware control.",
			},
			CodeSnippet:  "",
			CodeLanguage: "",
			Tags:         []string{"ai-assisted", "custom-note", "operating-systems"},
			Type:         "concept",
		},
	}, nil
}

func generateMockSlideTopic(text string) (string, []string) {
	lower := strings.ToLower(text)
	if strings.Contains(lower, "goal") || strings.Contains(lower, "os") || strings.Contains(lower, "operating") {
		return "Goals of Operating System", []string{
			"Convenience (User-friendly interface)",
			"Efficiency (Resource allocation)",
			"Portability (Hardware independence)",
			"Reliability & Robustness",
		}
	}
	if strings.Contains(lower, "thread") || strings.Contains(lower, "process") || strings.Contains(lower, "concurrency") {
		return "Process Management & Concurrency", []string{
			"Process Control Block (PCB) structure",
			"Context Switching overhead",
			"Thread vs Process memory layout",
		}
	}
	if strings.Contains(lower, "memory") || strings.Contains(lower, "virtual") || strings.Contains(lower, "page") {
		return "Virtual Memory & Paging", []string{
			"Page tables & Translation Lookaside Buffer (TLB)",
			"Demand paging & page fault handling",
			"Page replacement algorithms (LRU, FIFO)",
		}
	}

	return "Core Concept & Key Objectives", []string{
		"Key architectural principles discussed",
		"Implementation trade-offs and performance characteristics",
	}
}

func extractCodeHints(text string) (string, string) {
	lower := strings.ToLower(text)
	if strings.Contains(lower, "c") && (strings.Contains(lower, "fork") || strings.Contains(lower, "exec") || strings.Contains(lower, "pid")) {
		return "pid_t pid = fork();\nif (pid == 0) {\n    printf(\"Child process\\n\");\n}", "c"
	}
	return "", ""
}
