/**
 * @file Domain model type definitions
 * @description 
 * Shared domain model types that are used across multiple parts of the application.
 * These types represent core business entities and concepts.
 * 
 * Key types:
 * - Document-related types for invoices and quotes
 * - Payment and pricing models
 * - User preferences and settings
 * 
 * @notes
 * - These types should be kept separate from UI and implementation specific types
 * - Focus on the business domain rather than technical implementation
 * - When a type is used in both UI and database contexts, define it here
 */

/**
 * Document types supported by the application
 */
export type DocumentType = 'invoice' | 'quote'

/**
 * Document status types
 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'canceled'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

/**
 * Document display options for generating PDFs and DOCXs
 */
export interface DocumentDisplayOptions {
  showLogo: boolean
  showBusinessAddress: boolean
  showClientAddress: boolean
  showPaymentTerms: boolean
  showNotes: boolean
  primaryColor: string
  secondaryColor: string
  font: string
}

/**
 * Currency information
 */
export interface Currency {
  code: string           // ISO 4217 currency code (e.g., USD, EUR)
  symbol: string         // Currency symbol (e.g., $, €)
  name: string           // Currency name (e.g., US Dollar)
  decimalPlaces: number  // Number of decimal places (typically 2)
}

/**
 * Money amount with currency 
 */
export interface MoneyAmount {
  amount: string         // Decimal string to preserve precision
  currency: string       // Currency code
}

/**
 * Subscription tier options
 */
export type MembershipTier = 'free' | 'pro'

/**
 * User preference settings
 */
export interface UserPreferences {
  defaultTaxRate: string
  defaultCurrency: string
  defaultPaymentTerms: string
  defaultTermsAndConditions: string
  dateFormat: string
  numberFormat: string
}

/**
 * Address structure for business and clients
 */
export interface Address {
  street1: string
  street2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

/**
 * Common line item structure used in both invoices and quotes
 */
export interface LineItem {
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
  taxAmount: string
  subtotal: string
  total: string
}

/**
 * Confidence level for LLM matches and suggestions
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * Logo position options for document templates
 */
export type LogoPosition = 'top-left' | 'top-center' | 'top-right' | 'none'