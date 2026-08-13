import React from 'react';
import { VideoMetadata, ThemeMode } from '../../types';
import { Plus, Download, Sliders, X, Sparkles, RefreshCw, Sun, Moon, AlertCircle, RotateCcw } from 'lucide-react';

interface HeaderProps {
  metadata: VideoMetadata | null;
  backendOnline: boolean;
  isProcessing: boolean;
  statusMessage?: string;
  errorMessage?: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenManualNote: () => void;
  onGenerateFullNotes: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  onRetry?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  backendOnline,
  isProcessing,
  statusMessage,
  errorMessage,
  theme,
  onToggleTheme,
  onOpenManualNote,
  onGenerateFullNotes,
  onOpenExport,
  onOpenSettings,
  onClose,
  onRetry,
}) => {
  return (
    <div className="scribe-header">
      <div className="scribe-header-top">
        <div className="scribe-brand">
          <div className="scribe-brand-logo">S</div>
          <div>
            <div className="scribe-brand-title">Scribe</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: backendOnline ? '#22c55e' : '#ef4444',
                  boxShadow: backendOnline ? '0 0 6px rgba(34, 197, 94, 0.6)' : 'none',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--scribe-subtle)', fontFamily: 'var(--scribe-font-mono)' }}>
                {backendOnline ? 'online' : 'offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="scribe-header-actions">
          <button
            className="scribe-icon-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button className="scribe-icon-btn" onClick={onOpenSettings} title="Settings">
            <Sliders size={13} />
          </button>
          <button className="scribe-icon-btn" onClick={onOpenExport} title="Export Document">
            <Download size={13} />
          </button>
          <button className="scribe-icon-btn" onClick={onClose} title="Close Sidebar (Alt+S)">
            <X size={14} />
          </button>
        </div>
      </div>

      {metadata?.title && (
        <div className="scribe-video-meta" title={metadata.title}>
          {metadata.title}
        </div>
      )}

      {errorMessage ? (
        <div
          style={{
            fontSize: '10.5px',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontFamily: 'var(--scribe-font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <AlertCircle size={11} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{errorMessage}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 600,
                padding: '1px 4px',
                borderRadius: '3px',
              }}
              title="Retry action"
            >
              <RotateCcw size={10} />
              <span>Retry</span>
            </button>
          )}
        </div>
      ) : statusMessage ? (
        <div
          style={{
            fontSize: '10.5px',
            color: 'var(--scribe-muted-fg)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--scribe-card)',
            border: '1px solid var(--scribe-border)',
            padding: '3px 8px',
            borderRadius: '4px',
            fontFamily: 'var(--scribe-font-mono)',
          }}
        >
          {isProcessing ? (
            <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Sparkles size={10} color="var(--scribe-accent)" />
          )}
          <span>{statusMessage}</span>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          className="scribe-btn-primary"
          style={{ flex: 1 }}
          onClick={onOpenManualNote}
          title="Add manual note (Alt+N)"
        >
          <Plus size={13} />
          <span>Note (Alt+N)</span>
        </button>

        <button
          className="scribe-btn-secondary"
          style={{ flex: 1 }}
          onClick={onGenerateFullNotes}
          disabled={isProcessing}
          title="Extract notes from entire transcript"
        >
          <Sparkles size={12} />
          <span>{isProcessing ? 'Scanning...' : 'Scan Video'}</span>
        </button>
      </div>
    </div>
  );
};
