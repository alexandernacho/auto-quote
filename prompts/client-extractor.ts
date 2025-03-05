/**
 * @file Client extractor prompt builder
 * @description 
 * Builds prompts for LLM to extract client information from unstructured text.
 * Creates a focused prompt for identifying and extracting client details.
 * 
 * Key features:
 * - Generate prompts specifically for client information extraction
 * - Include context about existing clients for better matching
 * - Structure the expected output format
 * - Provide clear instructions for client identification
 * 
 * @dependencies
 * - SelectClient: Database type for client data
 * 
 * @notes
 * - More focused than the general invoice/quote parser
 * - Used when client information needs to be extracted separately
 * - Provides existing clients to help with matching and disambiguation
 */

import { SelectClient } from "@/db/schema"

// Define the context interface for client extraction
interface ClientExtractionContext {
  text: string
  existingClients: SelectClient[]
}

/**
 * Build a prompt for client information extraction
 * 
 * @param context The context data including user text and existing clients
 * @returns Formatted prompt string for the LLM
 */
export function buildClientExtractorPrompt(context: ClientExtractionContext): string {
  const { text, existingClients } = context
  
  // Start with the system instructions
  let prompt = `
You are an expert client information extractor. Your task is to identify and extract client details from unstructured text.

USER'S TEXT INPUT:
"""
${text}
"""

INSTRUCTIONS:
Analyze the text and extract information about a client, including:
1. Client name
2. Email address (if present)
3. Phone number (if present)
4. Physical address (if present)
5. Tax/VAT number (if present)

EXISTING CLIENTS:
${existingClients.length > 0 
  ? existingClients.map(client => {
      return `- ${client.name} (ID: ${client.id})
    ${client.email ? `Email: ${client.email}` : ''}
    ${client.phone ? `Phone: ${client.phone}` : ''}
    ${client.address ? `Address: ${client.address}` : ''}
    ${client.taxNumber ? `Tax Number: ${client.taxNumber}` : ''}`
    }).join('\n\n')
  : 'No existing clients.'
}

OUTPUT FORMAT:
Provide the output as a JSON object with the following structure:
{
  "id": "optional-existing-client-id-if-matched",
  "name": "client name",
  "email": "client email (if available)",
  "phone": "client phone (if available)",
  "address": "client address (if available)",
  "taxNumber": "client tax/VAT number (if available)",
  "confidence": "high/medium/low"
}

IMPORTANT RULES:
1. The "name" field is required - extract or infer a client name even if it's not explicitly stated.
2. Leave other fields empty if they're not present in the text.
3. Try to match the client to an existing client if possible. If matched with high confidence, include the client ID.
4. Set the confidence level based on how sure you are about the client identification:
   - "high": Clear, explicit client information that matches an existing client
   - "medium": Clear client information but doesn't match an existing client, or partial match
   - "low": Inferred or ambiguous client information
5. If multiple potential clients are mentioned, choose the most likely one based on context.
6. Format phone numbers as provided in the text.

EXAMPLE INPUT:
"""
Please create an invoice for Acme Corporation. The contact is John Smith (john@acme.com).
"""

EXAMPLE OUTPUT:
{
  "name": "Acme Corporation",
  "email": "john@acme.com",
  "phone": "",
  "address": "",
  "taxNumber": "",
  "confidence": "medium"
}

Now, analyze the user's text and provide a structured response containing only the client information:
`

  return prompt
}