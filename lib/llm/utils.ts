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
 * Validate the structure of an LLM response
 * 
 * @param data The parsed JSON data from LLM
 * @param type The type of document (invoice or quote)
 * @returns Validation result with isValid flag and errors
 */
export function validateLLMResponse(data: any, type: 'invoice' | 'quote'): ValidationResult {
  const errors: string[] = []
  
  // Validate client
  if (!data.client) {
    errors.push('Missing client information')
  } else if (typeof data.client !== 'object') {
    errors.push('Client is not an object')
  } else {
    // Client exists but may be missing fields
    if (!data.client.name) {
      errors.push('Missing client name')
    }
    
    // Ensure confidence is set
    if (!data.client.confidence) {
      data.client.confidence = 'low'
    }
  }
  
  // Validate items
  if (!data.items) {
    errors.push('Missing items array')
  } else if (!Array.isArray(data.items)) {
    errors.push('Items is not an array')
  } else if (data.items.length === 0) {
    errors.push('No items found in the parsed data')
  } else {
    // Items exist but may have issues
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]
      if (!item.description) {
        errors.push(`Item ${i+1} is missing a description`)
      }
      if (!item.quantity) {
        errors.push(`Item ${i+1} is missing a quantity`)
        // Set default quantity
        data.items[i].quantity = "1"
      }
      if (!item.unitPrice) {
        errors.push(`Item ${i+1} is missing a unit price`)
        // Set default unit price
        data.items[i].unitPrice = "0"
      }
      
      // Ensure subtotal and total exist
      if (!item.subtotal) {
        data.items[i].subtotal = item.unitPrice
      }
      if (!item.total) {
        data.items[i].total = item.subtotal
      }
    }
  }
  
  // Validate document
  if (!data.document) {
    errors.push('Missing document information')
  } else if (typeof data.document !== 'object') {
    errors.push('Document is not an object')
  } else {
    // Document exists but may be missing fields
    if (!data.document.issueDate) {
      errors.push('Missing issue date')
      // Set default issue date
      data.document.issueDate = new Date().toISOString().split('T')[0]
    }
    
    // Check type-specific fields
    if (type === 'invoice' && !data.document.dueDate) {
      errors.push('Missing due date for invoice')
      // Set default due date (30 days from issue date)
      const dueDate = new Date(data.document.issueDate)
      dueDate.setDate(dueDate.getDate() + 30)
      data.document.dueDate = dueDate.toISOString().split('T')[0]
    } else if (type === 'quote' && !data.document.validUntil) {
      errors.push('Missing valid until date for quote')
      // Set default valid until date (30 days from issue date)
      const validUntil = new Date(data.document.issueDate)
      validUntil.setDate(validUntil.getDate() + 30)
      data.document.validUntil = validUntil.toISOString().split('T')[0]
    }
  }
  
  // Validate clarification fields
  if (typeof data.needsClarification !== 'boolean') {
    errors.push('Missing or invalid needsClarification flag')
    // Set default value
    data.needsClarification = errors.length > 0
  }
  
  // If there are errors, ensure needsClarification is true
  if (errors.length > 0) {
    data.needsClarification = true
  }
  
  // If needsClarification is true but no questions, add default questions
  if (data.needsClarification && (!data.clarificationQuestions || !Array.isArray(data.clarificationQuestions) || data.clarificationQuestions.length === 0)) {
    errors.push('Needs clarification but missing clarification questions')
    // Add default questions
    data.clarificationQuestions = [
      "Could you provide more details about the client?",
      "What specific products or services should be included?",
      "What are the quantities and prices for each item?"
    ]
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