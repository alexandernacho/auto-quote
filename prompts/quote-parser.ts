/**
 * @file Quote parser prompt builder
 * @description 
 * Creates structured prompts for LLM to parse unstructured text into quote data.
 * Includes context about the user's profile, existing clients, and products to improve extraction.
 * 
 * Key features:
 * - Builds detailed system prompts with context
 * - Includes examples of structured output format
 * - Provides guidance on confidence levels and clarification needs
 * 
 * @dependencies
 * - LLMParseContext: Type for parsing context
 * 
 * @notes
 * - The prompt follows a similar structure to the invoice parser prompt
 * - Uses quote-specific terminology and fields
 * - Provides context about existing clients and products for better matching
 */

import { LLMParseContext } from "@/types"

/**
 * Builds a prompt for the quote parser LLM
 * 
 * @param context - Parsing context including user text, profile, clients, and products
 * @returns Structured prompt string for the LLM
 */
export function buildQuoteParserPrompt(context: LLMParseContext): string {
  const { text, profile, clients, products } = context
  
  // Start with the system prompt
  let prompt = `
You are an expert quote parser for a business called "${profile.businessName}". Your task is to extract structured quote data from unstructured text.

USER'S TEXT INPUT:
"""
${text}
"""

INSTRUCTIONS:
Extract information about:
1. The client (either match to existing clients or extract new client details)
2. The products/services with quantities, prices, and tax rates
3. Quote details like dates, validity period, and notes

USER'S PROFILE:
Business Name: ${profile.businessName}
Business Email: ${profile.businessEmail}
${profile.businessPhone ? `Business Phone: ${profile.businessPhone}` : ''}
${profile.businessAddress ? `Business Address: ${profile.businessAddress}` : ''}
${profile.vatNumber ? `VAT/Tax Number: ${profile.vatNumber}` : ''}
Default Tax Rate: ${profile.defaultTaxRate || '0'}%

EXISTING CLIENTS:
${clients.length > 0 
  ? `The business has the following existing clients that you should try to match:
${clients.map(client => `- ID: ${client.id}, Name: ${client.name}, Email: ${client.email || 'N/A'}, Phone: ${client.phone || 'N/A'}${client.taxNumber ? `, Tax Number: ${client.taxNumber}` : ''}`).join('\n')}`
  : 'The business has no existing clients yet.'}

## EXISTING PRODUCTS/SERVICES
${products.length > 0
  ? `The business has the following existing products/services that you should try to match:
${products.map(product => `- ID: ${product.id}, Name: ${product.name}, Description: ${product.description || 'N/A'}, Unit Price: ${product.unitPrice}, Tax Rate: ${product.taxRate}%`).join('\n')}`
  : 'The business has no existing products/services yet.'}

## YOUR TASK
Extract the following information from the text:
1. Client information (name, email, phone, address, tax number)
2. Quote items (description, quantity, unit price, tax rate)
3. Quote details (issue date, valid until date, notes, discount)

## SPECIAL INSTRUCTIONS
- If you identify a client that matches an existing client, include the client ID.
- If you identify a product that matches an existing product, include the product ID.
- Calculate subtotal, tax amount, and total for each item.
- Provide a confidence level for the client match (high, medium, low).
- If any critical information is missing or ambiguous, set needsClarification to true and provide clarification questions.
- For the validUntil date, default to 30 days from the issue date if not specified.

## OUTPUT FORMAT
Return a JSON object with the following structure:
\`\`\`json
{
  "client": {
    "id": "optional - include if matched to existing client",
    "name": "client name",
    "email": "client email",
    "phone": "client phone",
    "address": "client address",
    "taxNumber": "client tax number",
    "confidence": "high|medium|low"
  },
  "items": [
    {
      "productId": "optional - include if matched to existing product",
      "description": "item description",
      "quantity": "quantity as string",
      "unitPrice": "unit price as string",
      "taxRate": "tax rate as string (e.g., '10' for 10%)",
      "taxAmount": "calculated tax amount",
      "subtotal": "calculated subtotal (quantity * unitPrice)",
      "total": "calculated total (subtotal + taxAmount)"
    }
  ],
  "document": {
    "issueDate": "YYYY-MM-DD",
    "validUntil": "YYYY-MM-DD",
    "notes": "quote notes if any"
  },
  "needsClarification": true/false,
  "clarificationQuestions": ["question 1", "question 2"]
}

IMPORTANT RULES:
1. Try to match clients by name, email, phone, or address to existing clients. If matched with high confidence, include the client ID.
2. Try to match products/services to existing ones. If matched with high confidence, include the product ID.
3. Calculate subtotals as quantity × unitPrice.
4. Calculate taxAmount as subtotal × (taxRate/100).
5. Calculate total as subtotal + taxAmount.
6. Use the default tax rate of ${profile.defaultTaxRate || '0'}% for items where tax is not specified.
7. If information is missing or ambiguous, set needsClarification to true and include specific questions.
8. Format all monetary values as strings with 2 decimal places (e.g., "123.45").
9. Format dates in YYYY-MM-DD format.
10. If no specific issue date is mentioned, use today's date.
11. If no specific validity period is mentioned, set validUntil to 30 days from the issue date.

EXAMPLE INPUT:
"""
Create a quote for ABC Corp for a website redesign project. The project will cost $5000 and includes 20 hours of design work at $100/hour and 30 hours of development at $100/hour. The quote should be valid for 60 days.
"""

EXAMPLE OUTPUT:
{
  "client": {
    "name": "ABC Corp",
    "confidence": "medium"
  },
  "items": [
    {
      "description": "Website Design",
      "quantity": "20",
      "unitPrice": "100.00",
      "taxRate": "0.00",
      "subtotal": "2000.00",
      "total": "2000.00"
    },
    {
      "description": "Website Development",
      "quantity": "30",
      "unitPrice": "100.00",
      "taxRate": "0.00",
      "subtotal": "3000.00",
      "total": "3000.00"
    }
  ],
  "document": {
    "issueDate": "2023-06-15",
    "validUntil": "2023-08-14",
    "notes": "Website redesign project quote"
  },
  "needsClarification": false,
  "clarificationQuestions": []
}
\`\`\`

## INPUT TEXT
${text}
`

  return prompt
}