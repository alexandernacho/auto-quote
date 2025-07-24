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
 * - handleActionError, createSuccessResponse: For standardized error/success handling
 * 
 * @notes
 * - Implements detailed validation and error handling
 * - Provides client and product matching with confidence scoring
 * - Uses standardized error handling patterns for consistency
 */

"use server"

import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { getProductsByUserIdAction } from "@/actions/db/products-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { SelectClient, SelectProduct } from "@/db/schema"
import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { openai } from "@/lib/llm/openai"
import { calculateStringSimilarity, createFallbackResponse, normalizePhone, validateLLMResponse } from "@/lib/llm/utils"
import { buildClientExtractorPrompt } from "@/prompts/client-extractor"
import { buildInvoiceParserPrompt } from "@/prompts/invoice-parser"
import { buildQuoteParserPrompt } from "@/prompts/quote-parser"
import { 
  ActionState, 
  ClientMatchResult, 
  ConfidenceLevel,
  LLMExtractedClient, 
  LLMParseContext, 
  LLMParseResult, 
  ProductMatchResult 
} from "@/types"

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
  console.log('🔥 parseLLMTextAction called with:', { 
    textLength: text.length, 
    userId, 
    type,
    textPreview: text.substring(0, 100) + '...'
  })
  
  try {
    // Get user profile and existing clients for context
    console.log('👤 Fetching user profile for:', userId)
    const profileResult = await getProfileByUserIdAction(userId)
    
    if (!profileResult.isSuccess) {
      console.error('❌ Failed to fetch user profile:', profileResult.message)
      throw new Error("Failed to fetch user profile")
    }
    
    console.log('✅ User profile fetched successfully')
    
    console.log('👥 Fetching clients for:', userId)
    const clientsResult = await getClientsByUserIdAction(userId)
    const clients = clientsResult.isSuccess ? clientsResult.data : []
    console.log(`✅ Found ${clients.length} clients`)
    
    // Get existing products
    console.log('🛍️ Fetching products for:', userId)
    const productsResult = await getProductsByUserIdAction(userId)
    const products = productsResult.isSuccess ? productsResult.data : []
    console.log(`✅ Found ${products.length} products`)
    
    // Build parsing context
    const context: LLMParseContext = {
      text,
      type,
      profile: profileResult.data,
      clients,
      products
    }
    
    // Build the appropriate prompt based on document type
    console.log(`📝 Building ${type} parser prompt`)
    const prompt = type === 'invoice' 
      ? buildInvoiceParserPrompt(context)
      : buildQuoteParserPrompt(context)
    console.log('📝 Prompt built, length:', prompt.length)
    
    // Use OpenAI for parsing with timeout
    let parsedData: LLMParseResult
    try {
      console.log('🤖 Starting OpenAI processing...')
      // Add a timeout wrapper to prevent Vercel function timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI request timeout')), 25000) // 25 second timeout
      })
      
      parsedData = await Promise.race([
        parseWithOpenAI(prompt, type),
        timeoutPromise
      ])
      console.log('✅ OpenAI processing completed successfully')
      console.log('📊 Parsed data:', parsedData)
    } catch (error) {
      console.error("❌ OpenAI parsing failed:", error)
      // Return a basic fallback response if OpenAI fails
      console.log('🔄 Using fallback response')
      parsedData = createFallbackResponse(text, type)
      console.log('📊 Fallback data:', parsedData)
    }
    
    // Add raw text for reference
    parsedData.rawText = text
    
    // If no client ID was assigned by the LLM, try to match automatically
    // Use the already fetched clients to avoid additional database calls
    if (parsedData.client && parsedData.client.name && !parsedData.client.id && clients.length > 0) {
      try {
        // Inline client matching logic to avoid timeout
        const scoredClients = clients.map(client => {
          let score = 0
          
          // Calculate name similarity (weighted highest)
          if (parsedData.client.name && client.name) {
            const nameSimilarity = calculateStringSimilarity(parsedData.client.name, client.name)
            score += nameSimilarity * 3
          }
          
          // Email exact match
          if (parsedData.client.email && client.email && 
              parsedData.client.email.toLowerCase() === client.email.toLowerCase()) {
            score += 5
          }
          
          // Phone match
          if (parsedData.client.phone && client.phone) {
            const normalizedInput = normalizePhone(parsedData.client.phone)
            const normalizedStored = normalizePhone(client.phone)
            if (normalizedInput === normalizedStored) {
              score += 4
            }
          }
          
          // Address similarity
          if (parsedData.client.address && client.address) {
            const addressSimilarity = calculateStringSimilarity(parsedData.client.address, client.address)
            score += addressSimilarity * 2
          }
          
          // Tax number match
          if (parsedData.client.taxNumber && client.taxNumber && 
              parsedData.client.taxNumber === client.taxNumber) {
            score += 4
          }
          
          return { client, score }
        })
        
        // Sort by score and get top match
        const topMatch = scoredClients.sort((a, b) => b.score - a.score)[0]
        
        if (topMatch && topMatch.score > 0) {
          // Determine confidence level
          let confidence: ConfidenceLevel = 'low'
          if (topMatch.score > 8) {
            confidence = 'high'
          } else if (topMatch.score > 4) {
            confidence = 'medium'
          }
          
          // Auto-assign if confidence is high
          if (confidence === 'high') {
            parsedData.client.id = topMatch.client.id
            parsedData.client.matchConfidence = 'high'
          } else if (confidence === 'medium') {
            // Store the top match for user confirmation
            parsedData.client.suggestedMatch = topMatch.client
            parsedData.client.matchConfidence = 'medium'
          }
        }
      } catch (error) {
        console.warn('Client matching failed, continuing without match:', error)
      }
    }
    
    // Ensure needsClarification is set to true if there are validation issues
    if (!parsedData.items || parsedData.items.length === 0 || 
        !parsedData.client || !parsedData.client.name ||
        !parsedData.document) {
      parsedData.needsClarification = true
      
      // Ensure clarification questions exist
      if (!parsedData.clarificationQuestions || parsedData.clarificationQuestions.length === 0) {
        parsedData.clarificationQuestions = [
          "Could you provide more details about the client?",
          "What specific products or services should be included?",
          "Are there any special terms or conditions for this document?"
        ]
      }
    }
    
    // If we still don't have a client ID and there's a client name, request clarification
    if (parsedData.client && parsedData.client.name && !parsedData.client.id) {
      parsedData.needsClarification = true
      if (!parsedData.clarificationQuestions) {
        parsedData.clarificationQuestions = []
      }
      // Add client clarification question if not already present
      const clientQuestion = "Could you confirm if this is for an existing client, or should I create a new client?"
      if (!parsedData.clarificationQuestions.includes(clientQuestion)) {
        parsedData.clarificationQuestions.unshift(clientQuestion)
      }
    }
    
    console.log('✅ Final parsed data ready:', {
      hasClient: !!parsedData.client,
      clientName: parsedData.client?.name,
      clientId: parsedData.client?.id,
      itemsCount: parsedData.items?.length || 0,
      needsClarification: parsedData.needsClarification,
      clarificationQuestions: parsedData.clarificationQuestions?.length || 0
    })
    
    const result = createSuccessResponse(
      parsedData,
      "Text parsed successfully",
      { operation: 'read', entityName: 'text' }
    )
    
    console.log('🎉 Returning success response')
    return result
  } catch (error) {
    console.error('💥 parseLLMTextAction error:', error)
    return handleActionError(error, {
      actionName: 'parseLLMTextAction',
      entityName: 'text',
      operation: 'read'
    })
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
  try {
    const llmResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use faster, cheaper model instead of gpt-4-turbo
      messages: [
        {
          role: "system",
          content: "You are an expert invoice/quote parser. Extract structured data from user input. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0, // Make responses more deterministic and faster
      max_tokens: 2000 // Limit response size to speed up processing
    })
    
    // Parse response
    const responseText = llmResponse.choices[0].message.content || "{}"
    let responseData = JSON.parse(responseText)
    
    // Validate response structure
    const validationResult = validateLLMResponse(responseData, type)
    
    if (!validationResult.isValid) {
      console.warn(`OpenAI response validation failed: ${validationResult.errors.join(", ")}`)
      
      // Instead of throwing an error, fix the response data
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const thirtyDaysFromNow = futureDate.toISOString().split('T')[0]
      
      // Ensure client exists
      if (!responseData.client || typeof responseData.client !== 'object') {
        responseData.client = {
          name: "Unknown Client",
          confidence: "low"
        }
      }
      
      // Ensure items exist
      if (!responseData.items || !Array.isArray(responseData.items) || responseData.items.length === 0) {
        responseData.items = [
          {
            description: "Services as described",
            quantity: "1",
            unitPrice: "0",
            subtotal: "0",
            total: "0"
          }
        ]
      }
      
      // Ensure document exists
      if (!responseData.document || typeof responseData.document !== 'object') {
        responseData.document = {
          issueDate: today,
          ...(type === 'invoice' ? { dueDate: thirtyDaysFromNow } : { validUntil: thirtyDaysFromNow }),
          notes: "Generated from incomplete information. Please review and edit."
        }
      }
      
      // Set needsClarification to true
      responseData.needsClarification = true
      
      // Add clarification questions
      responseData.clarificationQuestions = [
        "Could you provide more details about the client?",
        "What specific products or services should be included?",
        "What are the quantities and prices for each item?"
      ]
    }
    
    return responseData as LLMParseResult
  } catch (error) {
    console.error("Error in OpenAI parsing:", error)
    // Return a fallback response instead of throwing an error
    return createFallbackResponse("", type)
  }
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
    let confidence: ConfidenceLevel = 'low'
    
    if (topMatches.length > 0) {
      const topScore = scoredClients[0].score
      
      if (topScore > 8) {
        confidence = 'high'
      } else if (topScore > 4) {
        confidence = 'medium'
      }
    }
    
    return createSuccessResponse(
      {
        matches: topMatches,
        confidence
      },
      "Client matches found",
      { operation: 'read', entityName: 'client matches' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'getMatchedClientSuggestionsAction',
      entityName: 'client suggestions',
      operation: 'read'
    })
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
    let confidence: ConfidenceLevel = 'low'
    
    if (topMatches.length > 0) {
      const topScore = scoredProducts[0].score
      
      if (topScore > 3) {
        confidence = 'high'
      } else if (topScore > 1.5) {
        confidence = 'medium'
      }
    }
    
    return createSuccessResponse(
      {
        matches: topMatches,
        confidence
      },
      "Product matches found",
      { operation: 'read', entityName: 'product matches' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'getMatchedProductSuggestionsAction',
      entityName: 'product suggestions',
      operation: 'read'
    })
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
        model: "gpt-4o-mini", // Use faster model
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting client information from text. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 1000
      })
      
      const responseText = llmResponse.choices[0].message.content || "{}"
      const clientData = JSON.parse(responseText) as LLMExtractedClient
      
      // Validate that we have at least a name
      if (!clientData.name) {
        throw new Error("Invalid OpenAI response: missing client name")
      }
      
      return createSuccessResponse(
        clientData,
        "Client information extracted successfully",
        { operation: 'read', entityName: 'client information' }
      )
    } catch (error) {
      console.error("OpenAI client extraction failed:", error)
      
      // Return a basic client with just the text as the name
      return createSuccessResponse(
        {
          name: text.substring(0, 100), // Use first 100 chars as name
          email: "",
          phone: "",
          address: "",
          taxNumber: ""
        },
        "Fallback client extraction",
        { operation: 'read', entityName: 'client information' }
      )
    }
  } catch (error) {
    return handleActionError(error, {
      actionName: 'extractClientInformationAction',
      entityName: 'client information',
      operation: 'read'
    })
  }
}