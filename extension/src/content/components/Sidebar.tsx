import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScribeNote, VideoMetadata, ThemeMode, ViewMode } from '../../types';
import { videoController } from '../video';
import { pipelineController } from '../pipeline';
import { getNotes, deleteNote, getTheme, saveTheme, updateVideoMetadata } from '../../utils/storage';
import { Header } from './Header';
import { NoteTimelineCard } from './NoteTimelineCard';
import { StructuredOutlineView } from './StructuredOutlineView';
import { FloatingQuickCapture } from './FloatingQuickCapture';
import { AskAIBar } from './AskAIBar';
import { EmptyState } from './EmptyState';
import { ManualNoteModal } from './ManualNoteModal';
import { ExportModal } from './ExportModal';
import { SettingsModal } from './SettingsModal';
import { Search, Layers, ListTree, AlignLeft, Sparkles } from 'lucide-react';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI Notes' },
  { id: 'transcript', label: 'Spoken' },
  { id: 'visual', label: 'Screen' },
  { id: 'code', label: 'Code' },
  { id: 'manual', label: 'Manual' },
] as const;

type FilterType = (typeof FILTER_TABS)[number]['id'];

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [notes, setNotes] = useState<ScribeNote[]>([]);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [backendOnline, setBackendOnline] = useState(false);

  // Modals & Floating Overlay
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const notesListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTheme().then(setTheme);

    const unsubVideo = videoController.onVideoChange(async (meta) => {
      setMetadata(meta);
      if (meta && meta.videoId) {
        const savedNotes = await getNotes(meta.videoId);
        setNotes(savedNotes);
        await updateVideoMetadata(meta.videoId, savedNotes.length, meta);
      } else {
        setNotes([]);
      }
    });

    const unsubTime = videoController.onTimeUpdate((time) => {
      setCurrentTime(time);
    });

    const unsubStatus = pipelineController.onStatus((status) => {
      setIsProcessing(status.isProcessing);
      setStatusMessage(status.message);
      setErrorMessage(status.error);
      setBackendOnline(status.backendOnline);
    });

    const unsubNote = pipelineController.onNoteGenerated((newNote) => {
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === newNote.id);
        let updated: ScribeNote[];
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = newNote;
        } else {
          updated = [...prev, newNote];
        }
        updated.sort((a, b) => a.timestamp - b.timestamp);
        return updated;
      });
    });

    // Global keyboard shortcut listeners (Alt+S, Alt+N, Ctrl+Shift+S, Ctrl+Shift+N)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltS = (e.altKey || (e.ctrlKey && e.shiftKey)) && (e.code === 'KeyS' || e.key === 's' || e.key === 'S');
      const isAltN = (e.altKey || (e.ctrlKey && e.shiftKey)) && (e.code === 'KeyN' || e.key === 'n' || e.key === 'N');

      if (isAltS) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      } else if (isAltN) {
        e.preventDefault();
        e.stopPropagation();
        setIsQuickCaptureOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    const handleCustomToggle = () => {
      setIsOpen((prev) => !prev);
    };

    window.addEventListener('scribe:toggle_sidebar', handleCustomToggle);

    const handleRuntimeMessage = (msg: any) => {
      if (msg.action === 'TOGGLE_SIDEBAR') {
        setIsOpen((prev) => !prev);
      } else if (msg.action === 'TRIGGER_MANUAL_NOTE') {
        setIsQuickCaptureOpen(true);
      }
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    return () => {
      unsubVideo();
      unsubTime();
      unsubStatus();
      unsubNote();
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scribe:toggle_sidebar', handleCustomToggle);
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    };
  }, []);

  const toggleTheme = async () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    await saveTheme(nextTheme);
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (activeFilter === 'ai' && n.source !== 'ai') return false;
      if (activeFilter === 'transcript' && n.source !== 'transcript') return false;
      if (activeFilter === 'visual' && n.source !== 'visual') return false;
      if (activeFilter === 'manual' && n.source !== 'manual') return false;
      if (activeFilter === 'code' && !n.codeSnippet) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = n.title?.toLowerCase().includes(q);
        const inText = n.text?.toLowerCase().includes(q);
        const inCode = n.codeSnippet?.toLowerCase().includes(q);
        const inBullets = n.bulletPoints?.some((b) => b.toLowerCase().includes(q));
        const inTags = n.tags?.some((t) => t.toLowerCase().includes(q));
        return inTitle || inText || inCode || inBullets || inTags;
      }

      return true;
    });
  }, [notes, activeFilter, searchQuery]);

  // Synced Playback Lyric-Style Active Highlight
  const activePlaybackNoteId = useMemo(() => {
    if (notes.length === 0) return null;
    let closestNote: ScribeNote | null = null;
    let minDistance = 6; // seconds tolerance

    notes.forEach((n) => {
      const dist = Math.abs(n.timestamp - currentTime);
      if (dist < minDistance) {
        minDistance = dist;
        closestNote = n;
      }
    });

    return closestNote ? (closestNote as ScribeNote).id : null;
  }, [notes, currentTime]);

  const handleDeleteNote = async (id: string) => {
    if (!metadata?.videoId) return;
    const updated = await deleteNote(metadata.videoId, id);
    setNotes(updated);
  };

  const handleGenerateFullNotes = async () => {
    try {
      await pipelineController.generateFullTranscriptNotes();
    } catch (err: any) {
      alert(`Note generation: ${err.message}`);
    }
  };

  const handleAskAI = async (prompt: string) => {
    try {
      await pipelineController.askAI(prompt);
    } catch (err: any) {
      alert(`AI error: ${err.message}`);
    }
  };

  const handleStructureNotesWithAI = async () => {
    if (isProcessing) return;
    try {
      await pipelineController.askAI('Structure all core concepts covered in this video into a hierarchical study outline with main categories and definitions.');
    } catch (err: any) {
      alert(`AI error: ${err.message}`);
    }
  };

  const getTabCount = (tabId: FilterType) => {
    switch (tabId) {
      case 'all':
        return notes.length;
      case 'ai':
        return notes.filter((n) => n.source === 'ai').length;
      case 'transcript':
        return notes.filter((n) => n.source === 'transcript').length;
      case 'visual':
        return notes.filter((n) => n.source === 'visual').length;
      case 'code':
        return notes.filter((n) => !!n.codeSnippet).length;
      case 'manual':
        return notes.filter((n) => n.source === 'manual').length;
    }
  };

  return (
    <div className={`scribe-theme-${theme}`}>
      {/* Floating Spotlight Quick Capture Overlay (Alt+N) */}
      <FloatingQuickCapture
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
      />

      {/* Floating Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="scribe-floating-toggle"
            onClick={() => setIsOpen(true)}
            title="Open Scribe Notes (Alt+S)"
          >
            <Layers size={14} />
            <span>Scribe</span>
            {notes.length > 0 && <span className="scribe-toggle-badge">{notes.length}</span>}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="scribe-sidebar-drawer"
          >
            <Header
              metadata={metadata}
              backendOnline={backendOnline}
              isProcessing={isProcessing}
              statusMessage={statusMessage}
              errorMessage={errorMessage}
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenManualNote={() => setIsManualModalOpen(true)}
              onGenerateFullNotes={handleGenerateFullNotes}
              onRetry={handleGenerateFullNotes}
              onOpenExport={() => setIsExportModalOpen(true)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onClose={() => setIsOpen(false)}
            />

            {/* View Mode Bar (Timeline vs Syllabus Tree) */}
            <div className="scribe-view-mode-bar">
              <div className="scribe-mode-pill-group">
                <button
                  className={`scribe-mode-pill ${viewMode === 'timeline' ? 'active' : ''}`}
                  onClick={() => setViewMode('timeline')}
                >
                  {viewMode === 'timeline' && (
                    <motion.div
                      layoutId="activeViewMode"
                      className="scribe-mode-active-bg"
                      transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                    />
                  )}
                  <AlignLeft size={11} />
                  <span>Timeline</span>
                </button>
                <button
                  className={`scribe-mode-pill ${viewMode === 'outline' ? 'active' : ''}`}
                  onClick={() => setViewMode('outline')}
                >
                  {viewMode === 'outline' && (
                    <motion.div
                      layoutId="activeViewMode"
                      className="scribe-mode-active-bg"
                      transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                    />
                  )}
                  <ListTree size={11} />
                  <span>Syllabus Tree</span>
                </button>
              </div>

              <button
                className="scribe-btn-ghost"
                style={{ fontSize: '10.5px' }}
                onClick={handleStructureNotesWithAI}
                disabled={isProcessing}
                title="Use AI to structure and synthesize all video points"
              >
                <Sparkles size={11} color="var(--scribe-accent)" />
                <span>Structure AI</span>
              </button>
            </div>

            {/* Ask AI Command Input */}
            <AskAIBar onAsk={handleAskAI} isProcessing={isProcessing} />

            {/* Filter Tabs & Search Bar (Timeline Mode) */}
            {viewMode === 'timeline' && (
              <div className="scribe-tabs-container">
                <div style={{ position: 'relative' }}>
                  <Search size={12} color="var(--scribe-subtle)" style={{ position: 'absolute', top: '8px', left: '9px' }} />
                  <input
                    type="text"
                    className="scribe-input"
                    style={{ paddingLeft: '26px', fontSize: '11px', height: '28px' }}
                    placeholder="Search concepts, code, tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="scribe-tabs-list">
                  {FILTER_TABS.map((tab) => {
                    const isActive = activeFilter === tab.id;
                    const count = getTabCount(tab.id);
                    return (
                      <button
                        key={tab.id}
                        className={`scribe-tabs-trigger ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveFilter(tab.id)}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeFilterTab"
                            className="scribe-tabs-active-pill"
                            transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                          />
                        )}
                        <span>{tab.label}</span>
                        {count > 0 && (
                          <span style={{ opacity: 0.6, marginLeft: '3px', fontSize: '9px', fontFamily: 'var(--scribe-font-mono)' }}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes List / Outline View */}
            <div className="scribe-notes-list" ref={notesListRef}>
              {viewMode === 'outline' ? (
                <StructuredOutlineView notes={notes} />
              ) : filteredNotes.length === 0 ? (
                <EmptyState
                  onScanClick={handleGenerateFullNotes}
                  isProcessing={isProcessing}
                />
              ) : (
                filteredNotes.map((note, index) => (
                  <NoteTimelineCard
                    key={note.id}
                    note={note}
                    index={index}
                    isActivePlayback={activePlaybackNoteId === note.id}
                    onDelete={handleDeleteNote}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ManualNoteModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        notes={notes}
        metadata={metadata}
      />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    </div>
  );
};
