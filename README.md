# Aspire Browser

A clean, secure, and meditative browser built for the Aspire community. Inspired by Opera Air's calm design philosophy.

![Aspire Logo](aspire-logo.png)

## Features

- **Modern, High-End UI** — Minimal, clean interface with smooth animations and multiple themes
- **AI Assistant** — Built-in Aspire AI (powered by Groq) in the sidebar for creative help, build advice, and chat
- **Guild Chat** — Integrated guild chat bridge connecting to your Hypixel guild and Discord
- **Quick Access** — One-click access to Pinterest, YouTube, and your favorite sites
- **Privacy & Security** — Built-in tracker blocking, ad blocking, and HTTPS-only mode
- **Customization** — Multiple themes (Dark, Light, Midnight, Aurora), accent colors, and personalization
- **Tab Management** — Smooth, modern tab bar with loading indicators

## Themes

| Theme | Description |
|-------|-------------|
| Dark | Default, clean dark mode |
| Light | Bright and minimal |
| Midnight | Deep, immersive dark |
| Aurora | Cool tones, nature-inspired |

## Quick Start

```bash
# Install dependencies
npm install

# Run the browser
npm start
```

## Build for Distribution

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Configuration

### AI Assistant
1. Get a free API key from [Groq](https://console.groq.com)
2. Open Settings (gear icon) → AI Assistant → paste your API key
3. Choose a personality (Creative, Professional, Playful, or Mentor)

### Guild Chat
The guild chat panel connects to the Aspire Guild bridge. Messages sync between the browser, Discord, and Hypixel guild chat.

### Security Settings
- **Block Trackers** — Blocks known tracking domains
- **HTTPS Only** — Enforces secure connections
- **Block Ads** — Removes advertising content

## Tech Stack

- **Electron** — Chromium-based desktop app framework
- **Custom Chrome UI** — No default browser chrome; fully custom design
- **Groq AI** — Fast LLM inference for the AI assistant
- **electron-store** — Persistent settings storage

## For the Guild

This browser is built for the Aspire guild community. Share it with guild members for a unified browsing experience with built-in guild tools.

## License

MIT
