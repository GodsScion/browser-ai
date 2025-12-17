// Background service worker for Chrome extension
import { logger } from '../shared/debug'

// Polyfill for service worker environment (LangChain modules may expect DOM)
if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({}),
    getElementsByTagName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
    head: { appendChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {}
  }
}

if (typeof window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    location: { href: '' }
  }
}

// Note: AI processing moved to popup context to avoid DOM issues in service worker

// Helper function to format errors safely
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Global error handler for service worker
self.addEventListener('error', (event) => {
  console.error('Service worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service worker unhandled rejection:', event.reason)
})

logger.background('Browser Automation Assistant background script loaded')

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  logger.background('Browser Automation Assistant installed')
})

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.background('Background received message:', message)
  
  switch (message.type) {
    case 'EXECUTE_TASK':
      handleTaskExecution(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: formatError(error) }))
      break
    
    case 'GET_DOM':
      handleDOMRequest(sender.tab?.id)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: formatError(error) }))
      break
    
    case 'APPROVE_HITL':
      handleHITLResponse(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: formatError(error) }))
      break
    
    case 'INJECT_CONTENT_SCRIPT':
      handleContentScriptInjection(message.tabId)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: formatError(error) }))
      break
    
    default:
      logger.background('Unknown message type:', message.type)
      sendResponse({ error: 'Unknown message type' })
  }
  
  return true // Keep message channel open for async response
})

async function handleTaskExecution(payload: any) {
  logger.background('Processing task:', payload)
  
  const { sessionId } = payload
  
  try {

    // AI processing is now handled directly in popup context
    // Background script should not try to delegate back to popup
    logger.background('AI processing should be handled in popup context')
    
    return {
      content: 'AI processing is handled in popup context. This message should not appear.',
      sessionId,
      timestamp: new Date().toISOString(),
      error: 'Background script should not handle AI processing'
    }

  } catch (error: unknown) {
    logger.error('Task execution failed:', error)
    return {
      content: `I encountered an error: ${formatError(error)}. Please try again or check your settings.`,
      sessionId,
      timestamp: new Date().toISOString(),
      error: formatError(error)
    }
  }
}

async function handleHITLResponse(payload: any) {
  logger.background('Processing HITL response:', payload)
  
  const { sessionId, decisions } = payload
  
  try {
    // Since agents are now managed in popup context, we'll delegate HITL responses too
    const decision = decisions[0]
    let content = 'Action completed successfully.'
    
    if (decision.type === 'approve') {
      content = 'Action approved and executed successfully.'
    } else if (decision.type === 'reject') {
      content = 'Action was rejected by user.'
    } else if (decision.type === 'edit') {
      content = 'Action was modified and executed successfully.'
    }

    return {
      content,
      sessionId,
      timestamp: new Date().toISOString(),
      success: true
    }

  } catch (error: unknown) {
    logger.error('HITL response handling failed:', error)
    return {
      content: `Failed to process your decision: ${formatError(error)}`,
      sessionId,
      timestamp: new Date().toISOString(),
      error: formatError(error)
    }
  }
}

async function handleDOMRequest(tabId?: number) {
  if (!tabId) {
    throw new Error('No active tab found')
  }
  
  try {
    // Request DOM snapshot from content script
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_DOM_SNAPSHOT' })
    logger.background('DOM snapshot received:', response)
    return response
  } catch (error: unknown) {
    logger.error('Failed to get DOM snapshot:', error)
    throw error
  }
}

async function handleContentScriptInjection(tabId: number) {
  try {
    logger.background('Injecting content script into tab:', tabId)
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    })
    return { success: true, message: 'Content script injected successfully' }
  } catch (error: unknown) {
    logger.error('Failed to inject content script:', error)
    throw error
  }
}

// Note: Agent management moved to popup context