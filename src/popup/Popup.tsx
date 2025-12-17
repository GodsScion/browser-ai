import React, { useState, useRef, useEffect } from 'react'
import { HamburgerIcon, PlusIcon, SettingsIcon, CloseIcon, TrashIcon, SendIcon } from './components/Icons'
import { logger } from '../shared/debug'
import './popup.css'

interface Message {
  id: string
  content: string
  type: 'user' | 'ai'
  timestamp: Date
}

interface ChatSession {
  id: string
  name: string
  messages: Message[]
  createdAt: Date
}

interface Settings {
  provider: 'openai' | 'anthropic'
  apiKey: string
}

export default function Popup() {
  const [input, setInput] = useState('')
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<any>(null)
  const [settings, setSettings] = useState<Settings>({
    provider: 'openai',
    apiKey: ''
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const formatTimestamp = (timestamp: Date | string) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
      return date.toLocaleTimeString()
    } catch (error: unknown) {
      return new Date().toLocaleTimeString()
    }
  }

  useEffect(() => {
    // Load saved data from chrome storage
    logger.popup('Popup initializing...')
    loadStoredData()

    // Listen for HITL interrupts from background script
    const handleMessage = (message: any) => {
      if (message.type === 'HITL_INTERRUPT') {
        logger.popup('Received HITL interrupt:', message.payload)
        setPendingApproval(message.payload)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [currentSession?.messages])

  const loadStoredData = async () => {
    try {
      const result = await chrome.storage.local.get(['chatSessions', 'settings', 'currentSessionId', 'dataVersion'])
      
      // Check if we need to migrate or clear old data
      const currentDataVersion = '1.0'
      if (result.dataVersion && result.dataVersion !== currentDataVersion) {
        logger.popup('Data version mismatch, clearing old data')
        await chrome.storage.local.clear()
        await chrome.storage.local.set({ dataVersion: currentDataVersion })
        setIsInitialized(true)
        return
      }
      
      if (result.chatSessions && Array.isArray(result.chatSessions)) {
        // Convert timestamp strings back to Date objects
        const sessionsWithDates = result.chatSessions.map((session: any) => {
          try {
            return {
              ...session,
              createdAt: new Date(session.createdAt || Date.now()),
              messages: (session.messages || []).map((message: any) => ({
                ...message,
                timestamp: new Date(message.timestamp || Date.now())
              }))
            }
          } catch (sessionError) {
            console.error('Error processing session:', sessionError)
            return {
              id: session.id || Date.now().toString(),
              name: session.name || 'Corrupted Chat',
              messages: [],
              createdAt: new Date()
            }
          }
        })
        setChatSessions(sessionsWithDates)
        logger.popup('Loaded chat sessions:', sessionsWithDates.length)
        
        if (result.currentSessionId) {
          const session = sessionsWithDates.find((s: ChatSession) => s.id === result.currentSessionId)
          if (session) {
            setCurrentSession(session)
            logger.popup('Restored current session:', session.name)
          }
        }
      }
      if (result.settings) {
        setSettings(result.settings)
      }
      
      // Set data version if not present
      if (!result.dataVersion) {
        await chrome.storage.local.set({ dataVersion: '1.0' })
      }
    } catch (error: unknown) {
      console.error('Failed to load stored data:', error)
      // Reset to clean state if there's a critical error
      setChatSessions([])
      setCurrentSession(null)
      setSettings({ provider: 'openai', apiKey: '' })
    } finally {
      setIsInitialized(true)
    }
  }

  const saveToStorage = async (sessions: ChatSession[], currentSessionId?: string) => {
    try {
      await chrome.storage.local.set({
        chatSessions: sessions,
        currentSessionId: currentSessionId || currentSession?.id,
        dataVersion: '1.0'
      })
    } catch (error: unknown) {
      console.error('Failed to save to storage:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      name: `Chat ${chatSessions.length + 1}`,
      messages: [],
      createdAt: new Date()
    }
    const updatedSessions = [...chatSessions, newSession]
    setChatSessions(updatedSessions)
    setCurrentSession(newSession)
    setShowSidebar(false)
    saveToStorage(updatedSessions, newSession.id)
  }

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session)
    setShowSidebar(false)
    saveToStorage(chatSessions, session.id)
  }

  const deleteSession = (sessionId: string) => {
    const updatedSessions = chatSessions.filter(s => s.id !== sessionId)
    setChatSessions(updatedSessions)
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(updatedSessions.length > 0 ? updatedSessions[0] : null)
    }
    
    saveToStorage(updatedSessions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    let session = currentSession
    if (!session) {
      session = {
        id: Date.now().toString(),
        name: input.substring(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date()
      }
      setCurrentSession(session)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: 'user',
      timestamp: new Date()
    }

    const updatedMessages = [...session.messages, userMessage]
    const updatedSession = { ...session, messages: updatedMessages }
    setCurrentSession(updatedSession)

    // Update sessions list
    const updatedSessions = currentSession 
      ? chatSessions.map(s => s.id === session.id ? updatedSession : s)
      : [...chatSessions, updatedSession]
    setChatSessions(updatedSessions)

    setInput('')
    setIsLoading(true)

    // Send to background script for AI processing
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_TASK',
        payload: {
          message: input,
          sessionId: session.id,
          settings
        }
      })

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response?.content || 'I understand your request. Let me help you automate this task.',
        type: 'ai',
        timestamp: new Date()
      }

      const finalMessages = [...updatedMessages, aiMessage]
      const finalSession = { ...updatedSession, messages: finalMessages }
      setCurrentSession(finalSession)

      const finalSessions = updatedSessions.map(s => s.id === session.id ? finalSession : s)
      setChatSessions(finalSessions)
      saveToStorage(finalSessions, session.id)

    } catch (error: unknown) {
      console.error('Failed to process message:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please check your settings and try again.',
        type: 'ai',
        timestamp: new Date()
      }

      const errorMessages = [...updatedMessages, errorMessage]
      const errorSession = { ...updatedSession, messages: errorMessages }
      setCurrentSession(errorSession)

      const errorSessions = updatedSessions.map(s => s.id === session.id ? errorSession : s)
      setChatSessions(errorSessions)
      saveToStorage(errorSessions, session.id)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      await chrome.storage.local.set({ settings })
      setShowSettings(false)
    } catch (error: unknown) {
      console.error('Failed to save settings:', error)
    }
  }

  const clearAllData = async () => {
    try {
      await chrome.storage.local.clear()
      setChatSessions([])
      setCurrentSession(null)
      setSettings({ provider: 'openai', apiKey: '' })
    } catch (error: unknown) {
      console.error('Failed to clear data:', error)
    }
  }

  const handleApproval = async (decision: 'approve' | 'edit' | 'reject', editedArgs?: any) => {
    if (!pendingApproval) return

    try {
      const decisions = [{
        type: decision,
        ...(decision === 'edit' && editedArgs ? { args: editedArgs } : {})
      }]

      const response = await chrome.runtime.sendMessage({
        type: 'APPROVE_HITL',
        payload: {
          sessionId: pendingApproval.sessionId,
          decisions,
          config: pendingApproval.config
        }
      })

      // Add the response as an AI message
      if (currentSession && response.content) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: response.content,
          type: 'ai',
          timestamp: new Date()
        }

        const updatedMessages = [...currentSession.messages, aiMessage]
        const updatedSession = { ...currentSession, messages: updatedMessages }
        setCurrentSession(updatedSession)

        const updatedSessions = chatSessions.map(s => 
          s.id === currentSession.id ? updatedSession : s
        )
        setChatSessions(updatedSessions)
        saveToStorage(updatedSessions, currentSession.id)
      }

      setPendingApproval(null)
    } catch (error: unknown) {
      console.error('Failed to handle approval:', error)
    }
  }

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="popup-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="header">
        <button 
          className="icon-button hamburger"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <HamburgerIcon />
        </button>
        <button 
          className="icon-button new-chat"
          onClick={createNewSession}
        >
          <PlusIcon />
        </button>
        <div className="header-title">Browser Assistant</div>
        <button 
          className="icon-button settings"
          onClick={() => setShowSettings(!showSettings)}
        >
          <SettingsIcon />
        </button>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}>
          <div className="sidebar" onClick={e => e.stopPropagation()}>
            <div className="sidebar-header">
              <h3>Chat History</h3>
              <button 
                className="close-button"
                onClick={() => setShowSidebar(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="chat-list">
              {chatSessions.map(session => (
                <div 
                  key={session.id}
                  className={`chat-item ${currentSession?.id === session.id ? 'active' : ''}`}
                >
                  <div 
                    className="chat-name"
                    onClick={() => selectSession(session)}
                  >
                    {session.name}
                  </div>
                  <button 
                    className="delete-chat"
                    onClick={() => deleteSession(session.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
              {chatSessions.length === 0 && (
                <div className="empty-state">No chat sessions yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Settings</h3>
              <button 
                className="close-button"
                onClick={() => setShowSettings(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="modal-content">
              <div className="setting-group">
                <label>AI Provider</label>
                <select 
                  value={settings.provider}
                  onChange={(e) => setSettings({...settings, provider: e.target.value as 'openai' | 'anthropic'})}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div className="setting-group">
                <label>API Key</label>
                <input 
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                  placeholder="Enter your API key"
                />
              </div>
              <div className="modal-actions">
                <button onClick={saveSettings} className="save-button">
                  Save
                </button>
                <button onClick={() => setShowSettings(false)} className="cancel-button">
                  Cancel
                </button>
              </div>
              <div className="debug-section">
                <button 
                  onClick={clearAllData} 
                  className="clear-data-button"
                  title="Clear all chat history and settings"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Human-in-the-Loop Approval Modal */}
      {pendingApproval && (
        <div className="modal-overlay">
          <div className="modal approval-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 Action Approval Required</h3>
            </div>
            <div className="modal-content">
              <div className="approval-content">
                <p><strong>The AI wants to perform this action:</strong></p>
                {pendingApproval.interrupt?.action_requests?.map((request: any, index: number) => (
                  <div key={index} className="action-request">
                    <div className="action-name">{request.name}</div>
                    <div className="action-description">{request.description}</div>
                    <pre className="action-args">{JSON.stringify(request.arguments, null, 2)}</pre>
                  </div>
                ))}
              </div>
              <div className="approval-actions">
                <button 
                  onClick={() => handleApproval('approve')}
                  className="approve-button"
                >
                  ✅ Approve
                </button>
                <button 
                  onClick={() => handleApproval('reject')}
                  className="reject-button"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="chat-container">
        {currentSession?.messages.map(message => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-time">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="message-content loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        {!currentSession && !isLoading && (
          <div className="welcome-message">
            <h2>Welcome to Browser Automation Assistant</h2>
            <p>Start a new chat to begin automating your browser tasks with natural language.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe what you want to automate..."
          className="task-input"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <button type="submit" className="send-button" disabled={!input.trim() || isLoading}>
          <SendIcon />
        </button>
      </form>
    </div>
  )
}