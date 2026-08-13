import React from 'react';
import { RecentVideoSession } from '../../types';
import { Play, Clock, BookOpen } from 'lucide-react';

interface RecentVideosListProps {
  sessions: RecentVideoSession[];
  onOpenVideo: (url: string) => void;
}

export const RecentVideosList: React.FC<RecentVideosListProps> = ({ sessions, onOpenVideo }) => {
  if (sessions.length === 0) {
    return (
      <div
        style={{
          background: '#09090b',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          textAlign: 'center',
          color: '#71717a',
        }}
      >
        <BookOpen size={18} />
        <div style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 500 }}>No video history yet</div>
        <div style={{ fontSize: '10.5px' }}>Videos with notes will appear here automatically.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10.5px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          RECENT NOTE SESSIONS
        </span>
        <span style={{ fontSize: '10.5px', color: '#71717a', fontFamily: 'ui-monospace, monospace' }}>
          {sessions.length}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '160px',
          overflowY: 'auto',
          paddingRight: '2px',
        }}
      >
        {sessions.slice(0, 8).map((session) => (
          <div
            key={session.videoId}
            onClick={() => onOpenVideo(session.url)}
            style={{
              background: '#121215',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '6px',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={session.title}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: '#fafafa',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {session.title}
              </div>
              <div style={{ fontSize: '10px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Clock size={9} />
                <span>{formatRelativeTime(session.lastWatched)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'ui-monospace, monospace',
                  background: '#18181b',
                  color: '#a1a1aa',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {session.noteCount} pts
              </span>
              <Play size={10} color="#71717a" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
