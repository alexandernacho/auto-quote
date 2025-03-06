/**
 * @file LLM utility functions
 * @description 
 * Common utility functions for working with LLMs.
 * Includes helper functions for prompt building, response validation, and text similarity.
 * 
 * @dependencies
 * - LLMParseResult, ValidationResult: Type definitions for LLM parsing
 * 
 * @notes
 * - calculateStringSimilarity uses Levenshtein distance for fuzzy matching
 * - validateLLMResponse ensures responses match the expected format
 */

import { LLMParseResult, ValidationResult } from "@/types"

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Useful for fuzzy matching client names, product descriptions, etc.
 * 
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 (no similarity) and 1 (identical)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  // Normalize strings for comparison
  const a = str1.toLowerCase().trim()
  const b = str2.toLowerCase().trim()
  
  // If either string is empty, return 0
  if (a.length === 0 || b.length === 0) return 0
  // If strings are identical, return 1
  if (a === b) return 1
  
  // Create matrix for Levenshtein distance calculation
  const matrix: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null))
  
  // Initialize first row and column
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  // Calculate similarity as 1 - (distance / max length)
  const distance = matrix[a.length][b.length]
  const maxLength = Math.max(a.length, b.length)
  return 1 - distance / maxLength
}

/**
 * Normalize phone numbers for consistent comparison
 * Strips all non-numeric characters from phone numbers
 * 
 * @param phone Phone number to normalize
 * @returns Normalized phone number (digits only)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Validate LLM response structure for invoice/quote parsing
 * Ensures the response contains all required fields in the correct format
 * 
 * @param data Response data from LLM
 * @param type Type of document being parsed (invoice or quote)
 * @returns Validation result with isValid flag and any error messages
 */
export function validateLLMResponse(data: any, type: 'invoice' | 'quote'): ValidationResult {
  const errors: string[] = []
  
  // Check if response is an object
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Response is not a valid object'] }
  }
  
  // Validate client object
  if (!data.client) {
    errors.push('Missing client information')
  } else if (typeof data.client !== 'object') {
    errors.push('Client information is not an object')
  } else {
    if (!data.client.name) {
      errors.push('Missing client name')
    }
    if (!('confidence' in data.client)) {
      errors.push('Missing client match confidence')
    }
  }
  
  // Validate items array
  if (!data.items || !Array.isArray(data.items)) {
    errors.push('Missing or invalid items array')
  } else if (data.items.length === 0) {
    errors.push('No items found in the parsed data')
  } else {
    // Check first item for required fields
    const firstItem = data.items[0]
    if (!firstItem.description) errors.push('Missing item description')
    if (!firstItem.quantity) errors.push('Missing item quantity')
    if (!firstItem.unitPrice) errors.push('Missing item unit price')
  }
  
  // Validate document object
  if (!data.document || typeof data.document !== 'object') {
    errors.push('Missing or invalid document information')
  } else {
    // Check for document-specific fields based on type
    if (type === 'invoice' && !data.document.dueDate) {
      errors.push('Missing due date for invoice')
    } else if (type === 'quote' && !data.document.validUntil) {
      errors.push('Missing valid until date for quote')
    }
  }
  
  // Validate clarification fields
  if (typeof data.needsClarification !== 'boolean') {
    errors.push('Missing or invalid needsClarification flag')
  }
  if (data.needsClarification && (!data.clarificationQuestions || !Array.isArray(data.clarificationQuestions))) {
    errors.push('Needs clarification but missing clarification questions')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create a fallback response with minimal data when LLM extraction fails
 * 
 * @param text Original text input
 * @param type Type of document (invoice or quote)
 * @returns Basic LLM parse result with minimal data and clarification flag
 */
export function createFallbackResponse(text: string, type: 'invoice' | 'quote'): LLMParseResult {
  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 30)
  const thirtyDaysFromNow = futureDate.toISOString().split('T')[0]
  
  return {
    client: {
      name: "Unknown Client",
      confidence: "low"
    },
    items: [
      {
        description: "Services as described",
        quantity: "1",
        unitPrice: "0",
        subtotal: "0",
        total: "0"
      }
    ],
    document: {
      issueDate: today,
      ...(type === 'invoice' ? { dueDate: thirtyDaysFromNow } : { validUntil: thirtyDaysFromNow }),
      notes: "Generated from incomplete information. Please review and edit."
    },
    needsClarification: true,
    clarificationQuestions: [
      "Could you provide more details about the client?",
      "What specific products or services should be included?",
      "What are the quantities and prices for each item?"
    ],
    rawText: text
  }
}

/**
 * Format a currency value as a string with proper formatting
 * 
 * @param value The numeric value to format
 * @param currencyCode ISO currency code (defaults to USD)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: string | number,
  currencyCode: string = 'USD'
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) return '$0.00'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(numValue)
}

/**
 * Format a date string into a localized representation
 * 
 * @param dateStr Date string in ISO format
 * @param format Format style to use (defaults to medium)
 * @returns Formatted date string
 */
export function formatDate(
  dateStr: string | Date,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? 'numeric' : format === 'medium' ? 'short' : 'long',
      day: 'numeric'
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(date)
  } catch (e) {
    return 'Invalid date'
  }
}

/**
 * Truncate text to a specified length with ellipsis
 * 
 * @param text Text to truncate
 * @param length Maximum length (defaults to 100)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, length: number = 100): string {
  if (!text) return ''
  if (text.length <= length) return text
  
  return text.substring(0, length) + '...'
}