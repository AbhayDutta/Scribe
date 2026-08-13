<div align="center">

# Scribe

### Multimodal note engine for technical YouTube videos

</div>

---

## Overview

Watching long tutorials usually means pausing every few minutes to take notes or copy code from the screen.

Scribe sits inside YouTube and combines what's said with what's on screen into structured, timestamped notes.

- **Spoken audio** — extracts timestamped explanations from captions
- **Screen vision** — captures diagrams, code, and terminal output
- **Synthesis** — merges both into a single structured note
- **Export** — Markdown, PDF, or Word

## Features

- Click any note to jump to that moment in the video
- Manual note capture via hotkey
- Notes highlight in sync with playback
- Export to Markdown / PDF / Word

## Tech Stack

| Layer    | Technology       |
|----------|-------------------|
| Frontend | TypeScript, React |
| Backend  | Go                |
| Storage  | Local storage      |

## Getting Started

**Backend**

```bash
cd backend
cp .env.example .env
go run main.go
```

**Extension**

```bash
cd extension
npm install
npm run build
```

Load `extension/dist` as an unpacked extension in your browser's extensions page.

## Shortcuts

| Shortcut | Action |
|----------|--------|
| Alt + S | Toggle sidebar |
| Alt + N | Quick note capture |

## Status

v1 — local development only.

## License

MIT
