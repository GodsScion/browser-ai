// Content script for DOM manipulation
console.log('Browser Automation Assistant content script loaded')

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message)
  
  switch (message.type) {
    case 'GET_DOM_SNAPSHOT':
      sendResponse(getDOMSnapshot())
      break
    
    case 'CLICK_ELEMENT':
      clickElement(message.selector)
      sendResponse({ success: true })
      break
    
    case 'INPUT_TEXT':
      inputText(message.selector, message.text)
      sendResponse({ success: true })
      break
    
    case 'SCROLL_PAGE':
      scrollPage(message.direction, message.amount)
      sendResponse({ success: true })
      break
    
    default:
      console.log('Unknown message type:', message.type)
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
    elements: elements.slice(0, 100) // Limit to first 100 visible elements
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
  const element = document.querySelector(selector) as HTMLElement
  if (element) {
    element.click()
    console.log('Clicked element:', selector)
  } else {
    console.error('Element not found:', selector)
  }
}

function inputText(selector: string, text: string) {
  const element = document.querySelector(selector) as HTMLInputElement
  if (element) {
    element.value = text
    element.dispatchEvent(new Event('input', { bubbles: true }))
    console.log('Input text into element:', selector, text)
  } else {
    console.error('Input element not found:', selector)
  }
}

function scrollPage(direction: 'up' | 'down', amount: number = 300) {
  const scrollAmount = direction === 'down' ? amount : -amount
  window.scrollBy(0, scrollAmount)
  console.log('Scrolled page:', direction, amount)
}