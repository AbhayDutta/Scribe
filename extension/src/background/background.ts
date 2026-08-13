// Background Service Worker for Scribe Extension (Manifest V3)

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Scribe Background] Scribe extension installed:', details.reason);
});

// Handle commands (keyboard shortcuts)
chrome.commands.onCommand.addListener((command) => {
  console.log('[Scribe Background] Command received:', command);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0 || tabs[0].id === undefined) return;
    const tabId = tabs[0].id;

    if (command === 'toggle-sidebar') {
      chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_SIDEBAR' }, () => {
        if (chrome.runtime.lastError) {
          // Ignored if tab has not injected script yet
        }
      });
    } else if (command === 'capture-note') {
      chrome.tabs.sendMessage(tabId, { action: 'TRIGGER_MANUAL_NOTE' }, () => {
        if (chrome.runtime.lastError) {
          // Ignored if tab has not injected script yet
        }
      });
    }
  });
});

// Handle message passing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CAPTURE_VISIBLE_TAB') {
    // Capture visible tab as fallback for video canvas cross-origin constraints
    const windowId = sender.tab?.windowId;
    chrome.tabs.captureVisibleTab(
      windowId ?? chrome.windows.WINDOW_ID_CURRENT,
      { format: 'jpeg', quality: 75 },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.warn('[Scribe Background] Tab capture error:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, dataUrl });
        }
      }
    );
    return true; // async sendResponse
  }

  if (message.action === 'PING') {
    sendResponse({ status: 'pong', version: '1.0.0' });
    return true;
  }
});
