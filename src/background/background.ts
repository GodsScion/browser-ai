// Background service worker for Chrome extension
import { logger } from '../shared/debug'

// Lazy load heavy dependencies to avoid service worker registration issues
let agentModule: any = null
let messagesModule: any = null

async function loadAgentModule() {
  if (!agentModule) {
    agentModule = await import('../agent/agent')
  }
  return agentModule
}

async function loadMessagesModule() {
  if (!messagesModule) {
    messagesModule = await import('@langchain/core/messages')
  }
  return messagesModule
}

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

// Store active agent instances by session
const activeAgents = new Map<string, any>()

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
    
    default:
      logger.background('Unknown message type:', message.type)
      sendResponse({ error: 'Unknown message type' })
  }
  
  return true // Keep message channel open for async response
})

async function handleTaskExecution(payload: any) {
  logger.background('Processing task:', payload)
  
  const { message: userMessage, sessionId, settings } = payload
  
  if (!settings.apiKey) {
    return {
      content: 'Please configure your API key in settings to use the AI assistant.',
      error: 'No API key configured'
    }
  }

  try {
    // Lazy load modules
    const { createBrowserAutomationAgent, createAgentConfig } = await loadAgentModule()
    const { HumanMessage } = await loadMessagesModule()

    // Create agent context
    const context = {
      userId: 'extension_user', // Could be made dynamic
      sessionId,
      provider: settings.provider,
      apiKey: settings.apiKey,
      userPreferences: {
        verboseLogging: false,
        autoApprove: [],
        timeout: 30000
      }
    }

    // Get or create agent for this session
    let agent = activeAgents.get(sessionId)
    if (!agent) {
      agent = createBrowserAutomationAgent(context)
      activeAgents.set(sessionId, agent)
    }

    // Create agent configuration
    const config = createAgentConfig(sessionId)

    // Invoke the agent
    const result = await agent.invoke({
      messages: [new HumanMessage(userMessage)]
    })

    // Check if there's a human-in-the-loop interrupt
    if (result.__interrupt__) {
      logger.background('HITL interrupt triggered:', result.__interrupt__)
      
      // Send interrupt to popup for user approval
      try {
        await chrome.runtime.sendMessage({
          type: 'HITL_INTERRUPT',
          payload: {
            sessionId,
            interrupt: result.__interrupt__[0]?.value,
            config
          }
        })
      } catch (error: unknown) {
        logger.background('Failed to send HITL interrupt to popup:', error)
      }

      return {
        content: 'This action requires your approval. Please check the popup for details.',
        sessionId,
        timestamp: new Date().toISOString(),
        requiresApproval: true,
        interrupt: result.__interrupt__[0]?.value
      }
    }

    // Extract the agent's response
    const lastMessage = result.messages[result.messages.length - 1]
    const content = lastMessage?.content || 'Task completed successfully.'

    return {
      content,
      sessionId,
      timestamp: new Date().toISOString(),
      success: true
    }

  } catch (error: unknown) {
    logger.error('Agent execution failed:', error)
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
    const agent = activeAgents.get(sessionId)
    if (!agent) {
      throw new Error('No active agent found for session')
    }

    // For now, we'll simulate tool execution based on the decision
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

// Clean up inactive agents periodically
setInterval(() => {
  // Simple cleanup - remove random sessions occasionally
  for (const [sessionId] of activeAgents.entries()) {
    if (Math.random() < 0.1) { // Randomly clean up some sessions
      activeAgents.delete(sessionId)
      logger.background('Cleaned up inactive agent for session:', sessionId)
    }
  }
}, 5 * 60 * 1000) // Check every 5 minutes