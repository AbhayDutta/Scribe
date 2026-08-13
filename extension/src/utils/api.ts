import {
  GenerateNotesRequest,
  GenerateNotesResponse,
  AnalyzeFrameRequest,
  AnalyzeFrameResponse,
  MergeNotesRequest,
  MergeNotesResponse,
  AskAIRequest,
  AskAIResponse,
  DEFAULT_SETTINGS,
} from '../types';
import { getSettings } from './storage';

async function getBaseUrl(): Promise<string> {
  try {
    const settings = await getSettings();
    return (settings.backendUrl || DEFAULT_SETTINGS.backendUrl).replace(/\/+$/, '');
  } catch {
    return DEFAULT_SETTINGS.backendUrl;
  }
}

/**
 * Resilient fetch wrapper with timeout and exponential backoff retry
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 2, timeoutMs: number = 25000): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Retry on 429 (Rate Limit) or 502/503/504 (Server Gateway/Unavailable)
      if ((response.status === 429 || response.status >= 502) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[Scribe API] Received status ${response.status}. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[Scribe API] Network error (${lastError.message}). Retrying in ${Math.round(delay)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Network request failed after retries');
}

export async function checkBackendHealth(): Promise<{ status: string; provider?: string }> {
  const baseUrl = await getBaseUrl();
  try {
    const res = await fetchWithRetry(`${baseUrl}/health`, { method: 'GET' }, 1, 4000);
    if (!res.ok) {
      return { status: 'offline' };
    }
    const data = await res.json();
    return { status: 'online', provider: data.provider };
  } catch {
    return { status: 'offline' };
  }
}

export async function apiGenerateNotes(request: GenerateNotesRequest): Promise<GenerateNotesResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithRetry(`${baseUrl}/generate-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, 2, 45000);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(cleanErrorMessage(errorText, res.status));
  }

  return await res.json();
}

export async function apiAnalyzeFrame(request: AnalyzeFrameRequest): Promise<AnalyzeFrameResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithRetry(`${baseUrl}/analyze-frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, 2, 35000);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(cleanErrorMessage(errorText, res.status));
  }

  return await res.json();
}

export async function apiMergeNotes(request: MergeNotesRequest): Promise<MergeNotesResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithRetry(`${baseUrl}/merge-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, 2, 35000);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(cleanErrorMessage(errorText, res.status));
  }

  return await res.json();
}

export async function apiAskAI(request: AskAIRequest): Promise<AskAIResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithRetry(`${baseUrl}/ask-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, 2, 35000);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(cleanErrorMessage(errorText, res.status));
  }

  return await res.json();
}

function cleanErrorMessage(rawError: string, status: number): string {
  try {
    const parsed = JSON.parse(rawError);
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    // raw string
  }
  if (status === 429) return 'Rate limit reached or LLM quota exhausted. Please try again shortly.';
  if (status === 503) return 'AI Provider is temporarily unavailable. Please retry in a few seconds.';
  return rawError || `Server error (${status})`;
}
