/**
 * @file Quote parser prompt builder
 * @description 
 * Builds prompts for LLM to parse unstructured text into structured quote data.
 * Creates a detailed prompt with instructions and context for the LLM.
 * 
 * Key features:
 * - Generate prompts for quote parsing
 * - Include context about user's business, clients, and products
 * - Structure the expected output format
 * - Provide example inputs and outputs for better LLM performance
 * 
 * @dependencies
 * - LLMParseContext: Context data for prompt generation
 * 
 * @notes
 * - The prompt includes user profile information to help with context
 * - Existing clients and products are provided to aid in matching
 * - Clear instructions are given about the expected output format
 * - Examples help guide the LLM to produce consistent results
 * - Similar to invoice parsing but with quote-specific fields and terminology
 */

import { LLMParseContext } from "@/types"

/**
 * Build a prompt for quote parsing
 * 
 * @param context The context data including user text, profile, clients, and products
 * @returns Formatted prompt string for the LLM
 */
export function buildQuoteParserPrompt(context: LLMParseContext): string {
  const { text, profile, clients, products } = context
  
  // Start with the system instructions
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
  ? clients.map(client => {
      return `- ${client.name} (ID: ${client.id})
    ${client.email ? `Email: ${client.email}` : ''}
    ${client.phone ? `Phone: ${client.phone}` : ''}
    ${client.address ? `Address: ${client.address}` : ''}
    ${client.taxNumber ? `Tax Number: ${client.taxNumber}` : ''}`
    }).join('\n\n')
  : 'No existing clients.'
}

EXISTING PRODUCTS/SERVICES:
${products.length > 0
  ? products.map(product => {
      return `- ${product.name} (ID: ${product.id})
    ${product.description ? `Description: ${product.description}` : ''}
    Unit Price: ${product.unitPrice}
    Tax Rate: ${product.taxRate}%
    ${product.isRecurring ? `Recurring: ${product.recurrenceUnit || 'Yes'}` : ''}`
    }).join('\n\n')
  : 'No existing products/services.'
}

OUTPUT FORMAT:
Provide the output as a JSON object with the following structure:
{
  "client": {
    "id": "optional-existing-client-id",
    "name": "client name",
    "email": "client email (if available)",
    "phone": "client phone (if available)",
    "address": "client address (if available)",
    "taxNumber": "client tax number (if available)",
    "confidence": "high/medium/low"
  },
  "items": [
    {
      "productId": "optional-existing-product-id",
      "description": "product or service description",
      "quantity": "quantity as string",
      "unitPrice": "price per unit as string",
      "taxRate": "tax rate percentage as string",
      "subtotal": "calculated subtotal as string",
      "total": "calculated total including tax as string"
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

Now, analyze the user's text and provide a structured response:
`

  return prompt
}