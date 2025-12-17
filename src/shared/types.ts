// Shared TypeScript interfaces and types

export interface Task {
  id: string
  description: string
  type: TaskType
  parameters: Record<string, any>
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'requires_assistance'
  dependencies: string[]
}

export interface TaskList {
  id: string
  tasks: Task[]
  context: TaskContext
  createdAt: Date
}

export enum TaskType {
  CLICK = 'click',
  INPUT = 'input',
  SCROLL = 'scroll',
  NAVIGATE = 'navigate',
  WAIT = 'wait',
  EXTRACT = 'extract',
  DRAG = 'drag'
}

export interface TaskContext {
  sessionId: string
  previousTasks: CompletedTask[]
  currentUrl: string
  userPreferences: UserPreferences
  browserState: BrowserState
}

export interface CompletedTask {
  id: string
  description: string
  result: any
  completedAt: Date
}

export interface UserPreferences {
  timeout: number
  retryAttempts: number
  verboseLogging: boolean
}

export interface BrowserState {
  url: string
  title: string
  readyState: 'loading' | 'interactive' | 'complete'
  elements: ElementSnapshot[]
  viewport: ViewportInfo
}

export interface ElementSnapshot {
  selector: string
  id?: string
  tagName: string
  text?: string
  attributes: Record<string, string>
  boundingBox: DOMRect
  visible: boolean
}

export interface ViewportInfo {
  width: number
  height: number
  scrollX: number
  scrollY: number
}

export interface AssistanceRequest {
  id: string
  type: 'captcha' | 'login' | 'custom'
  message: string
  context: any
  timeout?: number
}

export interface UserResponse {
  requestId: string
  response: any
  timestamp: Date
}

export interface ExtensionMessage {
  type: 'EXECUTE_TASK' | 'GET_DOM' | 'USER_ASSISTANCE' | 'STATE_UPDATE'
  payload: any
  requestId: string
}