import { ScribeNote, TranscriptChunk, ExtensionSettings, DEFAULT_SETTINGS, RecentVideoSession, ThemeMode, VideoMetadata } from '../types';

const STORAGE_PREFIX_NOTES = 'scribe_notes_';
const STORAGE_PREFIX_TRANSCRIPT = 'scribe_transcript_';
const STORAGE_PREFIX_META = 'scribe_meta_';
const STORAGE_KEY_SETTINGS = 'scribe_settings';

/**
 * Sequential async write queue (Mutex) to eliminate race conditions
 * and prevent concurrent storage write overwrites.
 */
class AsyncStorageQueue {
  private queue: Promise<any> = Promise.resolve();

  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue = this.queue
        .then(async () => {
          try {
            const result = await task();
            resolve(result);
          } catch (err) {
            reject(err);
          }
        })
        .catch((err) => {
          console.error('[Scribe Storage] Queue execution error:', err);
          reject(err);
        });
    });
  }
}

const storageQueue = new AsyncStorageQueue();

export async function getNotes(videoId: string): Promise<ScribeNote[]> {
  if (!videoId) return [];
  try {
    const key = `${STORAGE_PREFIX_NOTES}${videoId}`;
    const result = await chrome.storage.local.get(key);
    return (result[key] as ScribeNote[]) || [];
  } catch (error) {
    console.error('[Scribe Storage] Failed to get notes:', error);
    return [];
  }
}

export async function saveNotes(videoId: string, notes: ScribeNote[]): Promise<void> {
  if (!videoId) return;
  return storageQueue.enqueue(async () => {
    try {
      const key = `${STORAGE_PREFIX_NOTES}${videoId}`;
      await chrome.storage.local.set({ [key]: notes });
      await updateVideoMetadataInternal(videoId, notes.length);
    } catch (error) {
      console.error('[Scribe Storage] Failed to save notes:', error);
      throw error;
    }
  });
}

export async function addNote(videoId: string, note: ScribeNote): Promise<ScribeNote[]> {
  if (!videoId || !note) return [];
  return storageQueue.enqueue(async () => {
    try {
      const key = `${STORAGE_PREFIX_NOTES}${videoId}`;
      const existingObj = await chrome.storage.local.get(key);
      const existingNotes: ScribeNote[] = (existingObj[key] as ScribeNote[]) || [];

      const existingIdx = existingNotes.findIndex((n) => n.id === note.id);
      let updated: ScribeNote[];
      if (existingIdx >= 0) {
        updated = [...existingNotes];
        updated[existingIdx] = note;
      } else {
        updated = [...existingNotes, note];
      }

      // Sort chronologically by timestamp
      updated.sort((a, b) => a.timestamp - b.timestamp);
      await chrome.storage.local.set({ [key]: updated });
      await updateVideoMetadataInternal(videoId, updated.length);
      return updated;
    } catch (err) {
      console.error('[Scribe Storage] Failed to add note atomically:', err);
      throw err;
    }
  });
}

export async function deleteNote(videoId: string, noteId: string): Promise<ScribeNote[]> {
  if (!videoId || !noteId) return [];
  return storageQueue.enqueue(async () => {
    try {
      const key = `${STORAGE_PREFIX_NOTES}${videoId}`;
      const existingObj = await chrome.storage.local.get(key);
      const existingNotes: ScribeNote[] = (existingObj[key] as ScribeNote[]) || [];
      const updated = existingNotes.filter((n) => n.id !== noteId);

      await chrome.storage.local.set({ [key]: updated });
      await updateVideoMetadataInternal(videoId, updated.length);
      return updated;
    } catch (err) {
      console.error('[Scribe Storage] Failed to delete note:', err);
      throw err;
    }
  });
}

export async function getTranscript(videoId: string): Promise<TranscriptChunk[]> {
  if (!videoId) return [];
  try {
    const key = `${STORAGE_PREFIX_TRANSCRIPT}${videoId}`;
    const result = await chrome.storage.local.get(key);
    return (result[key] as TranscriptChunk[]) || [];
  } catch (error) {
    console.error('[Scribe Storage] Failed to get transcript:', error);
    return [];
  }
}

export async function saveTranscript(videoId: string, chunks: TranscriptChunk[]): Promise<void> {
  if (!videoId || !chunks || chunks.length === 0) return;
  return storageQueue.enqueue(async () => {
    try {
      const key = `${STORAGE_PREFIX_TRANSCRIPT}${videoId}`;
      await chrome.storage.local.set({ [key]: chunks });
    } catch (error) {
      console.error('[Scribe Storage] Failed to save transcript:', error);
    }
  });
}

export async function getSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY_SETTINGS] || {}) };
  } catch (error) {
    console.error('[Scribe Storage] Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  return storageQueue.enqueue(async () => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
      const current = { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY_SETTINGS] || {}) };
      const updated = { ...current, ...settings };
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: updated });
      return updated;
    } catch (error) {
      console.error('[Scribe Storage] Failed to save settings:', error);
      return DEFAULT_SETTINGS;
    }
  });
}

export async function getTheme(): Promise<ThemeMode> {
  const settings = await getSettings();
  return settings.theme || 'dark';
}

export async function saveTheme(theme: ThemeMode): Promise<void> {
  await saveSettings({ theme });
}

export async function updateVideoMetadata(videoId: string, noteCount: number, meta?: Partial<VideoMetadata>): Promise<void> {
  return storageQueue.enqueue(async () => {
    await updateVideoMetadataInternal(videoId, noteCount, meta);
  });
}

async function updateVideoMetadataInternal(videoId: string, noteCount: number, meta?: Partial<VideoMetadata>): Promise<void> {
  if (!videoId) return;
  try {
    const key = `${STORAGE_PREFIX_META}${videoId}`;
    const existing = (await chrome.storage.local.get(key))[key] || {};
    const title = meta?.title || existing.title || (typeof document !== 'undefined' ? document.title.replace(' - YouTube', '').trim() : `Video ${videoId}`);
    const channel = meta?.channel || existing.channel || 'YouTube';
    const url = meta?.url || existing.url || `https://www.youtube.com/watch?v=${videoId}`;

    const session: RecentVideoSession = {
      videoId,
      title,
      channel,
      noteCount,
      lastWatched: Date.now(),
      url,
    };
    await chrome.storage.local.set({ [key]: session });
  } catch (error) {
    console.error('[Scribe Storage] Failed to update meta:', error);
  }
}

export async function getAllRecentSessions(): Promise<RecentVideoSession[]> {
  try {
    const all = await chrome.storage.local.get(null);
    const sessions: RecentVideoSession[] = [];

    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(STORAGE_PREFIX_META) && value && typeof value === 'object') {
        sessions.push(value as RecentVideoSession);
      }
    }

    sessions.sort((a, b) => b.lastWatched - a.lastWatched);
    return sessions;
  } catch (err) {
    console.error('[Scribe Storage] Failed to get recent sessions:', err);
    return [];
  }
}
