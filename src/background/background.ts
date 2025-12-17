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
      handleTaskExecution(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }))
      break
    
    case 'GET_DOM':
      handleDOMRequest(sender.tab?.id)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }))
      break
    
    default:
      console.log('Unknown message type:', message.type)
      sendResponse({ error: 'Unknown message type' })
  }
  
  return true // Keep message channel open for async response
})

async function handleTaskExecution(payload: any) {
  console.log('Processing task:', payload)
  
  const { sessionId, settings } = payload
  
  // For now, return a mock response
  // TODO: Initialize and run Langchain agent with the provided settings
  
  if (!settings.apiKey) {
    return {
      content: 'Please configure your API key in settings to use the AI assistant.',
      error: 'No API key configured'
    }
  }
  
  // Mock AI response for now
  const responses = [
    "I'll help you automate that task. Let me break it down into steps.",
    "I understand what you want to do. I'll start by analyzing the current page.",
    "That's a great automation idea! Let me get the page information first.",
    "I can help with that. I'll need to interact with the page elements to complete this task.",
    "Perfect! I'll automate that process for you step by step."
  ]
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)]
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    content: randomResponse,
    sessionId,
    timestamp: new Date().toISOString()
  }
}

async function handleDOMRequest(tabId?: number) {
  if (!tabId) {
    throw new Error('No active tab found')
  }
  
  try {
    // Request DOM snapshot from content script
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_DOM_SNAPSHOT' })
    console.log('DOM snapshot received:', response)
    return response
  } catch (error) {
    console.error('Failed to get DOM snapshot:', error)
    throw error
  }
}