import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExtensionSettings, DEFAULT_SETTINGS } from '../../types';
import { getSettings, saveSettings } from '../../utils/storage';
import { X, Check, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getSettings().then(setSettings);
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={15} color="var(--scribe-text)" />
                <div className="scribe-modal-title">Settings</div>
              </div>
              <button
                onClick={onClose}
                className="scribe-icon-btn"
                style={{ width: '24px', height: '24px' }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--scribe-muted-fg)', display: 'block', marginBottom: '3px' }}>
                  Backend Server URL
                </label>
                <input
                  type="text"
                  className="scribe-input"
                  value={settings.backendUrl}
                  onChange={(e) => setSettings({ ...settings, backendUrl: e.target.value })}
                  placeholder="http://localhost:8080"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--scribe-muted-fg)', display: 'block', marginBottom: '3px' }}>
                  LLM Provider
                </label>
                <select
                  className="scribe-input"
                  style={{ cursor: 'pointer' }}
                  value={settings.llmProvider}
                  onChange={(e: any) => setSettings({ ...settings, llmProvider: e.target.value })}
                >
                  <option value="gemini">Google Gemini (Recommended)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="claude">Anthropic Claude</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--scribe-muted-fg)', display: 'block', marginBottom: '3px' }}>
                  Theme
                </label>
                <select
                  className="scribe-input"
                  style={{ cursor: 'pointer' }}
                  value={settings.theme || 'dark'}
                  onChange={(e: any) => setSettings({ ...settings, theme: e.target.value })}
                >
                  <option value="dark">Dark Theme (Default)</option>
                  <option value="light">Light Theme</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--scribe-text)', fontWeight: 500 }}>Auto-Capture Screen</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--scribe-subtle)' }}>Extract visual slides while playing</div>
                </div>
                <input
                  type="checkbox"
                  style={{ accentColor: 'var(--scribe-accent)', cursor: 'pointer', width: '16px', height: '16px' }}
                  checked={settings.autoCapture}
                  onChange={(e) => setSettings({ ...settings, autoCapture: e.target.checked })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                <button type="button" className="scribe-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="scribe-btn-primary">
                  {isSaved ? <Check size={13} color="#22c55e" /> : null}
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
