export interface TranscriptChunk {
  start: number; // in seconds
  duration: number; // in seconds
  text: string;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  channel: string;
  duration: number;
  url: string;
  hasTranscript: boolean;
  thumbnailUrl?: string;
}

export type NoteSource = 'transcript' | 'visual' | 'merged' | 'manual' | 'ai';
export type ThemeMode = 'dark' | 'light';
export type ViewMode = 'timeline' | 'outline';

export interface ScribeNote {
  id: string;
  videoId: string;
  timestamp: number; // in seconds
  timestampFormatted: string; // e.g. "12:34"
  title: string;
  text: string;
  bulletPoints?: string[];
  codeSnippet?: string;
  codeLanguage?: string;
  diagramDescription?: string;
  tags?: string[];
  source: NoteSource;
  frameThumbnail?: string; // base64 thumbnail if visual note
  createdAt: number;
}

export interface RecentVideoSession {
  videoId: string;
  title: string;
  channel: string;
  noteCount: number;
  lastWatched: number;
  url: string;
}

export interface GenerateNotesRequest {
  videoId: string;
  videoTitle: string;
  chunks: TranscriptChunk[];
}

export interface GenerateNotesResponse {
  notes: Array<{
    timestamp: number;
    title: string;
    text: string;
    bulletPoints?: string[];
    codeSnippet?: string;
    codeLanguage?: string;
    tags?: string[];
    type: string;
  }>;
}

export interface AnalyzeFrameRequest {
  videoId: string;
  timestamp: number;
  image: string; // base64 data URL
  spokenContext?: string;
}

export interface AnalyzeFrameResponse {
  timestamp: number;
  visualSummary: string;
  bulletPoints?: string[];
  codeSnippet?: string;
  codeLanguage?: string;
  diagramDescription?: string;
  detectedElements: string[]; // ['slide', 'code', 'diagram', 'handwriting', 'terminal']
}

export interface MergeNotesRequest {
  videoId: string;
  videoTitle: string;
  timestamp: number;
  transcriptText: string;
  visualAnalysis: AnalyzeFrameResponse;
}

export interface MergeNotesResponse {
  note: {
    timestamp: number;
    title: string;
    text: string;
    bulletPoints?: string[];
    codeSnippet?: string;
    codeLanguage?: string;
    diagramDescription?: string;
    tags?: string[];
  };
}

export interface AskAIRequest {
  videoId: string;
  videoTitle: string;
  timestamp: number;
  userPrompt: string;
  transcriptText?: string;
  image?: string;
}

export interface AskAIResponse {
  note: {
    timestamp: number;
    title: string;
    text: string;
    bulletPoints?: string[];
    codeSnippet?: string;
    codeLanguage?: string;
    diagramDescription?: string;
    tags?: string[];
  };
}

export interface ExtensionSettings {
  backendUrl: string;
  autoCapture: boolean;
  captureIntervalSeconds: number;
  llmProvider: 'openai' | 'claude' | 'gemini';
  autoScroll: boolean;
  showCodePreview: boolean;
  theme: ThemeMode;
}

import { ENV_BACKEND_URL } from '../config';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendUrl: ENV_BACKEND_URL,
  autoCapture: true,
  captureIntervalSeconds: 25,
  llmProvider: 'gemini',
  autoScroll: true,
  showCodePreview: true,
  theme: 'dark',
};
