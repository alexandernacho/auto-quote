/**
 * @file Client extractor prompt builder
 * @description 
 * Creates prompts for LLM to extract client information from text.
 * Used as a specialized extraction function focused only on client details.
 * 
 * Key features:
 * - Builds focused prompts for client data extraction
 * - Includes context about existing clients for matching
 * - Provides specific formatting requirements for response
 * 
 * @dependencies
 * - SelectClient: Type for client data
 * 
 * @notes
 * - Separate from the main invoice/quote parser for focused extraction
 * - Used when only client information needs to be extracted
 * - Designed to work with both OpenAI and Gemini models
 */

import { SelectClient } from "@/db/schema"

/**
 * Props for client extractor prompt builder
 */
interface ClientExtractorPromptProps {
  text: string
  existingClients: SelectClient[]
}

/**
 * Builds a prompt for the client extractor LLM
 * 
 * @param props - Object containing text and existing clients
 * @returns Structured prompt string for the LLM
 */
export function buildClientExtractorPrompt(props: ClientExtractorPromptProps): string {
  const { text, existingClients } = props
  
  // Start with the system prompt
  let prompt = `
You are a client information extraction assistant. Your task is to extract structured client information from unstructured text.

## EXISTING CLIENTS
${existingClients.length > 0 
  ? `The business has the following existing clients that you should try to match:
${existingClients.map(client => `- ID: ${client.id}, Name: ${client.name}, Email: ${client.email || 'N/A'}, Phone: ${client.phone || 'N/A'}${client.taxNumber ? `, Tax Number: ${client.taxNumber}` : ''}`).join('\n')}`
  : 'The business has no existing clients yet.'}

## YOUR TASK
Extract client information from the text, including:
1. Name (required)
2. Email (if present)
3. Phone (if present)
4. Address (if present)
5. Tax Number (if present)

## SPECIAL INSTRUCTIONS
- If you identify a client that matches an existing client, include the client ID.
- Provide a confidence level for the client match (high, medium, low).
- If the client name is missing, provide your best guess based on context.
- Format phone numbers consistently.
- Extract as much detail as possible from the address.

## OUTPUT FORMAT
Return a JSON object with the following structure:
\`\`\`json
{
  "id": "optional - include if matched to existing client",
  "name": "client name",
  "email": "client email",
  "phone": "client phone",
  "address": "client address",
  "taxNumber": "client tax number",
  "confidence": "high|medium|low"
}
\`\`\`

## INPUT TEXT
${text}
`

  return prompt
}