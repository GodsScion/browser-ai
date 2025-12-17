import React, { useState } from 'react'
import './popup.css'

export default function Popup() {
  const [input, setInput] = useState('')
  const [tasks, setTasks] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      // TODO: Send to background script for processing
      console.log('Task submitted:', input)
      setInput('')
    }
  }

  return (
    <div className="popup-container">
      <h1>Browser Automation Assistant</h1>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe what you want to automate..."
          className="task-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
      
      {tasks.length > 0 && (
        <div className="tasks-container">
          <h3>Tasks:</h3>
          <ul>
            {tasks.map((task, index) => (
              <li key={index}>{task}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}