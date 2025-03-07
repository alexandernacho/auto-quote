/**
 * @file LLM parsing types definition
 * @description 
 * Type definitions for LLM parsing functionality.
 * Defines the structure of data sent to and received from LLM models.
 * 
 * @dependencies
 * - SelectClient, SelectProduct: Schema types imported from database schema
 * - ConfidenceLevel: Shared domain type for confidence indicators
 * 
 * @notes
 * - These types are used across the application to ensure consistent data structures
 * - LLMParseResult is the main result type returned by the LLM parsing functions
 */

import { SelectClient, SelectProduct } from "@/db/schema"
import { ConfidenceLevel } from "./domain-types"

/**
 * Client information extracted by the LLM
 * This can represent a new client or partial data for matching with existing clients
 */
export interface LLMExtractedClient {
  id?: string             // Populated only if matched to existing client
  name: string            // Required - client name
  email?: string          // Optional email address
  phone?: string          // Optional phone number
  address?: string        // Optional address
  taxNumber?: string      // Optional tax/VAT number
  confidence?: ConfidenceLevel // Confidence level of the match
}

/**
 * Item extracted by the LLM (for both invoices and quotes)
 */
export interface LLMExtractedItem {
  productId?: string      // Populated if matched to existing product
  description: string     // Description of the item
  quantity: string        // Quantity as string (for decimal precision)
  unitPrice: string       // Unit price as string (for decimal precision)
  taxRate?: string        // Optional tax rate as string
  subtotal?: string       // Optional calculated subtotal
  total?: string          // Optional calculated total with tax
  taxAmount?: string      // Optional tax amount
}

/**
 * Document information extracted by the LLM
 */
export interface LLMExtractedDocument {
  issueDate?: string      // Issue date in ISO format
  dueDate?: string        // Due date in ISO format (for invoices)
  validUntil?: string     // Valid until date in ISO format (for quotes)
  notes?: string          // Optional notes
  discount?: string       // Optional discount amount
}

/**
 * The main result returned from LLM parsing
 */
export interface LLMParseResult {
  client: LLMExtractedClient
  items: LLMExtractedItem[]
  document: LLMExtractedDocument
  needsClarification: boolean
  clarificationQuestions?: string[]
  rawText?: string        // Optional original text for reference
}

/**
 * Context provided to the LLM for parsing
 */
export interface LLMParseContext {
  text: string
  type: 'invoice' | 'quote'
  profile: any
  clients: SelectClient[]
  products: SelectProduct[]
}

/**
 * Response from client matching function
 */
export interface ClientMatchResult {
  matches: SelectClient[]
  confidence: ConfidenceLevel
}

/**
 * Response from product matching function
 */
export interface ProductMatchResult {
  matches: SelectProduct[]
  confidence: ConfidenceLevel
}

/**
 * Response validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}