// Background service worker for Chrome extension
console.log('Browser Automation Assistant background script loaded')

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Browser Automation Assistant installed')
})

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message)
  
  switch (message.type) {
    case 'EXECUTE_TASK':
      // TODO: Process task with AI agent
      handleTaskExecution(message.payload)
      break
    
    case 'GET_DOM':
      // TODO: Request DOM from content script
      handleDOMRequest(sender.tab?.id)
      break
    
    default:
      console.log('Unknown message type:', message.type)
  }
  
  return true // Keep message channel open for async response
})

async function handleTaskExecution(taskDescription: string) {
  console.log('Processing task:', taskDescription)
  // TODO: Initialize and run Langchain agent
}

async function handleDOMRequest(tabId?: number) {
  if (!tabId) return
  
  try {
    // TODO: Request DOM snapshot from content script
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_DOM_SNAPSHOT' })
    console.log('DOM snapshot received:', response)
  } catch (error) {
    console.error('Failed to get DOM snapshot:', error)
  }
}