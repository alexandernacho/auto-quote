/**
 * @file Client extraction prompt
 * @description 
 * This file contains the prompt template for extracting client information from unstructured text.
 * It's a specialized version of the general parser that focuses exclusively on client details.
 * 
 * @dependencies
 * - SelectClient from "@/db/schema"
 * 
 * @notes
 * - Used when the system specifically needs to extract or match client information
 * - Provides more detailed client-focused instructions to the LLM
 */

import { SelectClient } from "@/db/schema"

/**
 * Interface for client extraction context
 */
interface ClientExtractionContext {
  text: string
  existingClients: SelectClient[]
}

/**
 * Builds a prompt for client extraction based on the given context
 * @param context Object containing the text to parse and existing clients
 * @returns Formatted prompt string to send to the LLM
 */
export function buildClientExtractorPrompt(context: ClientExtractionContext): string {
  // Format existing clients as JSON for the LLM to reference
  const clientsData = context.existingClients.map(client => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    taxNumber: client.taxNumber
  }))

  // Build the complete prompt
  return `
You are an expert client information extractor for a business invoicing system. Your task is to analyze unstructured text input and extract structured information about a client.

## EXISTING CLIENTS
${JSON.stringify(clientsData, null, 2)}

## USER INPUT
"""
${context.text}
"""

## INSTRUCTIONS
1. Extract client information from the text:
   - Client name (company or individual)
   - Email address
   - Phone number
   - Physical address
   - Tax/VAT number (if present)

2. Check if this matches an existing client:
   - Compare the extracted information with the existing clients list
   - If there's a match with high confidence, include the client's ID
   - Assess match confidence as high, medium, or low

## RESPONSE FORMAT
Respond with JSON only, following this exact structure:
{
  "id": "string or null if not matched",
  "name": "string",
  "email": "string or null",
  "phone": "string or null",
  "address": "string or null",
  "taxNumber": "string or null",
  "confidence": "high, medium, or low"
}

Be precise and extract as much information as possible. If information is missing, leave the field as null. Make reasonable inferences when information is implied but not explicit.
`
}