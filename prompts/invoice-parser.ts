/**
 * @file Invoice parsing prompt
 * @description 
 * This file contains the prompt template for parsing unstructured text into structured invoice data.
 * It builds a detailed prompt with all necessary context for the LLM to accurately extract invoice information.
 * 
 * @dependencies
 * - LLMParseContext from "@/types"
 * 
 * @notes
 * - The prompt is designed to guide the LLM through a systematic parsing process
 * - System-level instructions ensure the LLM correctly formats the output
 * - User-level instructions provide the specific text and context to parse
 */

import { LLMParseContext } from "@/types"

/**
 * Builds a prompt for invoice parsing based on the given context
 * @param context Object containing the text to parse and relevant business context
 * @returns Formatted prompt string to send to the LLM
 */
export function buildInvoiceParserPrompt(context: LLMParseContext): string {
  // Format existing clients and products as JSON for the LLM to reference
  const clientsData = context.clients.map(client => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    taxNumber: client.taxNumber
  }))

  const productsData = context.products.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    unitPrice: product.unitPrice,
    taxRate: product.taxRate
  }))

  // Build the complete prompt
  return `
You are an expert invoice parser for a small business invoicing system. Your task is to analyze unstructured text input and extract structured information about an invoice.

## CONTEXT
- Business name: ${context.profile.businessName}
- Default tax rate: ${context.profile.defaultTaxRate || '0'}%
- The user is creating an INVOICE (not a quote)

## EXISTING CLIENTS
${JSON.stringify(clientsData, null, 2)}

## EXISTING PRODUCTS/SERVICES
${JSON.stringify(productsData, null, 2)}

## USER INPUT
"""
${context.text}
"""

## INSTRUCTIONS
1. Extract client information:
   - Try to identify if this matches an existing client from the provided list
   - If it matches an existing client with high confidence, use their ID and information
   - If uncertain, extract as much client information as possible without assigning an ID

2. Extract invoice line items:
   - For each product or service mentioned, identify if it matches an existing product
   - If it matches an existing product with high confidence, include the product ID
   - Extract description, quantity, unit price, and tax rate (if mentioned)
   - Calculate subtotal (quantity × unit price) and total (subtotal + tax) for each item

3. Extract other invoice details:
   - Issue date (default to today if not specified)
   - Due date (default to 30 days from issue date if not specified)
   - Any notes or special instructions
   - Any discount mentioned

4. Identify unclear information:
   - Flag any ambiguous information that would require clarification
   - Provide specific questions the system should ask the user to clarify

## RESPONSE FORMAT
Respond with JSON only, following this exact structure:
{
  "client": {
    "id": "string or null if not matched",
    "name": "string",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "taxNumber": "string or null",
    "confidence": "high, medium, or low"
  },
  "items": [
    {
      "productId": "string or null if not matched",
      "description": "string",
      "quantity": "string (numeric value)",
      "unitPrice": "string (numeric value)",
      "taxRate": "string (numeric value, percentage)",
      "subtotal": "string (numeric value)",
      "total": "string (numeric value)"
    }
  ],
  "document": {
    "issueDate": "ISO date string or null",
    "dueDate": "ISO date string or null",
    "notes": "string or null",
    "discount": "string (numeric value) or null"
  },
  "needsClarification": boolean,
  "clarificationQuestions": ["string"]
}

Be precise, make reasonable inferences when information is implied but not explicit, and flag for clarification when there's genuine ambiguity. Format monetary values as numeric strings without currency symbols (e.g., "100.00").
`
}