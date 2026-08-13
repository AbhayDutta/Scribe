import React from 'react';
import { Layers, Sparkles } from 'lucide-react';

interface CurrentVideoCardProps {
  currentTitle: string | null;
  noteCount: number;
  onOpenSidebar: () => void;
}

export const CurrentVideoCard: React.FC<CurrentVideoCardProps> = ({
  currentTitle,
  noteCount,
  onOpenSidebar,
}) => {
  if (!currentTitle) {
    return (
      <div
        style={{
          background: '#121215',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Active Video
        </div>
        <div style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.4' }}>
          Open any YouTube coding tutorial to view live notes.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#121215',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={11} />
          NOW WATCHING
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'ui-monospace, monospace',
            background: '#18181b',
            padding: '1px 6px',
            borderRadius: '4px',
            color: '#fafafa',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </span>
      </div>

      <div
        style={{
          fontSize: '12.5px',
          fontWeight: 600,
          color: '#fafafa',
          lineHeight: '1.35',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        title={currentTitle}
      >
        {currentTitle}
      </div>

      <button
        onClick={onOpenSidebar}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '7px 12px',
          background: '#fafafa',
          color: '#09090b',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'opacity 0.15s ease',
        }}
      >
        <Layers size={13} />
        <span>Open Notes in Sidebar</span>
      </button>
    </div>
  );
};
