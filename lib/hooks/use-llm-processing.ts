/**
 * @file LLM processing hook
 * @description 
 * Custom hook for managing LLM processing state and logic.
 * Handles the workflow of processing text, managing clarifications,
 * and preparing the final result.
 * 
 * Key features:
 * - Manages multi-step processing state
 * - Handles clarification questions and answers
 * - Provides methods for editing and resetting the process
 * - Tracks result data throughout the workflow
 * 
 * @dependencies
 * - parseLLMTextAction: Server action for LLM text processing
 * - LLMParseResult: Type definition for parsed result
 * 
 * @notes
 * - Only runs on the client side
 * - Uses React's useState for state management
 * - Handles the complete workflow from initial parsing to final result
 */

"use client"

import { parseLLMTextAction } from "@/actions/llm-actions"
import { LLMParseResult } from "@/types"
import { useState } from "react"

// Define the possible states in the LLM processing workflow
type LLMProcessingState = 'input' | 'processing' | 'clarification' | 'review' | 'error'

/**
 * Custom hook for managing LLM processing workflow
 * 
 * @returns Object with state, methods, and data for LLM processing
 */
export function useLLMProcessing() {
  // Current state in the processing workflow
  const [state, setState] = useState<LLMProcessingState>('input')
  
  // The parsed result from the LLM
  const [parseResult, setParseResult] = useState<LLMParseResult | null>(null)
  
  // Original user text input (for reprocessing if needed)
  const [originalText, setOriginalText] = useState<string>('')
  
  // User ID and document type for context
  const [context, setContext] = useState<{
    userId?: string;
    type?: 'invoice' | 'quote';
  }>({})
  
  // Clarification answers for the LLM
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>([])
  
  /**
   * Handle the initial parsed result from the LLM
   * 
   * @param result - The parsed result from LLM
   */
  const handleParsedResult = (result: LLMParseResult) => {
    setParseResult(result)
    setOriginalText(result.rawText || '')
    
    // If clarification is needed, move to clarification state
    if (result.needsClarification && result.clarificationQuestions?.length) {
      setState('clarification')
      
      // Initialize clarification answers array with empty strings
      setClarificationAnswers(
        Array(result.clarificationQuestions.length).fill('')
      )
    } else {
      // No clarification needed, move to review state
      setState('review')
    }
  }
  
  /**
   * Update a clarification answer
   * 
   * @param index - Index of the clarification question
   * @param value - User's answer
   */
  const handleClarificationChange = (index: number, value: string) => {
    setClarificationAnswers(prev => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }
  
  /**
   * Submit clarifications and reprocess with additional context
   */
  const handleClarificationSubmit = async () => {
    if (!originalText || !parseResult) return
    
    setState('processing')
    
    try {
      // Create enhanced text with clarification answers
      const enhancedText = [
        originalText,
        '---',
        'Additional Information:',
        ...(parseResult.clarificationQuestions || []).map(
          (q, i) => `${q} ${clarificationAnswers[i]}`
        )
      ].join('\n')
      
      // Re-process with clarifications
      if (context.userId && context.type) {
        const result = await parseLLMTextAction(
          enhancedText,
          context.userId,
          context.type
        )
        
        if (result.isSuccess) {
          setParseResult(result.data)
          setState('review')
        } else {
          setState('error')
        }
      } else {
        setState('error')
      }
    } catch (error) {
      console.error('Error processing clarifications:', error)
      setState('error')
    }
  }
  
  /**
   * Allow editing of the parsed result
   * (Currently just moves back to input state - would be expanded in real implementation)
   */
  const handleEditResult = () => {
    // In a real implementation, this would open an editor for the parsed result
    // For now, we'll just reset to the input state with the original text
    setState('input')
  }
  
  /**
   * Reset the process and start over
   */
  const handleReset = () => {
    setState('input')
    setParseResult(null)
    setOriginalText('')
    setClarificationAnswers([])
  }
  
  return {
    // Current state
    state,
    parseResult,
    clarificationAnswers,
    
    // Methods
    handleParsedResult,
    handleClarificationChange,
    handleClarificationSubmit,
    handleEditResult,
    handleReset
  }
}