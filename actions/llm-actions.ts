/**
 * @file LLM action functions
 * @description 
 * Server actions for processing unstructured text with LLMs.
 * Implements the main text parsing functionality and client/product matching.
 * 
 * @dependencies
 * - openai: OpenAI API client
 * - various database actions for retrieving context data
 * - prompt templates for different document types
 * 
 * @notes
 * - Implements detailed validation and error handling
 * - Provides client and product matching with confidence scoring
 */

"use server"

import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { getProductsByUserIdAction } from "@/actions/db/products-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { SelectClient, SelectProduct } from "@/db/schema"
import { openai } from "@/lib/llm/openai"
import { calculateStringSimilarity, createFallbackResponse, normalizePhone, validateLLMResponse } from "@/lib/llm/utils"
import { buildClientExtractorPrompt } from "@/prompts/client-extractor"
import { buildInvoiceParserPrompt } from "@/prompts/invoice-parser"
import { buildQuoteParserPrompt } from "@/prompts/quote-parser"
import { ActionState, ClientMatchResult, LLMExtractedClient, LLMParseContext, LLMParseResult, ProductMatchResult } from "@/types"

/**
 * Main action for parsing unstructured text into structured invoice or quote data
 * 
 * @param text Unstructured text input from the user
 * @param userId User ID for retrieving context data
 * @param type Type of document to parse (invoice or quote)
 * @returns Parsed structure with client, items, and document details
 */
export async function parseLLMTextAction(
  text: string,
  userId: string,
  type: 'invoice' | 'quote'
): Promise<ActionState<LLMParseResult>> {
  try {
    // Get user profile and existing clients for context
    const profileResult = await getProfileByUserIdAction(userId)
    
    if (!profileResult.isSuccess) {
      throw new Error("Failed to fetch user profile")
    }
    
    const clientsResult = await getClientsByUserIdAction(userId)
    const clients = clientsResult.isSuccess ? clientsResult.data : []
    
    // Get existing products
    const productsResult = await getProductsByUserIdAction(userId)
    const products = productsResult.isSuccess ? productsResult.data : []
    
    // Build parsing context
    const context: LLMParseContext = {
      text,
      type,
      profile: profileResult.data,
      clients,
      products
    }
    
    // Build the appropriate prompt based on document type
    const prompt = type === 'invoice' 
      ? buildInvoiceParserPrompt(context)
      : buildQuoteParserPrompt(context)
    
    // Use OpenAI for parsing
    let parsedData: LLMParseResult
    try {
      parsedData = await parseWithOpenAI(prompt, type)
    } catch (error) {
      console.error("OpenAI parsing failed:", error)
      // Return a basic fallback response if OpenAI fails
      parsedData = createFallbackResponse(text, type)
    }
    
    // Add raw text for reference
    parsedData.rawText = text
    
    return {
      isSuccess: true,
      message: "Text parsed successfully",
      data: parsedData
    }
  } catch (error) {
    console.error("Error parsing text with LLM:", error)
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to parse text" 
    }
  }
}

/**
 * Parse text using OpenAI API
 * 
 * @param prompt Formatted prompt to send to OpenAI
 * @param type Type of document (invoice or quote)
 * @returns Parsed result structure
 */
async function parseWithOpenAI(prompt: string, type: 'invoice' | 'quote'): Promise<LLMParseResult> {
  const llmResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: "You are an expert invoice/quote parser. Extract structured data from user input."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }
  })
  
  // Parse response
  const responseText = llmResponse.choices[0].message.content || "{}"
  const responseData = JSON.parse(responseText)
  
  // Validate response structure
  const validationResult = validateLLMResponse(responseData, type)
  
  if (!validationResult.isValid) {
    throw new Error(`Invalid OpenAI response: ${validationResult.errors.join(", ")}`)
  }
  
  return responseData as LLMParseResult
}

/**
 * Get client suggestions based on partial data from LLM parsing
 * 
 * @param partialClient Partial client data extracted by LLM
 * @param userId User ID for retrieving client context
 * @returns Matched clients with confidence level
 */
export async function getMatchedClientSuggestionsAction(
  partialClient: Partial<LLMExtractedClient>,
  userId: string
): Promise<ActionState<ClientMatchResult>> {
  try {
    // Get all clients for the user
    const clientsResult = await getClientsByUserIdAction(userId)
    
    if (!clientsResult.isSuccess) {
      throw new Error("Failed to fetch clients")
    }
    
    const clients = clientsResult.data
    
    // Calculate match scores for each client
    const scoredClients = clients.map(client => {
      let score = 0
      
      // Calculate name similarity (weighted highest)
      if (partialClient.name && client.name) {
        const nameSimilarity = calculateStringSimilarity(partialClient.name, client.name)
        score += nameSimilarity * 3
      }
      
      // Email match (exact match gives high score)
      if (partialClient.email && client.email && partialClient.email.toLowerCase() === client.email.toLowerCase()) {
        score += 5
      }
      
      // Phone match
      if (partialClient.phone && client.phone) {
        const normalizedInput = normalizePhone(partialClient.phone)
        const normalizedStored = normalizePhone(client.phone)
        
        if (normalizedInput === normalizedStored) {
          score += 4
        }
      }
      
      // Address similarity
      if (partialClient.address && client.address) {
        const addressSimilarity = calculateStringSimilarity(partialClient.address, client.address)
        score += addressSimilarity * 2
      }
      
      // Tax number match
      if (partialClient.taxNumber && client.taxNumber && partialClient.taxNumber === client.taxNumber) {
        score += 4
      }
      
      return {
        client,
        score
      }
    })
    
    // Sort by score and take top 3
    const topMatches = scoredClients
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.client)
    
    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low'
    
    if (topMatches.length > 0) {
      const topScore = scoredClients[0].score
      
      if (topScore > 8) {
        confidence = 'high'
      } else if (topScore > 4) {
        confidence = 'medium'
      }
    }
    
    return {
      isSuccess: true,
      message: "Client matches found",
      data: {
        matches: topMatches,
        confidence
      }
    }
  } catch (error) {
    console.error("Error getting client suggestions:", error)
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to get client suggestions" 
    }
  }
}

/**
 * Get product/service suggestions based on description
 * 
 * @param description Product description to match
 * @param userId User ID for retrieving product context
 * @returns Matched products with confidence level
 */
export async function getMatchedProductSuggestionsAction(
  description: string,
  userId: string
): Promise<ActionState<ProductMatchResult>> {
  try {
    // Get all products for the user
    const productsResult = await getProductsByUserIdAction(userId)
    
    if (!productsResult.isSuccess) {
      throw new Error("Failed to fetch products")
    }
    
    const products = productsResult.data
    
    // Calculate match scores for each product
    const scoredProducts = products.map(product => {
      let score = 0
      
      // Calculate name similarity
      if (product.name) {
        const nameSimilarity = calculateStringSimilarity(description, product.name)
        score += nameSimilarity * 4
      }
      
      // Calculate description similarity if available
      if (product.description) {
        const descSimilarity = calculateStringSimilarity(description, product.description)
        score += descSimilarity * 3
      }
      
      return {
        product,
        score
      }
    })
    
    // Sort by score and take top 3
    const topMatches = scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.product)
    
    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low'
    
    if (topMatches.length > 0) {
      const topScore = scoredProducts[0].score
      
      if (topScore > 3) {
        confidence = 'high'
      } else if (topScore > 1.5) {
        confidence = 'medium'
      }
    }
    
    return {
      isSuccess: true,
      message: "Product matches found",
      data: {
        matches: topMatches,
        confidence
      }
    }
  } catch (error) {
    console.error("Error getting product suggestions:", error)
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to get product suggestions" 
    }
  }
}

/**
 * Extract client information from unstructured text
 * 
 * @param text Unstructured text input from the user
 * @param userId User ID for retrieving client context
 * @returns Extracted client information
 */
export async function extractClientInformationAction(
  text: string,
  userId: string
): Promise<ActionState<LLMExtractedClient>> {
  try {
    // Get existing clients for context
    const clientsResult = await getClientsByUserIdAction(userId)
    const clients = clientsResult.isSuccess ? clientsResult.data : []
    
    // Build the prompt
    const prompt = buildClientExtractorPrompt({
      text,
      existingClients: clients
    })
    
    // Use OpenAI to extract client information
    try {
      const llmResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting client information from text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      })
      
      const responseText = llmResponse.choices[0].message.content || "{}"
      const clientData = JSON.parse(responseText) as LLMExtractedClient
      
      // Validate that we have at least a name
      if (!clientData.name) {
        throw new Error("Invalid OpenAI response: missing client name")
      }
      
      return {
        isSuccess: true,
        message: "Client information extracted successfully",
        data: clientData
      }
    } catch (error) {
      console.error("OpenAI client extraction failed:", error)
      
      // Return a basic client with just the text as the name
      return {
        isSuccess: true,
        message: "Fallback client extraction",
        data: {
          name: text.substring(0, 100), // Use first 100 chars as name
          email: "",
          phone: "",
          address: "",
          taxNumber: ""
        }
      }
    }
  } catch (error) {
    console.error("Error extracting client information:", error)
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to extract client information" 
    }
  }
}