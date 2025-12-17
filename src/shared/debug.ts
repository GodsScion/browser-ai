// Debug utilities for Chrome extension

export const DEBUG = true // Always enable for now

export const logger = {
  log: (...args: any[]) => {
    console.log('[Extension]', ...args)
  },
  error: (...args: any[]) => {
    console.error('[Extension Error]', ...args)
  },
  warn: (...args: any[]) => {
    console.warn('[Extension Warning]', ...args)
  },
  popup: (...args: any[]) => {
    console.log('[Popup]', ...args)
  },
  background: (...args: any[]) => {
    console.log('[Background]', ...args)
  },
  content: (...args: any[]) => {
    console.log('[Content]', ...args)
  }
}