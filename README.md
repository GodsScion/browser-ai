# Browser Automation Assistant

A Chrome extension that enables browser automation through natural language input using AI agents.

## Project Structure

```
├── manifest.json              # Chrome extension manifest
├── popup.html                 # Extension popup HTML
├── package.json              # Node.js dependencies
├── vite.config.ts            # Vite build configuration
├── tsconfig.json             # TypeScript configuration
└── src/
    ├── popup/                # React popup interface
    │   ├── Popup.tsx         # Main popup component
    │   ├── popup.css         # Popup styles
    │   └── main.tsx          # React entry point
    ├── background/           # Background service worker
    │   └── background.ts     # Extension background script
    ├── content/              # Content script for DOM manipulation
    │   └── content.ts        # DOM interaction functions
    └── shared/               # Shared types and utilities
        └── types.ts          # TypeScript interfaces
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Features

- Natural language task input
- AI-powered task interpretation
- Browser automation through DOM manipulation
- User assistance requests for complex scenarios
- Real-time task progress tracking

## Technology Stack

- **Frontend**: React + TypeScript
- **Build Tool**: Vite
- **AI Framework**: Langchain
- **Extension**: Chrome Extension Manifest V3