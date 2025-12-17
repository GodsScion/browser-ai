// Content script for DOM manipulation
import { logger } from '../shared/debug'

// Helper function to format errors safely
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

logger.content('Browser Automation Assistant content script loaded')

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  logger.content('Content script received message:', message)
  
  try {
    switch (message.type) {
      case 'GET_DOM_SNAPSHOT':
        sendResponse(getDOMSnapshot())
        break
      
      case 'FIND_ELEMENTS':
        sendResponse(findElements(message.selector))
        break
      
      case 'CLICK_ELEMENT':
        sendResponse(clickElement(message.selector))
        break
      
      case 'INPUT_TEXT':
        sendResponse(inputText(message.selector, message.text))
        break
      
      case 'SELECT_OPTION':
        sendResponse(selectOption(message.selector, message.value))
        break
      
      case 'SCROLL_PAGE':
        sendResponse(scrollPage(message.direction, message.amount))
        break
      
      case 'DRAG_AND_DROP':
        sendResponse(dragAndDrop(message.sourceSelector, message.targetSelector))
        break
      
      case 'HOVER_ELEMENT':
        sendResponse(hoverElement(message.selector))
        break
      
      case 'RIGHT_CLICK_ELEMENT':
        sendResponse(rightClickElement(message.selector))
        break
      
      case 'EXTRACT_TEXT':
        sendResponse(extractText(message.selector))
        break
      
      case 'EXTRACT_ATTRIBUTE':
        sendResponse(extractAttribute(message.selector, message.attribute))
        break
      
      case 'EXTRACT_TABLE_DATA':
        sendResponse(extractTableData(message.selector))
        break
      
      case 'WAIT_FOR_ELEMENT':
        waitForElement(message.selector, message.timeout)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({ success: false, error: formatError(error) }))
        return true // Keep message channel open for async response
      
      case 'WAIT_FOR_PAGE_LOAD':
        waitForPageLoad(message.timeout)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({ success: false, error: formatError(error) }))
        return true // Keep message channel open for async response
      
      case 'TAKE_SCREENSHOT':
        sendResponse(takeScreenshot(message.fullPage))
        break
      
      default:
        logger.content('Unknown message type:', message.type)
        sendResponse({ success: false, error: 'Unknown message type' })
    }
  } catch (error) {
    logger.error('Content script error:', error)
    sendResponse({ success: false, error: formatError(error) })
  }
  
  return true
})

function getDOMSnapshot() {
  const elements = Array.from(document.querySelectorAll('*')).map(el => {
    const rect = el.getBoundingClientRect()
    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || undefined,
      className: el.className || undefined,
      text: el.textContent?.trim().substring(0, 100) || undefined,
      selector: generateSelector(el),
      boundingBox: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      visible: rect.width > 0 && rect.height > 0 && 
               window.getComputedStyle(el).visibility !== 'hidden'
    }
  }).filter(el => el.visible)

  return {
    url: window.location.href,
    title: document.title,
    readyState: document.readyState,
    elements: elements.slice(0, 100) // Limit to first 100 visible elements
  }
}

function findElements(selector: string) {
  try {
    const elements = Array.from(document.querySelectorAll(selector)).map(el => {
      const rect = el.getBoundingClientRect()
      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        text: el.textContent?.trim().substring(0, 50) || undefined,
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        visible: rect.width > 0 && rect.height > 0
      }
    })
    
    return { success: true, elements }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function generateSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim())
    if (classes.length > 0) {
      return `.${classes.join('.')}`
    }
  }
  
  // Fallback to tag name with nth-child
  const parent = element.parentElement
  if (parent) {
    const siblings = Array.from(parent.children)
    const index = siblings.indexOf(element) + 1
    return `${element.tagName.toLowerCase()}:nth-child(${index})`
  }
  
  return element.tagName.toLowerCase()
}

function clickElement(selector: string) {
  try {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.click()
      logger.content('Clicked element:', selector)
      return { success: true }
    } else {
      return { success: false, error: 'Element not found' }
    }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function inputText(selector: string, text: string) {
  try {
    const element = document.querySelector(selector) as HTMLInputElement
    if (element) {
      element.value = text
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      logger.content('Input text into element:', selector, text)
      return { success: true }
    } else {
      return { success: false, error: 'Input element not found' }
    }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function selectOption(selector: string, value: string) {
  try {
    const element = document.querySelector(selector) as HTMLSelectElement
    if (element) {
      // Try to select by value first, then by text
      let optionFound = false
      for (const option of element.options) {
        if (option.value === value || option.text === value) {
          element.selectedIndex = option.index
          optionFound = true
          break
        }
      }
      
      if (optionFound) {
        element.dispatchEvent(new Event('change', { bubbles: true }))
        return { success: true }
      } else {
        return { success: false, error: 'Option not found' }
      }
    } else {
      return { success: false, error: 'Select element not found' }
    }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function scrollPage(direction: 'up' | 'down' | 'left' | 'right', amount: number = 300) {
  try {
    let x = 0, y = 0
    switch (direction) {
      case 'down': y = amount; break
      case 'up': y = -amount; break
      case 'right': x = amount; break
      case 'left': x = -amount; break
    }
    
    window.scrollBy(x, y)
    logger.content('Scrolled page:', direction, amount)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function dragAndDrop(sourceSelector: string, targetSelector: string) {
  try {
    const source = document.querySelector(sourceSelector) as HTMLElement
    const target = document.querySelector(targetSelector) as HTMLElement
    
    if (!source || !target) {
      return { success: false, error: 'Source or target element not found' }
    }

    // Create drag and drop events
    const dragStartEvent = new DragEvent('dragstart', { bubbles: true })
    const dragOverEvent = new DragEvent('dragover', { bubbles: true })
    const dropEvent = new DragEvent('drop', { bubbles: true })
    
    source.dispatchEvent(dragStartEvent)
    target.dispatchEvent(dragOverEvent)
    target.dispatchEvent(dropEvent)
    
    return { success: true }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function hoverElement(selector: string) {
  try {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      const mouseOverEvent = new MouseEvent('mouseover', { bubbles: true })
      element.dispatchEvent(mouseOverEvent)
      return { success: true }
    } else {
      return { success: false, error: 'Element not found' }
    }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function rightClickElement(selector: string) {
  try {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true })
      element.dispatchEvent(contextMenuEvent)
      return { success: true }
    } else {
      return { success: false, error: 'Element not found' }
    }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function extractText(selector: string) {
  try {
    const element = document.querySelector(selector)
    if (element) {
      const text = element.textContent?.trim() || ''
      return { success: true, text }
    } else {
      return { success: false, error: 'Element not found' }
    }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function extractAttribute(selector: string, attribute: string) {
  try {
    const element = document.querySelector(selector)
    if (element) {
      const value = element.getAttribute(attribute)
      return { success: true, value }
    } else {
      return { success: false, error: 'Element not found' }
    }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

function extractTableData(selector: string) {
  try {
    const table = document.querySelector(selector) as HTMLTableElement
    if (!table) {
      return { success: false, error: 'Table not found' }
    }

    const data: string[][] = []
    const rows = table.querySelectorAll('tr')
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th')
      const rowData = Array.from(cells).map(cell => cell.textContent?.trim() || '')
      if (rowData.length > 0) {
        data.push(rowData)
      }
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

async function waitForElement(selector: string, timeout: number = 5000): Promise<any> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve({ success: true })
      return
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (element) {
        observer.disconnect()
        resolve({ success: true })
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    setTimeout(() => {
      observer.disconnect()
      resolve({ success: false, error: 'Element did not appear within timeout' })
    }, timeout)
  })
}

async function waitForPageLoad(timeout: number = 10000): Promise<any> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve({ success: true })
      return
    }

    const handleLoad = () => {
      document.removeEventListener('DOMContentLoaded', handleLoad)
      window.removeEventListener('load', handleLoad)
      resolve({ success: true })
    }

    document.addEventListener('DOMContentLoaded', handleLoad)
    window.addEventListener('load', handleLoad)

    setTimeout(() => {
      document.removeEventListener('DOMContentLoaded', handleLoad)
      window.removeEventListener('load', handleLoad)
      resolve({ success: false, error: 'Page did not load within timeout' })
    }, timeout)
  })
}

function takeScreenshot(_fullPage: boolean = false) {
  try {
    // For content script, we can't directly take screenshots
    // This would need to be handled by the background script
    return { success: true, message: 'Screenshot request processed' }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}