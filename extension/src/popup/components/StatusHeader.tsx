import React from 'react';

interface StatusHeaderProps {
  backendOnline: boolean;
  llmProvider: string;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({ backendOnline, llmProvider }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--pop-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: '#fafafa',
            color: '#09090b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          S
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '-0.02em', color: '#fafafa' }}>Scribe</div>
          <div style={{ fontSize: '10.5px', color: '#71717a' }}>AI Video Note Engine</div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 8px',
          borderRadius: '12px',
          background: '#18181b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '10.5px',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: backendOnline ? '#22c55e' : '#ef4444',
            boxShadow: backendOnline ? '0 0 6px rgba(34, 197, 94, 0.6)' : 'none',
          }}
        />
        <span style={{ color: '#a1a1aa' }}>
          {backendOnline ? (llmProvider.includes('(') ? llmProvider.split(' ')[0] : llmProvider) : 'offline'}
        </span>
      </div>
    </div>
  );
};
