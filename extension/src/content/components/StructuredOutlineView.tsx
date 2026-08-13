import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScribeNote } from '../../types';
import { videoController } from '../video';
import { Play, ChevronDown, ChevronRight, CheckCircle2, Code2, Sparkles } from 'lucide-react';

interface StructuredOutlineViewProps {
  notes: ScribeNote[];
}

export const StructuredOutlineView: React.FC<StructuredOutlineViewProps> = ({ notes }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (notes.length === 0) {
    return (
      <div className="scribe-empty-state">
        <Sparkles size={20} color="#71717a" />
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#fafafa' }}>No structured notes yet</div>
        <div style={{ fontSize: '11.5px', color: '#71717a', maxWidth: '240px' }}>
          Capture notes or use Ask AI to build a structured syllabus outline.
        </div>
      </div>
    );
  }

  return (
    <div className="scribe-outline-view">
      <div style={{ fontSize: '11px', color: '#a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <span>STRUCTURED STUDY SYLLABUS</span>
        <span style={{ fontFamily: 'var(--scribe-font-mono)' }}>{notes.length} TOPICS</span>
      </div>

      {notes.map((note, index) => {
        const isCollapsed = !!collapsedSections[note.id];
        const bullets = note.bulletPoints || [];
        const hasCode = !!note.codeSnippet;

        return (
          <div key={note.id} className="scribe-outline-module">
            <div
              className="scribe-outline-module-header"
              onClick={() => toggleSection(note.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                <span style={{ color: '#71717a' }}>
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                </span>
                <button
                  className="scribe-timestamp-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    videoController.seekTo(note.timestamp);
                  }}
                  title={`Seek to ${note.timestampFormatted}`}
                >
                  <Play size={8} fill="currentColor" />
                  <span>{note.timestampFormatted}</span>
                </button>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#fafafa',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {note.title || `Section ${index + 1}`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                {bullets.length > 0 && (
                  <span className="scribe-badge">
                    {bullets.length} pts
                  </span>
                )}
                {hasCode && (
                  <span className="scribe-badge">
                    <Code2 size={9} />
                  </span>
                )}
              </div>
            </div>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="scribe-outline-points-list"
                >
                  {note.text && (
                    <div style={{ fontSize: '11.5px', color: '#a1a1aa', lineHeight: '1.4', marginBottom: '4px' }}>
                      {note.text}
                    </div>
                  )}

                  {bullets.map((bullet, bIdx) => {
                    const match = bullet.match(/^([A-Za-z0-9\s()&/_-]{2,35})[:–—\-]\s*(.*)$/);
                    return (
                      <div key={bIdx} className="scribe-outline-point">
                        <CheckCircle2 size={11} color="#52525b" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          {match ? (
                            <>
                              <strong style={{ color: '#fafafa', fontSize: '11.5px' }}>{match[1]}: </strong>
                              <span style={{ color: '#a1a1aa' }}>{match[2]}</span>
                            </>
                          ) : (
                            <span style={{ color: '#d4d4d8' }}>{bullet}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {note.codeSnippet && (
                    <div className="scribe-code-block" style={{ marginTop: '4px' }}>
                      <pre className="scribe-code-content">{note.codeSnippet}</pre>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
