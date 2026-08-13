// Scribe Note Generation & Merging Pipeline (Hardened & Resilient)
import { ScribeNote, TranscriptChunk, VideoMetadata } from '../types';
import { videoController } from './video';
import { frameCaptureEngine, CapturedFrame } from './capture';
import { extractTranscript } from './transcript';
import { apiAnalyzeFrame, apiMergeNotes, apiGenerateNotes, apiAskAI, checkBackendHealth } from '../utils/api';
import { addNote } from '../utils/storage';
import { formatTime } from '../utils/time';

export type NoteGeneratedCallback = (note: ScribeNote) => void;
export type PipelineStatusCallback = (status: {
  isProcessing: boolean;
  message?: string;
  error?: string;
  backendOnline: boolean;
}) => void;

class PipelineController {
  private currentMetadata: VideoMetadata | null = null;
  private transcriptChunks: TranscriptChunk[] = [];
  private onNoteGeneratedListeners: Set<NoteGeneratedCallback> = new Set();
  private onStatusListeners: Set<PipelineStatusCallback> = new Set();
  private isProcessing: boolean = false;
  private isAnalyzingFrame: boolean = false;
  private backendOnline: boolean = false;
  private currentAbortController: AbortController | null = null;
  private unsubs: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    this.checkHealth();
    const healthInterval = setInterval(() => this.checkHealth(), 15000);
    this.unsubs.push(() => clearInterval(healthInterval));

    const unsubVideo = videoController.onVideoChange(async (meta) => {
      // Abort any in-flight request on video navigation
      this.abortCurrentRequest();
      this.currentMetadata = meta;
      this.transcriptChunks = [];

      if (meta && meta.videoId) {
        this.emitStatus(true, 'Extracting transcript...');
        try {
          const tr = await extractTranscript(meta.videoId);
          if (tr.success && tr.chunks.length > 0) {
            this.transcriptChunks = tr.chunks;
            this.emitStatus(false, `Loaded ${tr.chunks.length} transcript segments`);
          } else {
            this.emitStatus(false, 'No transcript available (Visual mode active)');
          }
        } catch (e) {
          console.warn('[Scribe Pipeline] Transcript extraction error:', e);
          this.emitStatus(false, 'Visual note capture active');
        }
      }
    });
    this.unsubs.push(unsubVideo);

    const unsubFrames = frameCaptureEngine.onFrame(async (frame) => {
      await this.processCapturedFrame(frame);
    });
    this.unsubs.push(unsubFrames);
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const health = await checkBackendHealth();
      this.backendOnline = health.status === 'online';
      this.emitStatus(this.isProcessing);
      return this.backendOnline;
    } catch {
      this.backendOnline = false;
      this.emitStatus(this.isProcessing);
      return false;
    }
  }

  public onNoteGenerated(cb: NoteGeneratedCallback): () => void {
    this.onNoteGeneratedListeners.add(cb);
    return () => this.onNoteGeneratedListeners.delete(cb);
  }

  public onStatus(cb: PipelineStatusCallback): () => void {
    this.onStatusListeners.add(cb);
    cb({
      isProcessing: this.isProcessing,
      backendOnline: this.backendOnline,
    });
    return () => this.onStatusListeners.delete(cb);
  }

  private abortCurrentRequest() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * Main Multimodal Fusion: processes captured frame + transcript window with race protection
   */
  public async processCapturedFrame(frame: CapturedFrame): Promise<ScribeNote | null> {
    if (this.isAnalyzingFrame) {
      console.log('[Scribe Pipeline] Frame analysis in progress, skipping frame delta.');
      return null;
    }

    if (!this.currentMetadata) {
      this.currentMetadata = videoController.getVideoMetadata();
    }
    const videoId = this.currentMetadata?.videoId || videoController.getCurrentVideoId();
    if (!videoId) return null;

    const timestamp = frame.timestamp;
    const spokenContext = this.getSpokenContextAround(timestamp, 25);

    this.isAnalyzingFrame = true;
    this.isProcessing = true;
    this.emitStatus(true, `Analyzing screen frame at ${formatTime(timestamp)}...`);

    this.currentAbortController = new AbortController();

    try {
      // Offline fallback
      if (!this.backendOnline) {
        const offlineNote: ScribeNote = {
          id: `note_${videoId}_${Math.round(timestamp)}_${Date.now()}`,
          videoId,
          timestamp,
          timestampFormatted: formatTime(timestamp),
          title: `Note at ${formatTime(timestamp)}`,
          text: spokenContext ? `Spoken: "${spokenContext}"` : 'Visual note captured from video frame.',
          source: frame.reason === 'manual' ? 'manual' : 'visual',
          frameThumbnail: frame.dataUrl,
          createdAt: Date.now(),
        };
        await addNote(videoId, offlineNote);
        this.notifyNote(offlineNote);
        return offlineNote;
      }

      // Step 1: Vision Analysis
      let visionResult;
      try {
        visionResult = await apiAnalyzeFrame({
          videoId,
          timestamp,
          image: frame.dataUrl,
          spokenContext,
        });
      } catch (visionErr: any) {
        console.warn('[Scribe Pipeline] Vision analysis failed, falling back to transcript:', visionErr);
        if (spokenContext) {
          const fallbackTrNote: ScribeNote = {
            id: `transcript_${videoId}_${Math.round(timestamp)}_${Date.now()}`,
            videoId,
            timestamp,
            timestampFormatted: formatTime(timestamp),
            title: `Key Topic at ${formatTime(timestamp)}`,
            text: spokenContext,
            source: 'transcript',
            frameThumbnail: frame.dataUrl,
            createdAt: Date.now(),
          };
          await addNote(videoId, fallbackTrNote);
          this.notifyNote(fallbackTrNote);
          return fallbackTrNote;
        }
        throw visionErr;
      }

      let finalNote: ScribeNote;

      if (spokenContext && spokenContext.trim().length > 0) {
        // Step 2: Merge spoken transcript + vision
        this.emitStatus(true, `Merging audio + visual notes...`);
        try {
          const mergeResult = await apiMergeNotes({
            videoId,
            videoTitle: this.currentMetadata?.title || document.title,
            timestamp,
            transcriptText: spokenContext,
            visualAnalysis: visionResult,
          });

          finalNote = {
            id: `merged_${videoId}_${Math.round(timestamp)}_${Date.now()}`,
            videoId,
            timestamp,
            timestampFormatted: formatTime(timestamp),
            title: mergeResult.note.title || `Concept at ${formatTime(timestamp)}`,
            text: mergeResult.note.text,
            bulletPoints: mergeResult.note.bulletPoints || visionResult.bulletPoints,
            codeSnippet: mergeResult.note.codeSnippet || visionResult.codeSnippet,
            codeLanguage: mergeResult.note.codeLanguage || visionResult.codeLanguage,
            diagramDescription: mergeResult.note.diagramDescription || visionResult.diagramDescription,
            tags: mergeResult.note.tags || visionResult.detectedElements,
            source: 'merged',
            frameThumbnail: frame.dataUrl,
            createdAt: Date.now(),
          };
        } catch (mergeErr) {
          console.warn('[Scribe Pipeline] Merge failed, using raw vision result:', mergeErr);
          finalNote = {
            id: `visual_${videoId}_${Math.round(timestamp)}_${Date.now()}`,
            videoId,
            timestamp,
            timestampFormatted: formatTime(timestamp),
            title: visionResult.visualSummary.slice(0, 50) || `Visual Note at ${formatTime(timestamp)}`,
            text: visionResult.visualSummary,
            bulletPoints: visionResult.bulletPoints,
            codeSnippet: visionResult.codeSnippet,
            codeLanguage: visionResult.codeLanguage,
            diagramDescription: visionResult.diagramDescription,
            tags: visionResult.detectedElements,
            source: 'visual',
            frameThumbnail: frame.dataUrl,
            createdAt: Date.now(),
          };
        }
      } else {
        finalNote = {
          id: `visual_${videoId}_${Math.round(timestamp)}_${Date.now()}`,
          videoId,
          timestamp,
          timestampFormatted: formatTime(timestamp),
          title: visionResult.visualSummary.slice(0, 50) || `Visual Note at ${formatTime(timestamp)}`,
          text: visionResult.visualSummary,
          bulletPoints: visionResult.bulletPoints,
          codeSnippet: visionResult.codeSnippet,
          codeLanguage: visionResult.codeLanguage,
          diagramDescription: visionResult.diagramDescription,
          tags: visionResult.detectedElements,
          source: 'visual',
          frameThumbnail: frame.dataUrl,
          createdAt: Date.now(),
        };
      }

      await addNote(videoId, finalNote);
      this.notifyNote(finalNote);
      return finalNote;
    } catch (err: any) {
      console.error('[Scribe Pipeline] Processing error:', err);
      const fallbackNote: ScribeNote = {
        id: `note_${videoId}_${Math.round(timestamp)}_${Date.now()}`,
        videoId,
        timestamp,
        timestampFormatted: formatTime(timestamp),
        title: `Captured at ${formatTime(timestamp)}`,
        text: spokenContext || 'Screenshot captured.',
        source: frame.reason === 'manual' ? 'manual' : 'visual',
        frameThumbnail: frame.dataUrl,
        createdAt: Date.now(),
      };
      await addNote(videoId, fallbackNote);
      this.notifyNote(fallbackNote);
      return fallbackNote;
    } finally {
      this.isAnalyzingFrame = false;
      this.isProcessing = false;
      this.currentAbortController = null;
      this.emitStatus(false);
    }
  }

  /**
   * Custom AI Implementation / Question / Refinement
   */
  public async askAI(userPrompt: string): Promise<ScribeNote> {
    const videoId = videoController.getCurrentVideoId() || 'unknown';
    const timestamp = videoController.getCurrentTime();
    const frame = await frameCaptureEngine.captureNow('manual');
    const spokenContext = this.getSpokenContextAround(timestamp, 30);

    this.isProcessing = true;
    this.emitStatus(true, `Scribe AI generating: "${userPrompt.slice(0, 25)}..."`);

    try {
      const resp = await apiAskAI({
        videoId,
        videoTitle: this.currentMetadata?.title || document.title,
        timestamp,
        userPrompt,
        transcriptText: spokenContext,
        image: frame?.dataUrl,
      });

      const note: ScribeNote = {
        id: `ai_${videoId}_${Math.round(timestamp)}_${Date.now()}`,
        videoId,
        timestamp: +timestamp.toFixed(2),
        timestampFormatted: formatTime(timestamp),
        title: resp.note.title || `AI Note: ${userPrompt}`,
        text: resp.note.text,
        bulletPoints: resp.note.bulletPoints,
        codeSnippet: resp.note.codeSnippet,
        codeLanguage: resp.note.codeLanguage,
        diagramDescription: resp.note.diagramDescription,
        tags: resp.note.tags || ['ai-assistant'],
        source: 'ai',
        frameThumbnail: frame?.dataUrl,
        createdAt: Date.now(),
      };

      await addNote(videoId, note);
      this.notifyNote(note);
      return note;
    } catch (err: any) {
      this.emitStatus(false, undefined, err.message || 'AI request failed');
      throw err;
    } finally {
      this.isProcessing = false;
      this.emitStatus(false);
    }
  }

  /**
   * Batch generates structured notes across the entire transcript
   */
  public async generateFullTranscriptNotes(): Promise<ScribeNote[]> {
    const videoId = videoController.getCurrentVideoId();
    if (!videoId) throw new Error('No active video found on page');

    if (this.transcriptChunks.length === 0) {
      const tr = await extractTranscript(videoId);
      if (tr.success && tr.chunks.length > 0) {
        this.transcriptChunks = tr.chunks;
      } else {
        throw new Error('No transcript available for this video');
      }
    }

    this.isProcessing = true;
    this.emitStatus(true, `Scanning ${this.transcriptChunks.length} transcript segments...`);

    try {
      const resp = await apiGenerateNotes({
        videoId,
        videoTitle: this.currentMetadata?.title || document.title,
        chunks: this.transcriptChunks,
      });

      const newNotes: ScribeNote[] = [];

      for (const item of resp.notes) {
        const note: ScribeNote = {
          id: `transcript_${videoId}_${Math.round(item.timestamp)}_${Math.random().toString(36).slice(2, 6)}`,
          videoId,
          timestamp: item.timestamp,
          timestampFormatted: formatTime(item.timestamp),
          title: item.title,
          text: item.text,
          bulletPoints: item.bulletPoints,
          codeSnippet: item.codeSnippet,
          codeLanguage: item.codeLanguage,
          tags: item.tags,
          source: 'transcript',
          createdAt: Date.now(),
        };
        await addNote(videoId, note);
        this.notifyNote(note);
        newNotes.push(note);
      }

      return newNotes;
    } catch (err: any) {
      this.emitStatus(false, undefined, err.message || 'Transcript scan failed');
      throw err;
    } finally {
      this.isProcessing = false;
      this.emitStatus(false, 'Generated notes successfully');
    }
  }

  /**
   * Manual note creation helper
   */
  public async createManualNote(text: string, title?: string, codeSnippet?: string): Promise<ScribeNote> {
    const videoId = videoController.getCurrentVideoId() || 'unknown';
    const timestamp = videoController.getCurrentTime();
    const frame = await frameCaptureEngine.captureNow('manual');

    const note: ScribeNote = {
      id: `manual_${videoId}_${Math.round(timestamp)}_${Date.now()}`,
      videoId,
      timestamp: +timestamp.toFixed(2),
      timestampFormatted: formatTime(timestamp),
      title: title || `Note at ${formatTime(timestamp)}`,
      text: text.trim(),
      codeSnippet: codeSnippet?.trim(),
      source: 'manual',
      frameThumbnail: frame?.dataUrl,
      createdAt: Date.now(),
    };

    await addNote(videoId, note);
    this.notifyNote(note);
    return note;
  }

  private getSpokenContextAround(timestamp: number, windowSeconds: number = 25): string {
    if (this.transcriptChunks.length === 0) return '';

    const start = Math.max(0, timestamp - windowSeconds / 2);
    const end = timestamp + windowSeconds / 2;

    const matching = this.transcriptChunks.filter((chunk) => {
      const chunkEnd = chunk.start + chunk.duration;
      return chunk.start <= end && chunkEnd >= start;
    });

    return matching.map((c) => c.text).join(' ').trim();
  }

  private notifyNote(note: ScribeNote) {
    this.onNoteGeneratedListeners.forEach((cb) => cb(note));
  }

  private emitStatus(isProcessing: boolean, message?: string, error?: string) {
    this.onStatusListeners.forEach((cb) =>
      cb({
        isProcessing,
        message,
        error,
        backendOnline: this.backendOnline,
      })
    );
  }

  public destroy() {
    this.abortCurrentRequest();
    this.unsubs.forEach((u) => u());
    this.onNoteGeneratedListeners.clear();
    this.onStatusListeners.clear();
  }
}

export const pipelineController = new PipelineController();
