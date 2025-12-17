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

4. For development with auto-rebuild:
   ```bash
   npm run build:watch
   ```

5. For debugging, see [DEBUGGING.md](./DEBUGGING.md) for comprehensive guide

## Usage

1. Click the extension icon in Chrome toolbar
2. Configure your AI provider and API key in settings (⚙️ icon)
3. Start a new chat and describe what you want to automate
4. The AI assistant will help you automate browser tasks step by step

## UI Features

- **Chat Interface**: User messages on right, AI responses on left
- **Session Management**: Create new chats, view chat history
- **Settings**: Configure OpenAI or Anthropic API keys
- **Responsive Design**: Clean, modern interface optimized for extension popup

## Troubleshooting

### Blank Popup Issue
If the popup appears blank:
1. Open Chrome DevTools on the popup (right-click popup → Inspect)
2. Check for JavaScript errors in the Console tab
3. Go to Settings (⚙️) and click "Clear All Data" to reset
4. Reload the extension in `chrome://extensions/`

### Data Issues
- The extension automatically handles data migration between versions
- If you encounter persistent issues, use the "Clear All Data" button in settings
- Chat history is stored locally in Chrome's extension storage

### API Configuration
- Make sure to set your API key in Settings before using the assistant
- Supported providers: OpenAI and Anthropic
- API keys are stored securely in Chrome's local storage

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