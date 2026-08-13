import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { videoController } from '../video';
import { pipelineController } from '../pipeline';
import { formatTime } from '../../utils/time';
import { Check, X, Code2, CornerDownLeft } from 'lucide-react';

interface FloatingQuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FloatingQuickCapture: React.FC<FloatingQuickCaptureProps> = ({ isOpen, onClose }) => {
  const [timestamp, setTimestamp] = useState<number>(0);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const time = videoController.getCurrentTime();
      setTimestamp(time);
      setText('');
      setTitle('');
      setCodeSnippet('');
      setShowCode(false);
      setSavedSuccess(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && !codeSnippet.trim()) return;

    setIsSaving(true);
    try {
      await pipelineController.createManualNote(text, title || undefined, codeSnippet || undefined);
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save quick note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="scribe-floating-capture-overlay"
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: 'var(--scribe-primary)',
                  color: 'var(--scribe-primary-fg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '11px',
                  fontFamily: 'var(--scribe-font-mono)',
                }}
              >
                S
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--scribe-text)' }}>
                Quick Note
              </span>
              <span className="scribe-timestamp-badge">
                {formatTime(timestamp)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className={`scribe-icon-btn ${showCode ? 'active' : ''}`}
                style={{ width: '24px', height: '24px' }}
                onClick={() => setShowCode(!showCode)}
                title="Attach code snippet"
              >
                <Code2 size={13} color={showCode ? 'var(--scribe-accent)' : undefined} />
              </button>
              <button
                type="button"
                className="scribe-icon-btn"
                style={{ width: '24px', height: '24px' }}
                onClick={onClose}
                title="Dismiss (Esc)"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              className="scribe-input"
              style={{ fontSize: '12.5px', padding: '8px 10px' }}
              placeholder="What was explained? (Press Enter to save)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSaving}
            />

            {showCode && (
              <textarea
                className="scribe-textarea"
                style={{
                  fontFamily: 'var(--scribe-font-mono)',
                  fontSize: '11px',
                  minHeight: '60px',
                  padding: '6px 8px',
                }}
                placeholder="Paste code or pseudocode here..."
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                disabled={isSaving}
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--scribe-subtle)', fontFamily: 'var(--scribe-font-mono)' }}>
                Enter ↵ to save • Esc to cancel
              </span>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="submit"
                  className="scribe-btn-primary"
                  style={{ padding: '5px 12px', fontSize: '11px' }}
                  disabled={isSaving || (!text.trim() && !codeSnippet.trim())}
                >
                  {savedSuccess ? (
                    <>
                      <Check size={12} color="#22c55e" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <CornerDownLeft size={11} />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
