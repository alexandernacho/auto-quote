/**
 * @file Google Gemini API client configuration (DISABLED)
 * @description 
 * This file provides a placeholder for the Gemini API client.
 * Currently disabled in favor of using only OpenAI.
 */

// Placeholder model
export const geminiModel = {
  generateContent: async () => {
    throw new Error("Gemini is disabled. Using OpenAI only.")
  }
}

// Placeholder function
export async function generateGeminiContent(prompt: string): Promise<string> {
  console.warn("Gemini is disabled. Using OpenAI only.")
  throw new Error("Gemini is disabled. Using OpenAI only.")
}