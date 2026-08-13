<div align="center">

# Scribe

Generate timestamped notes automatically while watching coding tutorials.

</div>

---

## Overview

Scribe is a browser extension that analyzes video transcript and on-screen content to generate structured, timestamped notes in real time — so you don't have to pause and type while learning.

## Features

- Automatic note generation from video transcript and on-screen content
- Click any note to jump directly to that moment in the video
- Manual note-taking via hotkey
- Export notes as Markdown

## Tech Stack

| Layer      | Technology            |
|------------|------------------------|
| Frontend   | TypeScript, React      |
| Backend    | Go                     |
| Storage    | Local storage           |

## Project Structure
scribe/
├── extension/ # Browser extension (TypeScript, React)
└── backend/ # Go API server

## Getting Started

### Prerequisites

- Node.js v18+
- Go v1.21+

### Backend

```bash
cd backend
cp .env.example .env
go run main.go
```

### Extension

```bash
cd extension
npm install
npm run build
```

Load the `extension/dist` folder as an unpacked extension in your browser's extensions page.

## Status

v1 — local development only.

## License

MIT
