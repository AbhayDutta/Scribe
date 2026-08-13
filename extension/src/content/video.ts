import { VideoMetadata } from '../types';

export type VideoChangeCallback = (metadata: VideoMetadata | null) => void;
export type TimeUpdateCallback = (currentTime: number, duration: number) => void;
export type PlaybackStateCallback = (isPlaying: boolean) => void;

class VideoController {
  private videoElement: HTMLVideoElement | null = null;
  private currentVideoId: string | null = null;
  private onVideoChangeCallbacks: Set<VideoChangeCallback> = new Set();
  private onTimeUpdateCallbacks: Set<TimeUpdateCallback> = new Set();
  private onPlaybackStateCallbacks: Set<PlaybackStateCallback> = new Set();
  private observer: MutationObserver | null = null;
  private fallbackInterval: number | null = null;
  private attachedVideos: WeakSet<HTMLVideoElement> = new WeakSet();

  constructor() {
    this.init();
  }

  private init() {
    this.detectVideoElement();
    this.setupPageNavigationListeners();
    this.startObservingDOM();
  }

  public getVideoElement(): HTMLVideoElement | null {
    if (!this.videoElement || !document.contains(this.videoElement)) {
      this.detectVideoElement();
    }
    return this.videoElement;
  }

  public getCurrentVideoId(): string | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const idFromQuery = urlParams.get('v');
      if (idFromQuery) return idFromQuery;

      const match = window.location.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]+)/);
      if (match && match[2]) return match[2];
    } catch {
      // Ignore URL parsing errors
    }
    return null;
  }

  public getCurrentTime(): number {
    const video = this.getVideoElement();
    return video ? video.currentTime : 0;
  }

  public getDuration(): number {
    const video = this.getVideoElement();
    return video && !isNaN(video.duration) ? video.duration : 0;
  }

  public isPlaying(): boolean {
    const video = this.getVideoElement();
    return !!video && !video.paused && !video.ended && video.readyState > 2;
  }

  public seekTo(timestamp: number): void {
    const video = this.getVideoElement();
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(timestamp, video.duration || timestamp));
    if (video.paused) {
      video.play().catch(() => {});
    }
  }

  public getVideoMetadata(): VideoMetadata | null {
    const videoId = this.getCurrentVideoId();
    if (!videoId) return null;

    const titleEl = document.querySelector('h1.ytd-watch-metadata, #title h1, h1.title') as HTMLElement;
    const title = titleEl ? titleEl.innerText.trim() : document.title.replace(' - YouTube', '').trim();

    const channelEl = document.querySelector('#owner #channel-name a, ytd-channel-name a') as HTMLElement;
    const channel = channelEl ? channelEl.innerText.trim() : 'YouTube Creator';

    const duration = this.getDuration();

    return {
      videoId,
      title: title || `YouTube Video (${videoId})`,
      channel,
      duration,
      url: window.location.href,
      hasTranscript: false,
    };
  }

  public onVideoChange(callback: VideoChangeCallback): () => void {
    this.onVideoChangeCallbacks.add(callback);
    callback(this.getVideoMetadata());
    return () => this.onVideoChangeCallbacks.delete(callback);
  }

  public onTimeUpdate(callback: TimeUpdateCallback): () => void {
    this.onTimeUpdateCallbacks.add(callback);
    return () => this.onTimeUpdateCallbacks.delete(callback);
  }

  public onPlaybackState(callback: PlaybackStateCallback): () => void {
    this.onPlaybackStateCallbacks.add(callback);
    return () => this.onPlaybackStateCallbacks.delete(callback);
  }

  private detectVideoElement(): void {
    const video = (document.querySelector('video.video-stream') ||
      document.querySelector('video.html5-main-video') ||
      document.querySelector('video')) as HTMLVideoElement | null;

    if (video && video !== this.videoElement) {
      this.attachVideoListeners(video);
    }
  }

  private attachVideoListeners(video: HTMLVideoElement): void {
    this.videoElement = video;

    if (this.attachedVideos.has(video)) {
      return; // Already attached to this video instance
    }
    this.attachedVideos.add(video);

    video.addEventListener('timeupdate', () => {
      const time = video.currentTime;
      const duration = video.duration || 0;
      this.onTimeUpdateCallbacks.forEach((cb) => cb(time, duration));
    });

    video.addEventListener('play', () => {
      this.onPlaybackStateCallbacks.forEach((cb) => cb(true));
    });

    video.addEventListener('pause', () => {
      this.onPlaybackStateCallbacks.forEach((cb) => cb(false));
    });

    video.addEventListener('ended', () => {
      this.onPlaybackStateCallbacks.forEach((cb) => cb(false));
    });
  }

  private setupPageNavigationListeners(): void {
    window.addEventListener('yt-navigate-finish', () => {
      this.handleVideoChange();
    });

    window.addEventListener('popstate', () => {
      this.handleVideoChange();
    });

    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
    }

    this.fallbackInterval = window.setInterval(() => {
      const newId = this.getCurrentVideoId();
      if (newId && newId !== this.currentVideoId) {
        this.handleVideoChange();
      }
    }, 1000);
  }

  private handleVideoChange(): void {
    const newId = this.getCurrentVideoId();
    if (!newId || newId === this.currentVideoId) return;

    this.currentVideoId = newId;
    this.detectVideoElement();

    setTimeout(() => {
      const meta = this.getVideoMetadata();
      this.onVideoChangeCallbacks.forEach((cb) => cb(meta));
    }, 400);
  }

  private startObservingDOM(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver(() => {
      if (!this.videoElement || !document.contains(this.videoElement)) {
        this.detectVideoElement();
      }
    });

    if (document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  public destroy(): void {
    if (this.observer) this.observer.disconnect();
    if (this.fallbackInterval) clearInterval(this.fallbackInterval);
    this.onVideoChangeCallbacks.clear();
    this.onTimeUpdateCallbacks.clear();
    this.onPlaybackStateCallbacks.clear();
  }
}

export const videoController = new VideoController();
