import React from 'react';
import { ExtensionSettings } from '../../types';

interface QuickSettingsProps {
  settings: ExtensionSettings;
  onToggleAutoCapture: () => void;
  savedMsg: boolean;
}

export const QuickSettings: React.FC<QuickSettingsProps> = ({
  settings,
  onToggleAutoCapture,
  savedMsg,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
      <div
        style={{
          background: '#121215',
          borderRadius: '8px',
          padding: '10px 12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '11.5px', color: '#fafafa', fontWeight: 500 }}>Auto Screen Capture</div>
          <div style={{ fontSize: '10px', color: '#71717a' }}>Extract slides during playback</div>
        </div>

        <button
          onClick={onToggleAutoCapture}
          style={{
            background: settings.autoCapture ? '#fafafa' : '#27272a',
            border: 'none',
            borderRadius: '12px',
            width: '36px',
            height: '20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '2px',
              left: settings.autoCapture ? '18px' : '2px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: settings.autoCapture ? '#09090b' : '#71717a',
              transition: 'left 0.15s ease',
            }}
          />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          SHORTCUTS
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a1a1aa', background: '#09090b', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
          <span>Toggle Sidebar</span>
          <kbd style={{ background: '#18181b', color: '#fafafa', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontFamily: 'ui-monospace, monospace' }}>Alt + S</kbd>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a1a1aa', background: '#09090b', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
          <span>In-Video Quick Note</span>
          <kbd style={{ background: '#18181b', color: '#fafafa', padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontFamily: 'ui-monospace, monospace' }}>Alt + N</kbd>
        </div>
      </div>

      {savedMsg && (
        <div style={{ fontSize: '10.5px', color: '#22c55e', textAlign: 'center' }}>
          Settings updated!
        </div>
      )}
    </div>
  );
};
