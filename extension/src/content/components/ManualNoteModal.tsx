import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { videoController } from '../video';
import { pipelineController } from '../pipeline';
import { formatTime } from '../../utils/time';
import { X, Check } from 'lucide-react';

interface ManualNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualNoteModal: React.FC<ManualNoteModalProps> = ({ isOpen, onClose }) => {
  const [timestamp, setTimestamp] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const time = videoController.getCurrentTime();
      setTimestamp(time);
      setTitle('');
      setText('');
      setCodeSnippet('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !codeSnippet.trim()) return;

    setIsSubmitting(true);
    try {
      await pipelineController.createManualNote(text, title, codeSnippet);
      onClose();
    } catch (err) {
      console.error('Failed to create manual note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="scribe-modal-backdrop" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="scribe-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="scribe-modal-title">
                Add Note <span style={{ fontFamily: 'var(--scribe-font-mono)', fontSize: '11px', color: 'var(--scribe-muted-fg)' }}>[{formatTime(timestamp)}]</span>
              </div>
              <button
                onClick={onClose}
                className="scribe-icon-btn"
                style={{ width: '24px', height: '24px' }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--scribe-muted-fg)', display: 'block', marginBottom: '3px' }}>
                  Title (optional)
                </label>
                <input
                  type="text"
                  className="scribe-input"
                  placeholder="e.g. Operating System Goals & Services"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--scribe-muted-fg)', display: 'block', marginBottom: '3px' }}>
                  Key Explanation / Takeaways *
                </label>
                <textarea
                  className="scribe-textarea"
                  placeholder="What was explained at this timestamp?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--scribe-muted-fg)', display: 'block', marginBottom: '3px' }}>
                  Code Snippet (optional)
                </label>
                <textarea
                  className="scribe-textarea"
                  style={{ fontFamily: 'var(--scribe-font-mono)', fontSize: '11px', minHeight: '50px' }}
                  placeholder="code snippet or pseudocode..."
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                <button type="button" className="scribe-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="scribe-btn-primary"
                  disabled={isSubmitting || (!text.trim() && !codeSnippet.trim())}
                >
                  <Check size={13} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Note'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
