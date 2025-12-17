// Secure storage utilities for sensitive data like API keys
import { logger } from './debug'

// Simple encryption/decryption using Web Crypto API
class SecureStorage {
  private static readonly STORAGE_KEY = 'secure_settings'
  private static readonly ENCRYPTION_KEY_NAME = 'extension_key'
  
  // Generate or retrieve encryption key
  private static async getEncryptionKey(): Promise<CryptoKey> {
    try {
      // Try to get existing key from storage
      const result = await chrome.storage.local.get([this.ENCRYPTION_KEY_NAME])
      
      if (result[this.ENCRYPTION_KEY_NAME]) {
        // Import existing key
        const keyData = new Uint8Array(result[this.ENCRYPTION_KEY_NAME])
        return await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        )
      } else {
        // Generate new key
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )
        
        // Export and store the key
        const keyData = await crypto.subtle.exportKey('raw', key)
        await chrome.storage.local.set({
          [this.ENCRYPTION_KEY_NAME]: Array.from(new Uint8Array(keyData))
        })
        
        return key
      }
    } catch (error) {
      logger.error('Failed to get encryption key:', error)
      throw new Error('Encryption key generation failed')
    }
  }
  
  // Encrypt data
  private static async encrypt(data: string): Promise<{ encrypted: number[], iv: number[] }> {
    try {
      const key = await this.getEncryptionKey()
      const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for AES-GCM
      const encodedData = new TextEncoder().encode(data)
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      )
      
      return {
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv)
      }
    } catch (error) {
      logger.error('Encryption failed:', error)
      throw new Error('Data encryption failed')
    }
  }
  
  // Decrypt data
  private static async decrypt(encryptedData: number[], iv: number[]): Promise<string> {
    try {
      const key = await this.getEncryptionKey()
      const encrypted = new Uint8Array(encryptedData)
      const ivArray = new Uint8Array(iv)
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArray },
        key,
        encrypted
      )
      
      return new TextDecoder().decode(decrypted)
    } catch (error) {
      logger.error('Decryption failed:', error)
      throw new Error('Data decryption failed')
    }
  }
  
  // Store API key securely
  static async storeApiKey(provider: 'openai' | 'anthropic', apiKey: string): Promise<void> {
    try {
      if (!apiKey || apiKey.trim() === '') {
        // Remove API key if empty
        await this.removeApiKey(provider)
        return
      }
      
      // Basic validation - just check it's a non-empty string
      const trimmedKey = apiKey.trim()
      if (trimmedKey.length < 10) {
        throw new Error('API key appears too short')
      }
      
      const encrypted = await this.encrypt(trimmedKey)
      const result = await chrome.storage.local.get([this.STORAGE_KEY])
      const secureSettings = result[this.STORAGE_KEY] || {}
      
      secureSettings[`${provider}_api_key`] = encrypted
      secureSettings[`${provider}_stored_at`] = Date.now()
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: secureSettings })
      logger.popup(`Securely stored ${provider} API key`)
    } catch (error) {
      logger.error('Failed to store API key:', error)
      throw error
    }
  }
  
  // Retrieve API key securely
  static async getApiKey(provider: 'openai' | 'anthropic'): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY])
      const secureSettings = result[this.STORAGE_KEY]
      
      if (!secureSettings || !secureSettings[`${provider}_api_key`]) {
        return null
      }
      
      const encryptedData = secureSettings[`${provider}_api_key`]
      const decrypted = await this.decrypt(encryptedData.encrypted, encryptedData.iv)
      
      // Basic validation - just check it's not empty
      if (!decrypted || decrypted.trim().length === 0) {
        logger.error('Stored API key appears corrupted or empty')
        await this.removeApiKey(provider)
        return null
      }
      
      return decrypted.trim()
    } catch (error) {
      logger.error('Failed to retrieve API key:', error)
      return null
    }
  }
  
  // Remove API key
  static async removeApiKey(provider: 'openai' | 'anthropic'): Promise<void> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY])
      const secureSettings = result[this.STORAGE_KEY] || {}
      
      delete secureSettings[`${provider}_api_key`]
      delete secureSettings[`${provider}_stored_at`]
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: secureSettings })
      logger.popup(`Removed ${provider} API key`)
    } catch (error) {
      logger.error('Failed to remove API key:', error)
      throw error
    }
  }
  
  // Check if API key exists
  static async hasApiKey(provider: 'openai' | 'anthropic'): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY])
      const secureSettings = result[this.STORAGE_KEY]
      return !!(secureSettings && secureSettings[`${provider}_api_key`])
    } catch (error) {
      logger.error('Failed to check API key existence:', error)
      return false
    }
  }
  

  
  // Clear all secure storage (for debugging/reset)
  static async clearAll(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.STORAGE_KEY, this.ENCRYPTION_KEY_NAME])
      logger.popup('Cleared all secure storage')
    } catch (error) {
      logger.error('Failed to clear secure storage:', error)
      throw error
    }
  }
  
  // Get storage info (for debugging)
  static async getStorageInfo(): Promise<{ hasEncryptionKey: boolean, storedKeys: string[] }> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY, this.ENCRYPTION_KEY_NAME])
      const secureSettings = result[this.STORAGE_KEY] || {}
      
      return {
        hasEncryptionKey: !!result[this.ENCRYPTION_KEY_NAME],
        storedKeys: Object.keys(secureSettings).filter(key => key.endsWith('_api_key'))
      }
    } catch (error) {
      logger.error('Failed to get storage info:', error)
      return { hasEncryptionKey: false, storedKeys: [] }
    }
  }
}

export default SecureStorage