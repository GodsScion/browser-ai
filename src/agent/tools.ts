import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Helper function to format errors safely
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Helper function to send messages to content script
async function sendToContentScript(tabId: number | undefined, message: any) {
  const targetTabId = tabId || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  if (!targetTabId) {
    throw new Error("No active tab found");
  }
  return await chrome.tabs.sendMessage(targetTabId, message);
}

// Helper function to get active tab ID
async function getActiveTabId(): Promise<number> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]?.id) {
    throw new Error("No active tab found");
  }
  return tabs[0].id;
}

// DOM Inspection Tools
export const getPageDOM = tool(
  async ({ tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { type: 'GET_DOM_SNAPSHOT' });
      return JSON.stringify(response, null, 2);
    } catch (error: unknown) {
      return `Error getting DOM: ${formatError(error)}`;
    }
  },
  {
    name: "get_page_dom",
    description: "Get the current page DOM structure and visible elements",
    schema: z.object({
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const findElements = tool(
  async ({ selector, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'FIND_ELEMENTS', 
        selector 
      });
      return `Found ${response.elements?.length || 0} elements matching "${selector}": ${JSON.stringify(response.elements)}`;
    } catch (error: unknown) {
      return `Error finding elements: ${formatError(error)}`;
    }
  },
  {
    name: "find_elements",
    description: "Find elements on the page using CSS selector",
    schema: z.object({
      selector: z.string().describe("CSS selector to find elements"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

// Element Interaction Tools
export const clickElement = tool(
  async ({ selector, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'CLICK_ELEMENT', 
        selector 
      });
      return response.success ? `Successfully clicked element: ${selector}` : `Failed to click element: ${selector}`;
    } catch (error: unknown) {
      return `Error clicking element: ${formatError(error)}`;
    }
  },
  {
    name: "click_element",
    description: "Click an element using CSS selector",
    schema: z.object({
      selector: z.string().describe("CSS selector for the element to click"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const inputText = tool(
  async ({ selector, text, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'INPUT_TEXT', 
        selector, 
        text 
      });
      return response.success ? `Successfully entered text "${text}" into ${selector}` : `Failed to enter text into ${selector}`;
    } catch (error: unknown) {
      return `Error entering text: ${formatError(error)}`;
    }
  },
  {
    name: "input_text",
    description: "Input text into a form field or text area",
    schema: z.object({
      selector: z.string().describe("CSS selector for the input field"),
      text: z.string().describe("Text to input"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const selectOption = tool(
  async ({ selector, value, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'SELECT_OPTION', 
        selector, 
        value 
      });
      return response.success ? `Successfully selected option "${value}" in ${selector}` : `Failed to select option in ${selector}`;
    } catch (error: unknown) {
      return `Error selecting option: ${formatError(error)}`;
    }
  },
  {
    name: "select_option",
    description: "Select an option from a dropdown or select element",
    schema: z.object({
      selector: z.string().describe("CSS selector for the select element"),
      value: z.string().describe("Value or text of the option to select"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

// Navigation Tools
export const scrollPage = tool(
  async ({ direction, amount = 300, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'SCROLL_PAGE', 
        direction, 
        amount 
      });
      return response.success ? `Successfully scrolled ${direction} by ${amount}px` : `Failed to scroll page`;
    } catch (error: unknown) {
      return `Error scrolling page: ${formatError(error)}`;
    }
  },
  {
    name: "scroll_page",
    description: "Scroll the page in a specified direction",
    schema: z.object({
      direction: z.enum(["up", "down", "left", "right"]).describe("Direction to scroll"),
      amount: z.number().optional().describe("Amount to scroll in pixels (default: 300)"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const navigateToUrl = tool(
  async ({ url, tabId }) => {
    try {
      const targetTabId = tabId || await getActiveTabId();
      await chrome.tabs.update(targetTabId, { url });
      return `Successfully navigated to ${url}`;
    } catch (error: unknown) {
      return `Error navigating to URL: ${formatError(error)}`;
    }
  },
  {
    name: "navigate_to_url",
    description: "Navigate to a specific URL",
    schema: z.object({
      url: z.string().describe("URL to navigate to"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const goBack = tool(
  async ({ tabId }) => {
    try {
      const targetTabId = tabId || await getActiveTabId();
      await chrome.tabs.goBack(targetTabId);
      return "Successfully went back to previous page";
    } catch (error: unknown) {
      return `Error going back: ${formatError(error)}`;
    }
  },
  {
    name: "go_back",
    description: "Go back to the previous page",
    schema: z.object({
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const goForward = tool(
  async ({ tabId }) => {
    try {
      const targetTabId = tabId || await getActiveTabId();
      await chrome.tabs.goForward(targetTabId);
      return "Successfully went forward to next page";
    } catch (error: unknown) {
      return `Error going forward: ${formatError(error)}`;
    }
  },
  {
    name: "go_forward",
    description: "Go forward to the next page",
    schema: z.object({
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const refreshPage = tool(
  async ({ tabId }) => {
    try {
      const targetTabId = tabId || await getActiveTabId();
      await chrome.tabs.reload(targetTabId);
      return "Successfully refreshed page";
    } catch (error: unknown) {
      return `Error refreshing page: ${formatError(error)}`;
    }
  },
  {
    name: "refresh_page",
    description: "Refresh the current page",
    schema: z.object({
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

// Advanced Interaction Tools
export const dragAndDrop = tool(
  async ({ sourceSelector, targetSelector, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'DRAG_AND_DROP', 
        sourceSelector, 
        targetSelector 
      });
      return response.success ? `Successfully dragged ${sourceSelector} to ${targetSelector}` : `Failed to drag and drop`;
    } catch (error: unknown) {
      return `Error during drag and drop: ${formatError(error)}`;
    }
  },
  {
    name: "drag_and_drop",
    description: "Drag an element from source to target location",
    schema: z.object({
      sourceSelector: z.string().describe("CSS selector for the element to drag"),
      targetSelector: z.string().describe("CSS selector for the drop target"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const hoverElement = tool(
  async ({ selector, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'HOVER_ELEMENT', 
        selector 
      });
      return response.success ? `Successfully hovered over ${selector}` : `Failed to hover over element`;
    } catch (error: unknown) {
      return `Error hovering element: ${formatError(error)}`;
    }
  },
  {
    name: "hover_element",
    description: "Hover over an element to trigger hover effects",
    schema: z.object({
      selector: z.string().describe("CSS selector for the element to hover"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const rightClickElement = tool(
  async ({ selector, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'RIGHT_CLICK_ELEMENT', 
        selector 
      });
      return response.success ? `Successfully right-clicked ${selector}` : `Failed to right-click element`;
    } catch (error: unknown) {
      return `Error right-clicking element: ${formatError(error)}`;
    }
  },
  {
    name: "right_click_element",
    description: "Right-click an element to open context menu",
    schema: z.object({
      selector: z.string().describe("CSS selector for the element to right-click"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

// Data Extraction Tools
export const extractText = tool(
  async ({ selector, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'EXTRACT_TEXT', 
        selector 
      });
      return response.success ? `Extracted text: "${response.text}"` : `Failed to extract text from ${selector}`;
    } catch (error: unknown) {
      return `Error extracting text: ${formatError(error)}`;
    }
  },
  {
    name: "extract_text",
    description: "Extract text content from an element",
    schema: z.object({
      selector: z.string().describe("CSS selector for the element to extract text from"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const extractAttribute = tool(
  async ({ selector, attribute, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'EXTRACT_ATTRIBUTE', 
        selector, 
        attribute 
      });
      return response.success ? `Extracted ${attribute}: "${response.value}"` : `Failed to extract ${attribute} from ${selector}`;
    } catch (error: unknown) {
      return `Error extracting attribute: ${formatError(error)}`;
    }
  },
  {
    name: "extract_attribute",
    description: "Extract a specific attribute value from an element",
    schema: z.object({
      selector: z.string().describe("CSS selector for the element"),
      attribute: z.string().describe("Attribute name to extract (e.g., 'href', 'src', 'class')"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const extractTableData = tool(
  async ({ selector, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'EXTRACT_TABLE_DATA', 
        selector 
      });
      return response.success ? `Extracted table data: ${JSON.stringify(response.data, null, 2)}` : `Failed to extract table data from ${selector}`;
    } catch (error: unknown) {
      return `Error extracting table data: ${formatError(error)}`;
    }
  },
  {
    name: "extract_table_data",
    description: "Extract data from a table element",
    schema: z.object({
      selector: z.string().describe("CSS selector for the table element"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

// Wait and Timing Tools
export const waitForElement = tool(
  async ({ selector, timeout = 5000, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'WAIT_FOR_ELEMENT', 
        selector, 
        timeout 
      });
      return response.success ? `Element "${selector}" appeared` : `Element "${selector}" did not appear within ${timeout}ms`;
    } catch (error: unknown) {
      return `Error waiting for element: ${formatError(error)}`;
    }
  },
  {
    name: "wait_for_element",
    description: "Wait for an element to appear on the page",
    schema: z.object({
      selector: z.string().describe("CSS selector for the element to wait for"),
      timeout: z.number().optional().describe("Maximum time to wait in milliseconds (default: 5000)"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const waitForPageLoad = tool(
  async ({ timeout = 10000, tabId }) => {
    try {
      const response = await sendToContentScript(tabId, { 
        type: 'WAIT_FOR_PAGE_LOAD', 
        timeout 
      });
      return response.success ? "Page fully loaded" : `Page did not load within ${timeout}ms`;
    } catch (error: unknown) {
      return `Error waiting for page load: ${formatError(error)}`;
    }
  },
  {
    name: "wait_for_page_load",
    description: "Wait for the page to fully load",
    schema: z.object({
      timeout: z.number().optional().describe("Maximum time to wait in milliseconds (default: 10000)"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

export const sleep = tool(
  async ({ duration }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, duration));
      return `Waited for ${duration}ms`;
    } catch (error: unknown) {
      return `Error during sleep: ${formatError(error)}`;
    }
  },
  {
    name: "sleep",
    description: "Wait for a specified amount of time",
    schema: z.object({
      duration: z.number().describe("Time to wait in milliseconds")
    })
  }
);

// Human Assistance Tools
export const requestHumanAssistance = tool(
  async ({ type, message, context }, _runtime) => {
    try {
      // Create assistance request object
      const assistanceRequest = {
        id: Date.now().toString(),
        type,
        message,
        context,
        timestamp: new Date().toISOString()
      };

      // Store the request for the UI to display (if store is available)
      // Note: Store access depends on agent configuration

      // Send message to popup to display assistance request
      try {
        await chrome.runtime.sendMessage({
          type: 'ASSISTANCE_REQUEST',
          payload: assistanceRequest
        });
      } catch (error: unknown) {
        // Popup might not be open, that's okay
      }

      return `Human assistance requested: ${message} (Request ID: ${assistanceRequest.id})`;
    } catch (error: unknown) {
      return `Error requesting human assistance: ${formatError(error)}`;
    }
  },
  {
    name: "request_human_assistance",
    description: "Request human intervention for tasks that require manual input",
    schema: z.object({
      type: z.enum(["captcha", "login", "confirmation", "custom"]).describe("Type of assistance needed"),
      message: z.string().describe("Message explaining what assistance is needed"),
      context: z.any().optional().describe("Additional context for the assistance request")
    })
  }
);

// Screenshot and Visual Tools
export const takeScreenshot = tool(
  async ({ fullPage = false, tabId }) => {
    try {
      if (fullPage) {
        // For full page screenshots, we need to use content script
        const response = await sendToContentScript(tabId, { 
          type: 'TAKE_SCREENSHOT', 
          fullPage: true 
        });
        return response.success ? `Full page screenshot taken and saved` : `Failed to take full page screenshot`;
      } else {
        // For viewport screenshots, use Chrome API
        const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
        return `Viewport screenshot taken (data URL length: ${dataUrl.length} characters)`;
      }
    } catch (error: unknown) {
      return `Error taking screenshot: ${formatError(error)}`;
    }
  },
  {
    name: "take_screenshot",
    description: "Take a screenshot of the current page or viewport",
    schema: z.object({
      fullPage: z.boolean().optional().describe("Whether to capture the full page or just viewport (default: false)"),
      tabId: z.number().optional().describe("Tab ID to perform action on (default: current active tab)")
    })
  }
);

// Tab Management Tools
export const openNewTab = tool(
  async ({ url }) => {
    try {
      const tab = await chrome.tabs.create({ url: url || 'chrome://newtab', active: true });
      return `Successfully opened new tab${url ? ` and navigated to ${url}` : ''} (Tab ID: ${tab.id})`;
    } catch (error: unknown) {
      return `Error opening new tab: ${formatError(error)}`;
    }
  },
  {
    name: "open_new_tab",
    description: "Open a new tab and optionally navigate to a URL, then switch to it",
    schema: z.object({
      url: z.string().optional().describe("URL to navigate to in the new tab (optional)")
    })
  }
);

export const getTabsList = tool(
  async () => {
    try {
      const tabs = await chrome.tabs.query({});
      const tabList = tabs.map(tab => ({
        id: tab.id,
        title: tab.title || 'Untitled',
        url: tab.url || 'Unknown URL',
        active: tab.active,
        description: `${tab.title || 'Untitled'} - ${tab.url || 'Unknown URL'}`
      }));
      return `Found ${tabs.length} open tabs:\n${JSON.stringify(tabList, null, 2)}`;
    } catch (error: unknown) {
      return `Error getting tabs list: ${formatError(error)}`;
    }
  },
  {
    name: "get_tabs_list",
    description: "Get a list of all open tabs with their IDs and descriptions",
    schema: z.object({})
  }
);

export const switchToTab = tool(
  async ({ tabId }) => {
    try {
      await chrome.tabs.update(tabId, { active: true });
      const tab = await chrome.tabs.get(tabId);
      return `Successfully switched to tab: ${tab.title} (ID: ${tabId})`;
    } catch (error: unknown) {
      return `Error switching to tab: ${formatError(error)}`;
    }
  },
  {
    name: "switch_to_tab",
    description: "Switch to a specific tab by its ID",
    schema: z.object({
      tabId: z.number().describe("Tab ID to switch to")
    })
  }
);

// All tools array for easy import
export const allTools = [
  getPageDOM,
  findElements,
  clickElement,
  inputText,
  selectOption,
  scrollPage,
  navigateToUrl,
  goBack,
  goForward,
  refreshPage,
  dragAndDrop,
  hoverElement,
  rightClickElement,
  extractText,
  extractAttribute,
  extractTableData,
  waitForElement,
  waitForPageLoad,
  sleep,
  requestHumanAssistance,
  takeScreenshot,
  openNewTab,
  getTabsList,
  switchToTab
];