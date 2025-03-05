/**
 * @file Google Gemini API client configuration
 * @description 
 * This file sets up the Google Gemini client for making API calls.
 * It provides a configured instance of the Google Generative AI client with the API key.
 * 
 * @dependencies
 * - @google/generative-ai: Google's Generative AI SDK for Node.js
 * 
 * @notes
 * - Uses environment variable GEMINI_API_KEY for authentication
 * - Configures the client to use the Gemini Flash 2.0 model
 * - Includes safety settings to ensure responsible AI usage
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

// Check if Gemini API key is available
if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing Gemini API key. Set GEMINI_API_KEY environment variable.")
}

// Initialize the Google Generative AI SDK with the API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Configure safety settings to prevent harmful content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
  }
]

// Create the model instance
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-flash-2.0", // Using Gemini Flash 2.0 for faster responses
  safetySettings
})

// Export a function to generate content with Gemini
export async function generateGeminiContent(prompt: string) {
  try {
    const result = await geminiModel.generateContent(prompt)
    const response = result.response
    return response.text()
  } catch (error) {
    console.error("Error generating content with Gemini:", error)
    throw error
  }
}