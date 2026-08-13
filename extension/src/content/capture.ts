// Scribe Frame Capture Engine
import { videoController } from './video';

export interface CapturedFrame {
  dataUrl: string;
  timestamp: number;
  reason: 'scene_change' | 'speech_pause' | 'manual' | 'interval';
}

export type FrameCapturedCallback = (frame: CapturedFrame) => void;

class FrameCaptureEngine {
  private lastCapturedTime: number = -1;
  private lastCaptureRealTime: number = 0;
  private minIntervalSeconds: number = 25; // minimum seconds between auto captures
  private lastDownsampledFrame: Uint8ClampedArray | null = null;
  private isCapturing: boolean = false;
  private autoCaptureEnabled: boolean = true;
  private listeners: Set<FrameCapturedCallback> = new Set();
  private checkIntervalTimer: number | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for video time updates
    videoController.onTimeUpdate((currentTime) => {
      this.handlePlaybackProgress(currentTime);
    });

    // Check for paused video (often when instructor writes code or stops to explain)
    videoController.onPlaybackState((isPlaying) => {
      if (!isPlaying && this.autoCaptureEnabled) {
        const currentTime = videoController.getCurrentTime();
        if (Math.abs(currentTime - this.lastCapturedTime) > 20) {
          this.triggerCapture('speech_pause');
        }
      }
    });
  }

  public setAutoCapture(enabled: boolean) {
    this.autoCaptureEnabled = enabled;
  }

  public setMinInterval(seconds: number) {
    this.minIntervalSeconds = Math.max(5, seconds);
  }

  public onFrame(cb: FrameCapturedCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Captures a frame immediately (manual or programmatically triggered)
   */
  public async captureNow(reason: CapturedFrame['reason'] = 'manual'): Promise<CapturedFrame | null> {
    const video = videoController.getVideoElement();
    if (!video) {
      console.warn('[Scribe Capture] No video element found');
      return null;
    }

    const timestamp = videoController.getCurrentTime();
    const dataUrl = await this.captureFrame(video);
    if (!dataUrl) return null;

    this.lastCapturedTime = timestamp;
    this.lastCaptureRealTime = Date.now();

    const frame: CapturedFrame = {
      dataUrl,
      timestamp: +timestamp.toFixed(2),
      reason,
    };

    this.notifyListeners(frame);
    return frame;
  }

  private async handlePlaybackProgress(currentTime: number) {
    if (!this.autoCaptureEnabled || this.isCapturing) return;

    // Cooldown check (both video time and real-world time)
    const timeDelta = Math.abs(currentTime - this.lastCapturedTime);
    const realTimeDeltaMs = Date.now() - this.lastCaptureRealTime;

    if (timeDelta < this.minIntervalSeconds || realTimeDeltaMs < this.minIntervalSeconds * 1000) {
      return;
    }

    const video = videoController.getVideoElement();
    if (!video || video.paused || video.ended || video.readyState < 2) return;

    // Scene change detection via low-res diff
    const isSceneChanged = await this.detectSceneChange(video);
    if (isSceneChanged) {
      console.log(`[Scribe Capture] Scene change detected at ${currentTime.toFixed(1)}s!`);
      await this.triggerCapture('scene_change');
    }
  }

  private async triggerCapture(reason: CapturedFrame['reason']) {
    if (this.isCapturing) return;
    this.isCapturing = true;
    try {
      await this.captureNow(reason);
    } catch (err) {
      console.warn('[Scribe Capture] Capture failed:', err);
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * Captures the video frame using HTML5 canvas with background tabCapture fallback
   */
  private async captureFrame(video: HTMLVideoElement): Promise<string | null> {
    try {
      // 1. Try direct canvas capture
      const canvas = document.createElement('canvas');
      const naturalWidth = video.videoWidth || 1280;
      const naturalHeight = video.videoHeight || 720;

      // Scale down large 4K/1080p frames to 1280px max width for LLM vision efficiency
      const maxWidth = 1280;
      let width = naturalWidth;
      let height = naturalHeight;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get 2d context');

      ctx.drawImage(video, 0, 0, width, height);

      // Attempt to export image - will throw SecurityError if tainted
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      return dataUrl;
    } catch (err) {
      console.warn('[Scribe Capture] Direct canvas capture failed (CORS), falling back to tab capture:', err);
      return await this.captureViaTabFallback();
    }
  }

  /**
   * Fallback using chrome.runtime message to background script captureVisibleTab
   */
  private captureViaTabFallback(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB' }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            console.error('[Scribe Capture] Tab capture fallback failed:', res?.error || chrome.runtime.lastError?.message);
            resolve(null);
          } else {
            resolve(res.dataUrl);
          }
        });
      } catch (e) {
        console.error('[Scribe Capture] Error sending capture message:', e);
        resolve(null);
      }
    });
  }

  /**
   * Fast scene change detector comparing a 32x18 thumbnail
   */
  private async detectSceneChange(video: HTMLVideoElement): Promise<boolean> {
    try {
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 32;
      thumbCanvas.height = 18;
      const ctx = thumbCanvas.getContext('2d');
      if (!ctx) return false;

      ctx.drawImage(video, 0, 0, 32, 18);
      const imgData = ctx.getImageData(0, 0, 32, 18);
      const data = imgData.data;

      if (!this.lastDownsampledFrame) {
        this.lastDownsampledFrame = new Uint8ClampedArray(data);
        return false;
      }

      // Calculate pixel differences
      let diffSum = 0;
      const totalPixels = 32 * 18;

      for (let i = 0; i < data.length; i += 4) {
        const rDiff = Math.abs(data[i] - this.lastDownsampledFrame[i]);
        const gDiff = Math.abs(data[i + 1] - this.lastDownsampledFrame[i + 1]);
        const bDiff = Math.abs(data[i + 2] - this.lastDownsampledFrame[i + 2]);
        const pixelDiff = (rDiff + gDiff + bDiff) / 3;
        diffSum += pixelDiff;
      }

      const avgDiff = diffSum / totalPixels;
      // Update last frame
      this.lastDownsampledFrame = new Uint8ClampedArray(data);

      // Threshold of 18 out of 255 indicates significant visual delta (slide change, IDE tab change)
      return avgDiff > 18;
    } catch {
      return false;
    }
  }

  private notifyListeners(frame: CapturedFrame) {
    this.listeners.forEach((cb) => cb(frame));
  }

  public destroy() {
    if (this.checkIntervalTimer) clearInterval(this.checkIntervalTimer);
    this.listeners.clear();
  }
}

export const frameCaptureEngine = new FrameCaptureEngine();
