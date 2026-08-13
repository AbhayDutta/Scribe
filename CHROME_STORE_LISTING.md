# 🚀 Chrome Web Store Publishing Guide for Scribe

Use this pre-filled checklist and copy-paste text to publish Scribe to the official **Chrome Web Store**.

---

## 📦 Zip File to Upload
- **Path**: `extension/scribe-extension-v1.0.0.zip`
- *To regenerate anytime, run:* `npm run package` in `extension/`

---

## 📝 1. Store Listing Details

### Extension Name
```
Scribe — AI Video Notes for YouTube
```

### Short Description (Max 132 chars)
```
Automatically generates structured developer notes from YouTube tutorials using audio transcripts and live screen vision analysis.
```

### Detailed Description (Formatted with Markdown/Text)
```
Scribe turns any technical YouTube tutorial or lecture into structured, clean developer notes with live screen vision and audio transcript synthesis.

Watching 2-hour technical lectures or coding tutorials usually means pausing every few minutes to take notes or copy code snippets from the screen. Scribe automatically watches alongside you:

🎙️ Spoken Audio Analysis: Extracts timestamped explanations from captions.
🖥️ Screen Vision: Captures slide diagrams, terminal code, and architecture schemas.
🧠 Multimodal AI Synthesis: Fuses what the instructor said with what is on screen into structured takeaways, numbered key points, and runnable code blocks.
📑 Instant Multi-Format Exports: Download notes as PDF Documents, Microsoft Word (.doc), or Markdown (.md).

✨ KEY FEATURES:
• Dark Mode First: Pure-zinc black interface (#09090b) built with shadcn/ui.
• Synced Active Playback: Notes glow in real-time as the video reaches their timestamp.
• In-Video Spotlight (Alt + N): Floating capture modal directly over the video player to jot thoughts without leaving fullscreen.
• Interactive AI Assistant: Type "Summarize slide on screen" or "Extract algorithm steps" to query Google Gemini live on current video context.
• Syllabus Tree & Timeline: Switch between chronological Timeline and hierarchical Chapter Tree.
• Recent Watch History: Quickly browse and review notes from previously watched tutorials.

⌨️ KEYBOARD SHORTCUTS:
• Alt + S: Toggle Scribe Sidebar
• Alt + N: Open In-Video Spotlight Quick Note
• Enter: Save Note
• Esc: Dismiss Quick Note / Close Modal

🛡️ PRIVACY & OPEN SOURCE:
Scribe is 100% open-source under the MIT License. Your data is stored locally in your browser (chrome.storage.local).
GitHub Repository: https://github.com/AbhayDutta/Scribe
```

---

## 🏷️ 2. Category & Language
- **Primary Category**: `Productivity` (or `Developer Tools`)
- **Language**: `English`

---

## 🔒 3. Privacy Practices (Required by Google)

### Single Purpose Declaration:
> *"Scribe helps users take timestamped, structured study and coding notes while watching YouTube technical videos by analyzing audio transcripts and video frames."*

### Permissions Justification:
1. **`storage`**: *"Used to save your notes, recent video history, and UI theme preferences locally in your browser."*
2. **`activeTab` & `tabs`**: *"Used to detect the current YouTube video title, duration, and timestamp when taking notes."*
3. **`scripting`**: *"Used to inject the minimal Scribe sidebar UI and YouTube player toggle button into YouTube watch pages."*
4. **Host permissions (`youtube.com`, `onrender.com`)**: *"Used to capture video frame deltas and communicate with the Scribe backend API."*

### Data Usage Questionnaire:
- **Do you sell user data?**: No
- **Do you use or transfer data for purposes unrelated to the extension?**: No
- **Do you use data to determine creditworthiness?**: No

---

## 🖼️ 4. Store Graphics & Icon

1. **Store Icon (128x128 PNG)**:
   - Found at: `extension/public/icons/icon128.png`
2. **Screenshots (1280x800 or 640x400 PNG)**:
   - Take 2-4 clean screenshots showing:
     - 1. Dark Mode Sidebar alongside a YouTube coding video with structured bullet points and code snippet.
     - 2. In-Video Spotlight Quick Capture (`Alt + N`) overlay over the player.
     - 3. Syllabus Tree view and Export modal (PDF/Word/Markdown).
     - 4. Extension Popup showing recent videos and live backend status.

---

## 🚀 5. How to Submit to Chrome Web Store (Step-by-Step)

1. Open the **[Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)**.
2. Sign in with your Google account. *(If it's your first time, Google charges a one-time $5 developer registration fee)*.
3. Click **"+ New Item"**.
4. Drag & drop **`extension/scribe-extension-v1.0.0.zip`**.
5. Paste the **Store Listing Details** and **Privacy Practices** from above.
6. Upload the **128x128 icon** and **screenshots**.
7. Click **"Submit for Review"**!

> ⏱️ Google's automated + human review typically takes **24 to 48 hours**. Once approved, your extension will be live on the Chrome Web Store with a direct install link for millions of users!
