/**
 * @file OpenAI API client configuration
 * @description 
 * This file sets up the OpenAI client for making API calls.
 * It provides a configured instance of the OpenAI client with the API key.
 * 
 * @dependencies
 * - openai: OpenAI API client for Node.js
 * 
 * @notes
 * - Uses environment variable OPENAI_API_KEY for authentication
 * - Configures default timeout and other client settings
 */

import OpenAI from "openai"

// Initialize the OpenAI API client with the API key
if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API key. Set OPENAI_API_KEY environment variable.")
}

// Create and export the OpenAI client instance
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 seconds timeout for API requests
  maxRetries: 2   // Retry failed requests up to 2 times
})