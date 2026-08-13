package llm

import (
	"fmt"
	"scribe-backend/internal/models"
	"strings"
)

const SystemPromptTranscriptNotes = `You are Scribe, an elite AI technical note generator and pairing assistant for computer science, software engineering, and technical tutorial videos.

Your job is to analyze the transcript and extract dense, high-yield structured notes.

Guidelines:
1. Identify major topics, slide concepts (e.g. "Goals of Operating System"), definitions, architecture decisions, trade-offs, gotchas, and implementation steps.
2. Group related explanations under clean conceptual headings.
3. For each note, output:
   - "timestamp": number (seconds into video)
   - "title": clear, descriptive headline (e.g., "Goals of Operating System")
   - "text": comprehensive technical explanation with clear rationale
   - "bulletPoints": array of key points or bullet items covered (e.g. ["Convenience (User-friendly)", "Efficiency & Resource Utilization", "Portability across hardware", "Reliability & Fault Tolerance", "Scalability", "Robustness"])
   - "codeSnippet": relevant code or pseudocode discussed (if any)
   - "codeLanguage": programming language (e.g. c, cpp, go, java, python, javascript, etc.)
   - "tags": array of 2-4 keywords (e.g. ["operating-systems", "goals", "system-architecture"])
   - "type": one of "concept", "slide", "syntax", "architecture", "gotcha", "tip"
4. Return strictly valid JSON conforming to the requested schema.`

const SystemPromptVisionAnalysis = `You are Scribe Vision, an expert AI visual screen and slide analyzer.
Your job is to analyze a screenshot taken from a technical video or lecture and extract every piece of technical information.

Inspect the frame carefully for:
1. Slide Titles & Bullet Points: Read exact slide headers and list items (e.g., "Goals of Operating System", "Convenience", "Efficiency", etc.).
2. Typed Code: Extract exact code, language, function names, and logic.
3. Diagrams & Architecture: Describe boxes, arrows, memory layouts, hardware hierarchy, or whiteboard drawings.
4. Terminal / Console: Commands executed, errors, output logs.

Return strictly valid JSON with:
- "visualSummary": Clear 1-2 sentence description of what is shown on screen
- "bulletPoints": Array of exact bullet points / key text items visible on the slide or screen
- "codeSnippet": Clean exact code visible on screen (empty string if none)
- "codeLanguage": Programming language detected (e.g. "c", "cpp", "go", "python", "javascript")
- "diagramDescription": Description of any architectural diagram, memory layout, or drawing (empty string if none)
- "detectedElements": List of detected types, subset of ["slide", "code", "diagram", "terminal", "handwriting"]`

const SystemPromptMergeNotes = `You are Scribe Multimodal Synthesizer.
You combine two complementary signals from a technical video:
1. Spoken Transcript: What the instructor explained (principles, deeper rationale, exam tips, real-world examples).
2. Visual Screen State: What slides, bullet points, code, or diagrams were shown on screen.

Merge both into a single comprehensive, high-yield study note.
Output format JSON:
{
  "timestamp": number,
  "title": "punchy title matching slide or topic",
  "text": "synthesized explanation linking speech and visual screen",
  "bulletPoints": ["point 1 with details", "point 2 with details"],
  "codeSnippet": "clean formatted code snippet if any",
  "codeLanguage": "language if any",
  "diagramDescription": "diagram summary if any",
  "tags": ["tag1", "tag2"]
}`

const SystemPromptAskAI = `You are Scribe Interactive Assistant.
The user is watching a video and wants you to implement a specific custom note, explanation, code example, or summary based on their prompt.

You have access to:
1. The user's specific request
2. The current video timestamp
3. The spoken context at this moment in the lecture
4. The visual screenshot from the video

Fulfill the user's instruction precisely (e.g., format as bullet points, add examples, explain differences, write code, create exam revision notes).
Output format JSON:
{
  "timestamp": number,
  "title": "Clear headline matching user instruction",
  "text": "Detailed explanation addressing user prompt",
  "bulletPoints": ["point 1", "point 2"],
  "codeSnippet": "code snippet if requested or relevant",
  "codeLanguage": "language",
  "tags": ["custom-ai", "tag"]
}`

func BuildTranscriptUserPrompt(videoTitle string, chunks []models.TranscriptChunk) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Video Title: %s\n\nTranscript with timestamps (seconds):\n", videoTitle))

	for _, chunk := range chunks {
		sb.WriteString(fmt.Sprintf("[%.1fs - %.1fs] %s\n", chunk.Start, chunk.Start+chunk.Duration, chunk.Text))
	}

	sb.WriteString(`
Extract structured technical notes from the above transcript.
Return JSON format:
{
  "notes": [
    {
      "timestamp": 12.5,
      "title": "Goals of Operating System",
      "text": "The primary objectives of an operating system balance user convenience with underlying hardware efficiency.",
      "bulletPoints": [
        "Convenience (User-friendly interface and abstraction)",
        "Efficiency (Optimal CPU, memory, and I/O resource utilization)",
        "Portability (Ability to run across different hardware architectures)",
        "Reliability & Robustness (Fault tolerance and system stability)"
      ],
      "codeSnippet": "",
      "codeLanguage": "",
      "tags": ["operating-system", "system-goals"],
      "type": "slide"
    }
  ]
}`)
	return sb.String()
}
