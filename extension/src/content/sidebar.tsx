import { createRoot, Root } from 'react-dom/client';
import { Sidebar } from './components/Sidebar';
import sidebarCss from './styles/sidebar.css?raw';

let reactRoot: Root | null = null;
let isInitialized = false;
let keeperInterval: number | null = null;

function injectStyles() {
  if (!document.getElementById('scribe-injected-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'scribe-injected-styles';
    styleEl.textContent = sidebarCss;
    (document.head || document.documentElement).appendChild(styleEl);
  }
}

export function initSidebar() {
  if (isInitialized) return;
  isInitialized = true;

  injectStyles();

  const mount = () => {
    injectStyles();

    const containerId = 'scribe-sidebar-root';
    let container = document.getElementById(containerId);

    if (!container) {
      if (!document.body) {
        setTimeout(mount, 150);
        return;
      }

      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.right = '0';
      container.style.height = '100vh';
      container.style.zIndex = '2147483647';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      try {
        reactRoot = createRoot(container);
        reactRoot.render(<Sidebar />);
        console.log('%c[Scribe]%c Sidebar mounted successfully.', 'background:#6366f1;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;', '');
      } catch (err) {
        console.error('[Scribe] Failed to mount React Sidebar:', err);
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // Single periodic check to re-inject if YouTube SPA navigation clears DOM
  if (keeperInterval) {
    clearInterval(keeperInterval);
  }
  keeperInterval = window.setInterval(() => {
    const containerId = 'scribe-sidebar-root';
    if (!document.getElementById(containerId) && document.body) {
      mount();
    }
    injectStyles();
    injectYouTubePlayerButton();
  }, 1000);
}

/**
 * Injects a dedicated Scribe toggle button inside YouTube's video player control bar
 */
function injectYouTubePlayerButton() {
  const controls = document.querySelector('.ytp-right-controls');
  if (!controls || document.querySelector('.scribe-ytp-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'ytp-button scribe-ytp-btn';
  btn.title = 'Scribe AI Notes (Alt+S)';
  btn.setAttribute('aria-label', 'Scribe AI Notes');
  btn.style.width = '36px';
  btn.style.height = '100%';
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.cursor = 'pointer';
  btn.style.verticalAlign = 'top';
  btn.style.background = 'transparent';
  btn.style.border = 'none';

  btn.innerHTML = `
    <div style="width:24px;height:24px;border-radius:6px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:12px;box-shadow:0 0 8px rgba(99,102,241,0.6);">
      S
    </div>
  `;

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('scribe:toggle_sidebar'));
    chrome.runtime.sendMessage({ action: 'PING' }).catch(() => {});
  };

  // Prepend before settings/fullscreen buttons
  controls.insertBefore(btn, controls.firstChild);
}
