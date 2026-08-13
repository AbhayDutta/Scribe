import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { checkBackendHealth } from '../utils/api';
import { getSettings, saveSettings, getAllRecentSessions, getNotes } from '../utils/storage';
import { ExtensionSettings, DEFAULT_SETTINGS, RecentVideoSession } from '../types';
import { StatusHeader } from './components/StatusHeader';
import { CurrentVideoCard } from './components/CurrentVideoCard';
import { RecentVideosList } from './components/RecentVideosList';
import { QuickSettings } from './components/QuickSettings';

export const Popup: React.FC = () => {
  const [backendOnline, setBackendOnline] = useState(false);
  const [llmProvider, setLlmProvider] = useState<string>('gemini');
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [recentSessions, setRecentSessions] = useState<RecentVideoSession[]>([]);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [currentNoteCount, setCurrentNoteCount] = useState<number>(0);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    checkHealth();
    loadData();
    detectActiveTab();
  }, []);

  async function checkHealth() {
    const result = await checkBackendHealth();
    setBackendOnline(result.status === 'online');
    if (result.provider) {
      setLlmProvider(result.provider);
    }
  }

  async function loadData() {
    const s = await getSettings();
    setSettings(s);
    const sessions = await getAllRecentSessions();
    setRecentSessions(sessions);
  }

  async function detectActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
        const url = new URL(tab.url);
        const videoId = url.searchParams.get('v');
        if (videoId) {
          const notes = await getNotes(videoId);
          setCurrentNoteCount(notes.length);
          setCurrentTitle(tab.title ? tab.title.replace(' - YouTube', '').trim() : `Video ${videoId}`);
        }
      }
    } catch (e) {
      console.warn('Could not detect active tab:', e);
    }
  }

  async function handleToggleAutoCapture() {
    const updated = await saveSettings({ autoCapture: !settings.autoCapture });
    setSettings(updated);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  }

  function handleOpenSidebar() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_SIDEBAR' }).catch(() => {});
        window.close();
      }
    });
  }

  function handleOpenVideo(url: string) {
    chrome.tabs.create({ url });
  }

  return (
    <div
      style={{
        width: '320px',
        padding: '14px',
        background: '#09090b',
        color: '#fafafa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Geist", "Inter", "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <StatusHeader backendOnline={backendOnline} llmProvider={llmProvider} />

      <CurrentVideoCard
        currentTitle={currentTitle}
        noteCount={currentNoteCount}
        onOpenSidebar={handleOpenSidebar}
      />

      <RecentVideosList sessions={recentSessions} onOpenVideo={handleOpenVideo} />

      <QuickSettings
        settings={settings}
        onToggleAutoCapture={handleToggleAutoCapture}
        savedMsg={savedMsg}
      />
    </div>
  );
};

const root = createRoot(document.getElementById('popup-root')!);
root.render(<Popup />);
