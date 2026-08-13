import { videoController } from './video';
import { extractTranscript } from './transcript';
import { initSidebar } from './sidebar';

console.log('%c[Scribe]%c AI YouTube Coding Notes extension loaded.', 'background: #6366f1; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;', '');

// Initialize the sidebar UI
initSidebar();

// Listen for video changes and automatically fetch/cache transcript
videoController.onVideoChange(async (meta) => {
  if (!meta || !meta.videoId) return;

  console.log(`[Scribe] Active video detected: ${meta.title} (${meta.videoId})`);

  try {
    const transcriptResult = await extractTranscript(meta.videoId);
    if (transcriptResult.success) {
      console.log(`[Scribe] Extracted ${transcriptResult.chunks.length} transcript chunks.`);
      // Dispatch custom event for UI updates
      window.dispatchEvent(
        new CustomEvent('scribe:transcript_loaded', {
          detail: {
            videoId: meta.videoId,
            chunkCount: transcriptResult.chunks.length,
          },
        })
      );
    } else {
      console.warn(`[Scribe] Transcript unavailable: ${transcriptResult.error}`);
      window.dispatchEvent(
        new CustomEvent('scribe:transcript_failed', {
          detail: {
            videoId: meta.videoId,
            error: transcriptResult.error,
          },
        })
      );
    }
  } catch (err) {
    console.error('[Scribe] Error during transcript extraction:', err);
  }
});
