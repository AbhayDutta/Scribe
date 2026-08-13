<div align="center">

# `Scribe`

### Intelligent, multimodal note engine for technical YouTube videos.

<p align="center">
  <img src="https://img.shields.io/badge/Go_1.24-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TS" />
  <img src="https://img.shields.io/badge/Gemini_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/License-MIT-black?style=for-the-badge" alt="License" />
</p>

<p align="center">
  Synthesizes spoken audio transcripts with real-time screen vision into structured, interactive study notes and runnable code blocks.
</p>

---

</div>

## Overview

Watching 2-hour technical lectures or coding tutorials usually means pausing every few minutes to take notes or copy code snippets from the screen.

**Scribe** sits directly inside YouTube:
- 🎙️ **Spoken Audio**: Extracts timestamped explanations from captions.
- 🖥️ **Screen Vision**: Captures slide diagrams, terminal code, and architecture schemas.
- 🧠 **Multimodal Synthesis**: Fuses what the instructor said with what is on screen into structured takeaways.
- 📑 **Export**: Download as **PDF**, **Microsoft Word (`.doc`)**, or **Markdown (`.md`)**.

---

## Key Highlights

- **Dark Mode First**: Clean, pure-zinc interface built with `shadcn/ui` and `Framer Motion`.
- **Active Playback Glow**: Notes subtly illuminate in real-time as the video reaches their timestamp.
- **In-Video Spotlight (`Alt + N`)**: Floating capture modal over the player to jot thoughts without leaving fullscreen.
- **AI Command Assistant**: Ask questions directly against the live video context (*"Summarize slide on screen"*).
- **Dual View Modes**: Switch between chronological **Timeline** and hierarchical **Syllabus Tree**.
- **Cost Guarded**: Built-in token-bucket rate limiting (30 req/min) and session frame caps.

---

## Quickstart

### 1. Start the Backend

```bash
cd backend
cp .env.example .env
# Add GEMINI_API_KEY in .env
go run main.go
```

### 2. Build the Chrome Extension

```bash
cd extension
npm install
npm run build
```

### 3. Load in Chrome

1. Open `chrome://extensions/` and enable **Developer mode**.
2. Click **Load unpacked** and select `extension/dist`.
3. Open any [YouTube Video](https://www.youtube.com/) and press `Alt + S`.

---

## Architecture

```
YouTube Player (Video + Audio)
       │
       ├── Canvas Frame Capture ──┐
       └── Transcript Stream ─────┼──► Scribe Go Backend (Gemini / Claude / GPT-4o)
                                  │           │
                                  │           ▼
                                  └── Dynamic Sidebar & Outline UI
```

---

## Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + S` | Toggle Scribe Sidebar |
| `Alt + N` | In-Video Quick Spotlight Note |
| `Enter` | Save Note |
| `Esc` | Dismiss Spotlight / Modal |

---

## Deploy Backend

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

Deploy instantly using the included [`Dockerfile`](backend/Dockerfile), [`render.yaml`](render.yaml), or [`railway.json`](railway.json).

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/AbhayDutta">Abhay Dutta</a> • Released under the MIT License</sub>
</div>
