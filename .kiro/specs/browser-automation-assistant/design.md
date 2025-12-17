# Design Document

## Overview

The Browser Automation Assistant is a Chrome extension that combines natural language processing with browser automation capabilities. The system uses AI agents powered by Langchain to interpret user tasks and execute them through a comprehensive set of DOM manipulation tools. The architecture emphasizes simplicity in the user interface while providing powerful automation capabilities through a modular, extensible design.

## Architecture

The system follows a layered architecture with clear separation of concerns:

### Frontend Layer (React + TypeScript)
- **UI Components**: Simple input field and send button interface
- **State Management**: React hooks for local state, context for global state
- **Real-time Updates**: WebSocket or message passing for task progress updates

### AI Agent Layer (Langchain + Langgraph)
- **Main Automation Agent**: Primary ReAct agent created with `createAgent()` that follows the reasoning + acting pattern
- **Task Interpreter**: LLM component that converts natural language to structured task lists
- **Tool Registry**: Collection of browser automation tools available to the agent
- **Agent Memory**: State management for conversation history and task context using Langchain's built-in memory

### Browser Integration Layer (Chrome Extension APIs)
- **Content Scripts**: Injected into web pages for DOM manipulation
- **Background Service**: Coordinates between popup and content scripts
- **Message Passing**: Communication between extension components

### External Services Layer
- **LLM Provider**: OpenAI, Anthropic, or local models for AI processing
- **Tool Execution**: Chrome extension APIs for browser automation

## Agent Implementation Pattern

The system uses Langchain's `createAgent()` to implement a ReAct (Reasoning + Acting) agent that:

1. **Receives user input** as messages in the conversation
2. **Reasons about the task** using the LLM's natural language understanding
3. **Selects and executes tools** based on the current browser state and task requirements
4. **Observes results** from tool execution and incorporates them into decision-making
5. **Iterates** until the task is complete or assistance is needed

### Agent Configuration

```typescript
import { createAgent, tool } from "langchain";
import * as z from "zod";

const browserAutomationAgent = createAgent({
  model: "openai:gpt-5-mini",
  tools: [
    getPageDOMTool,
    clickElementTool,
    inputTextTool,
    scrollPageTool,
    dragElementTool,
    requestAssistanceTool
  ],
  systemPrompt: `You are a browser automation assistant. Your job is to help users automate web tasks by:
  1. Understanding their natural language instructions
  2. Breaking down complex tasks into simple browser actions
  3. Using available tools to interact with web pages
  4. Requesting assistance when you encounter captchas, login requirements, or unclear situations
  5. Providing clear feedback about your progress and results
  
  Always assess the current page state before taking actions and explain your reasoning.`,
  middleware: [
    errorHandlingMiddleware,
    contextTrackingMiddleware
  ]
});
```

## Components and Interfaces

### Core Components

#### TaskInterpreter
```typescript
interface TaskInterpreter {
  interpretInput(userInput: string, context: TaskContext): Promise<TaskList>
  updateContext(feedback: UserFeedback): void
}
```

#### MainAutomationAgent
```typescript
// Agent created using Langchain's createAgent()
interface AgentConfig {
  model: string // e.g., "openai:gpt-4o"
  tools: Tool[]
  systemPrompt: string
  responseFormat?: z.ZodSchema
  middleware?: Middleware[]
}

// Agent tools following Langchain tool pattern
interface BrowserTool extends Tool {
  name: string
  description: string
  schema: z.ZodSchema
  func: (params: any) => Promise<string>
}

// Agent state for memory and context
interface AgentState {
  messages: BaseMessage[]
  taskContext: TaskContext
  browserState: BrowserState
  assistanceRequests: AssistanceRequest[]
}
```

#### Browser Automation Tools
```typescript
// Tools following Langchain tool() pattern
const getPageDOMTool = tool(
  async () => {
    // Implementation to get DOM snapshot
    return JSON.stringify(domSnapshot);
  },
  {
    name: "get_page_dom",
    description: "Retrieve the current page DOM structure and elements",
    schema: z.object({})
  }
);

const clickElementTool = tool(
  async ({ selector }) => {
    // Implementation to click element
    return `Clicked element: ${selector}`;
  },
  {
    name: "click_element",
    description: "Click an element using CSS selector",
    schema: z.object({
      selector: z.string().describe("CSS selector for the element to click")
    })
  }
);

const inputTextTool = tool(
  async ({ selector, text }) => {
    // Implementation to input text
    return `Entered text "${text}" into ${selector}`;
  },
  {
    name: "input_text",
    description: "Input text into a form field",
    schema: z.object({
      selector: z.string().describe("CSS selector for the input field"),
      text: z.string().describe("Text to input")
    })
  }
);

const requestAssistanceTool = tool(
  async ({ type, message }) => {
    // Implementation to request user assistance
    return `Assistance requested: ${message}`;
  },
  {
    name: "request_assistance",
    description: "Request user assistance for tasks that require human intervention",
    schema: z.object({
      type: z.enum(["captcha", "login", "custom"]).describe("Type of assistance needed"),
      message: z.string().describe("Message explaining what assistance is needed")
    })
  }
);
```

### Communication Interfaces

#### Extension Message Protocol
```typescript
interface ExtensionMessage {
  type: 'EXECUTE_TASK' | 'GET_DOM' | 'USER_ASSISTANCE' | 'STATE_UPDATE'
  payload: any
  requestId: string
}
```

#### Task Context
```typescript
interface TaskContext {
  sessionId: string
  previousTasks: CompletedTask[]
  currentUrl: string
  userPreferences: UserPreferences
  browserState: BrowserState
}
```

## Data Models

### Task Management
```typescript
interface Task {
  id: string
  description: string
  type: TaskType
  parameters: Record<string, any>
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'requires_assistance'
  dependencies: string[]
}

interface TaskList {
  id: string
  tasks: Task[]
  context: TaskContext
  createdAt: Date
}

enum TaskType {
  CLICK = 'click',
  INPUT = 'input',
  SCROLL = 'scroll',
  NAVIGATE = 'navigate',
  WAIT = 'wait',
  EXTRACT = 'extract',
  DRAG = 'drag'
}
```

### User Assistance
```typescript
interface AssistanceRequest {
  id: string
  type: 'captcha' | 'login' | 'custom'
  message: string
  context: any
  timeout?: number
}

interface UserResponse {
  requestId: string
  response: any
  timestamp: Date
}
```

### Browser State
```typescript
interface BrowserState {
  url: string
  title: string
  readyState: 'loading' | 'interactive' | 'complete'
  elements: ElementSnapshot[]
  viewport: ViewportInfo
}

interface ElementSnapshot {
  selector: string
  id?: string
  tagName: string
  text?: string
  attributes: Record<string, string>
  boundingBox: DOMRect
  visible: boolean
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:
- Properties 1.4 and 1.5 both test context preservation and can be combined
- Properties 3.1, 3.2, and 3.3 all test assistance request creation and can be unified
- Properties 2.1-2.5 all test DOM tool availability and can be grouped

### Core Properties

**Property 1: Task interpretation produces valid structure**
*For any* valid user input string, the task interpreter should produce a TaskList object with properly formatted Task objects containing all required fields
**Validates: Requirements 1.1**

**Property 2: UI reflects task interpretation results**
*For any* completed task interpretation, the user interface should display the generated task list in the UI state
**Validates: Requirements 1.2**

**Property 3: Ambiguous input triggers clarification**
*For any* ambiguous user input, the system should request clarification rather than proceeding with task execution
**Validates: Requirements 1.3**

**Property 4: Context preservation across interactions**
*For any* sequence of task submissions within a session, the task context should accumulate and preserve information from all previous interactions
**Validates: Requirements 1.4, 1.5**

**Property 5: DOM tool availability**
*For any* automation agent request for DOM manipulation, the corresponding tool should be available and return valid results when called with proper parameters
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

**Property 6: Assistance request creation**
*For any* scenario requiring user intervention (captcha, authentication, unexpected conditions), the system should create an appropriate AssistanceRequest object and pause execution
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

**Property 7: Execution resumption after assistance**
*For any* assistance request that receives a user response, task execution should resume from the correct state without losing progress
**Validates: Requirements 3.5**

**Property 8: Continuous state assessment**
*For any* active task execution, the system should continuously call state assessment functions to monitor browser state changes
**Validates: Requirements 4.1**

**Property 9: Error handling and recovery**
*For any* task execution error, the system should either attempt automatic recovery or create an assistance request, never leaving tasks in an undefined state
**Validates: Requirements 4.2**

**Property 10: Task completion and progression**
*For any* successfully completed task, the task status should be marked as 'completed' and execution should proceed to the next pending task in the list
**Validates: Requirements 4.3**

**Property 11: Workflow completion notification**
*For any* task list where all tasks have status 'completed', the system should generate a completion notification to the user
**Validates: Requirements 4.4**

**Property 12: Feedback incorporation**
*For any* user feedback provided during task execution, the system should adjust subsequent task execution to incorporate the feedback
**Validates: Requirements 4.5**

**Property 13: Progress visualization**
*For any* executing task list, the user interface should display visual progress indicators that reflect the current execution state
**Validates: Requirements 5.4**

**Property 14: Assistance request display**
*For any* created assistance request, the user interface should prominently display the request with clear instructions for user response
**Validates: Requirements 5.5**

## Error Handling

### Error Categories

#### Input Validation Errors
- Invalid or malformed user input
- Missing required parameters for DOM operations
- Inaccessible DOM elements or selectors

#### Execution Errors
- Network timeouts during page interactions
- Permission denied for certain browser operations
- Unexpected page state changes during task execution

#### AI Agent Errors
- LLM service unavailability or rate limiting
- Task interpretation failures
- Context corruption or loss

### Error Recovery Strategies

#### Automatic Recovery
- Retry failed DOM operations with exponential backoff
- Refresh page state and retry if elements become stale
- Fallback to alternative selectors for element identification

#### User-Assisted Recovery
- Request user guidance for ambiguous error conditions
- Allow manual intervention for complex authentication flows
- Provide error context and suggested actions to users

#### Graceful Degradation
- Continue with remaining tasks if individual tasks fail
- Preserve completed work when errors occur
- Maintain session state across error recovery attempts

## Testing Strategy

### Dual Testing Approach

The system requires both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and integration points between components
- **Property tests** verify universal properties that should hold across all inputs using generated test data
- Together they provide complete coverage: unit tests catch concrete bugs, property tests verify general correctness

### Unit Testing Requirements

Unit tests will focus on:
- Specific examples of task interpretation with known inputs and expected outputs
- Integration between React components and Chrome extension APIs
- Error handling for specific failure scenarios
- UI component rendering and user interaction flows

### Property-Based Testing Requirements

Property-based testing will use **fast-check** library for JavaScript/TypeScript to implement the correctness properties defined above. Each property-based test will:
- Run a minimum of 100 iterations with randomly generated inputs
- Be tagged with comments explicitly referencing the design document property
- Use the format: `**Feature: browser-automation-assistant, Property {number}: {property_text}**`
- Generate realistic test data that respects the constraints of the browser automation domain

### Test Data Generation

Smart generators will be implemented for:
- **Task descriptions**: Generate realistic user input strings with varying complexity and ambiguity levels
- **DOM structures**: Create representative HTML structures for testing element selection and manipulation
- **Browser states**: Generate realistic browser state objects with various page conditions
- **User feedback**: Create diverse user response patterns for assistance requests

### Integration Testing

Integration tests will verify:
- End-to-end task execution flows from user input to completion
- Chrome extension message passing between components
- AI agent tool usage and state management
- Error recovery and user assistance workflows

The testing framework will ensure that all correctness properties are validated through executable tests, providing confidence that the browser automation assistant behaves correctly across all supported scenarios.