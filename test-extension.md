# Testing the Browser Automation Extension

## Installation Steps:
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `dist` folder
4. The extension should appear in your extensions list

## Testing Steps:

### 1. Basic UI Test
- Click the extension icon in the Chrome toolbar
- Verify the popup opens with the chat interface
- Check that the header shows "Browser Assistant"
- Verify the hamburger menu, new chat, and settings icons are visible

### 2. Settings Configuration
- Click the settings icon (gear)
- Select either OpenAI or Anthropic as provider
- Enter a valid API key
- Click Save
- Verify settings are saved (close and reopen popup)

### 3. Chat Functionality
- Type a simple message like "Hello, can you help me?"
- Press Enter or click Send
- Verify the message appears on the right side
- Check that an AI response appears on the left side

### 4. Tool Integration Test
- Try a browser automation request like:
  - "Click the search button on this page"
  - "Navigate to google.com"
  - "Take a screenshot of this page"
- Verify that tool calls trigger approval dialogs
- Test approving/rejecting actions

### 5. Session Management
- Create multiple chat sessions using the + button
- Switch between sessions using the hamburger menu
- Verify chat history is preserved
- Test deleting sessions

## Expected Behavior:
- ✅ Extension loads without console errors
- ✅ UI is responsive and functional
- ✅ Settings persist across sessions
- ✅ Chat messages are saved and restored
- ✅ Tool calls require user approval for sensitive actions
- ✅ Agent provides helpful responses about browser automation

## Troubleshooting:
- Check browser console for errors (F12 → Console)
- Verify API keys are valid
- Ensure content script is injected on web pages
- Check extension permissions in manifest.json