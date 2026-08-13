import React from 'react';
import { Sparkles, Video, Keyboard } from 'lucide-react';

interface EmptyStateProps {
  onScanClick: () => void;
  isProcessing: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onScanClick, isProcessing }) => {
  return (
    <div className="scribe-empty-state">
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'var(--scribe-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--scribe-text)',
          border: '1px solid var(--scribe-border)',
          marginBottom: '4px',
        }}
      >
        <Sparkles size={20} color="var(--scribe-accent)" />
      </div>

      <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--scribe-text)' }}>
        Notes will appear as the video plays
      </div>

      <div style={{ fontSize: '11.5px', color: 'var(--scribe-muted-fg)', maxWidth: '260px', lineHeight: '1.45' }}>
        Scribe combines spoken audio transcript and live screen analysis to generate structured study notes.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '240px', marginTop: '10px' }}>
        <button
          className="scribe-btn-primary"
          style={{ width: '100%', padding: '7px', fontSize: '11.5px' }}
          onClick={onScanClick}
          disabled={isProcessing}
        >
          <Video size={13} />
          <span>{isProcessing ? 'Analyzing Video...' : 'Scan Transcript & Video'}</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '10.5px',
            color: 'var(--scribe-subtle)',
            fontFamily: 'var(--scribe-font-mono)',
            marginTop: '4px',
          }}
        >
          <Keyboard size={12} />
          <span>Press Alt+N for quick note</span>
        </div>
      </div>
    </div>
  );
};
