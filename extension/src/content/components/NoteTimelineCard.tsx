import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ScribeNote } from '../../types';
import { videoController } from '../video';
import {
  Play,
  Trash2,
  Copy,
  Check,
  Monitor,
  MessageSquare,
  PenTool,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface NoteTimelineCardProps {
  note: ScribeNote;
  index?: number;
  isActivePlayback?: boolean;
  onDelete: (id: string) => void;
}

export const NoteTimelineCard: React.FC<NoteTimelineCardProps> = ({
  note,
  index = 0,
  isActivePlayback,
  onDelete,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [showFullThumbnail, setShowFullThumbnail] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    videoController.seekTo(note.timestamp);
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.codeSnippet) {
      navigator.clipboard.writeText(note.codeSnippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const getSourceIcon = () => {
    switch (note.source) {
      case 'transcript':
        return <MessageSquare size={10} />;
      case 'visual':
        return <Monitor size={10} />;
      case 'manual':
        return <PenTool size={10} />;
      case 'ai':
      case 'merged':
      default:
        return <Sparkles size={10} />;
    }
  };

  const getSourceLabel = () => {
    switch (note.source) {
      case 'transcript':
        return 'spoken';
      case 'visual':
        return 'screen';
      case 'manual':
        return 'manual';
      case 'ai':
        return 'ai note';
      case 'merged':
      default:
        return 'merged';
    }
  };

  const parsedBullets = (note.bulletPoints || []).map((bullet) => {
    const match = bullet.match(/^([A-Za-z0-9\s()&/_-]{2,35})[:–—\-]\s*(.*)$/);
    if (match) {
      return {
        label: match[1].trim(),
        text: match[2].trim(),
      };
    }
    return {
      label: null,
      text: bullet.trim(),
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
      className={`scribe-note-card ${isActivePlayback ? 'active-playback' : ''}`}
    >
      <div className="scribe-note-header">
        <button
          className="scribe-timestamp-badge"
          onClick={handleSeek}
          title={`Seek video to ${note.timestampFormatted}`}
        >
          <Play size={9} fill="currentColor" />
          <span>{note.timestampFormatted}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="scribe-badge">
            {getSourceIcon()}
            <span>{getSourceLabel()}</span>
          </span>

          {parsedBullets.length > 3 && (
            <button
              className="scribe-btn-ghost"
              style={{ padding: '1px 4px', fontSize: '9.5px' }}
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse points' : 'Expand points'}
            >
              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              <span>{parsedBullets.length} pts</span>
            </button>
          )}
        </div>
      </div>

      {note.title && <div className="scribe-note-title">{note.title}</div>}

      {note.text && <div className="scribe-note-text">{note.text}</div>}

      {/* Structured Bullet Point Cards */}
      {parsedBullets.length > 0 && isExpanded && (
        <div className="scribe-bullets-container">
          {parsedBullets.map((item, idx) => (
            <div key={idx} className="scribe-bullet-card">
              <div className="scribe-bullet-title-row">
                <span style={{ fontSize: '10px', color: 'var(--scribe-subtle)', fontFamily: 'var(--scribe-font-mono)', minWidth: '14px' }}>
                  {idx + 1}.
                </span>
                {item.label ? (
                  <span className="scribe-bullet-tag">{item.label}</span>
                ) : (
                  <span style={{ fontSize: '11.5px', color: 'var(--scribe-text)' }}>{item.text}</span>
                )}
              </div>
              {item.label && item.text && (
                <div className="scribe-bullet-body">{item.text}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {note.diagramDescription && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--scribe-muted-fg)',
            fontStyle: 'italic',
            background: 'var(--scribe-card-hover)',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid var(--scribe-border)',
          }}
        >
          📐 <strong>Diagram:</strong> {note.diagramDescription}
        </div>
      )}

      {note.codeSnippet && (
        <div className="scribe-code-block">
          {note.codeLanguage && <span className="scribe-code-lang">{note.codeLanguage}</span>}
          <pre className="scribe-code-content">{note.codeSnippet}</pre>
          <button
            onClick={handleCopyCode}
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              background: 'var(--scribe-secondary)',
              border: '1px solid var(--scribe-border)',
              color: copiedCode ? '#22c55e' : 'var(--scribe-muted-fg)',
              borderRadius: '4px',
              padding: '2px 5px',
              fontSize: '9.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontFamily: 'var(--scribe-font-sans)',
            }}
            title="Copy code snippet"
          >
            {copiedCode ? <Check size={10} /> : <Copy size={10} />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}

      {note.frameThumbnail && (
        <div>
          <img
            src={note.frameThumbnail}
            alt="Captured frame"
            style={{
              width: '100%',
              maxHeight: showFullThumbnail ? '260px' : '90px',
              objectFit: 'cover',
              borderRadius: '4px',
              border: '1px solid var(--scribe-border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setShowFullThumbnail(!showFullThumbnail)}
            title="Click to expand frame"
          />
        </div>
      )}

      {note.tags && note.tags.length > 0 && (
        <div className="scribe-tags-row">
          {note.tags.map((tag, i) => (
            <span key={i} className="scribe-tag-pill">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
        <button
          className="scribe-btn-ghost"
          onClick={() => onDelete(note.id)}
          title="Delete note"
          style={{ padding: '2px 4px', fontSize: '10px' }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
};
