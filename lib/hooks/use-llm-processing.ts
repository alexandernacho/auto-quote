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
   * @param userId - The user ID for context
   * @param type - The document type for context
   */
  const handleParsedResult = (result: LLMParseResult, userId?: string, type?: 'invoice' | 'quote') => {
    console.log('🎯 handleParsedResult called with:', { result, userId, type })
    console.log('📊 Current state before update:', state)
    
    setParseResult(result)
    setOriginalText(result.rawText || '')
    
    // Store context for later use
    if (userId && type) {
      console.log('💾 Storing context:', { userId, type })
      setContext({ userId, type })
    }
    
    // If clarification is needed, move to clarification state
    if (result.needsClarification && result.clarificationQuestions?.length) {
      console.log('❓ Clarification needed, moving to clarification state')
      console.log('📝 Clarification questions:', result.clarificationQuestions)
      setState('clarification')
      
      // Initialize clarification answers array with empty strings
      setClarificationAnswers(
        Array(result.clarificationQuestions.length).fill('')
      )
    } else {
      // No clarification needed, move to review state
      console.log('✅ No clarification needed, moving to review state')
      setState('review')
    }
    
    console.log('📊 State should now be:', result.needsClarification && result.clarificationQuestions?.length ? 'clarification' : 'review')
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
    
    // Set state to processing immediately
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
      
      // Get userId and type from context or parseResult
      const userId = context.userId || ''
      const type = context.type || 'invoice'
      
      if (!userId) {
        console.error('Missing userId for clarification processing')
        // Instead of going to error state, try to use the existing result
        setState('review')
        return
      }
      
      // Re-process with clarifications
      try {
        const result = await parseLLMTextAction(
          enhancedText,
          userId,
          type
        )
        
        if (result.isSuccess) {
          setParseResult(result.data)
          setState('review')
        } else {
          console.warn('Clarification processing returned error:', result.message)
          // Instead of going to error state, try to use the existing result
          // but add the clarification answers to it
          const updatedResult = {
            ...parseResult,
            rawText: enhancedText,
            needsClarification: false
          }
          setParseResult(updatedResult)
          setState('review')
        }
      } catch (error) {
        console.error('Error in parseLLMTextAction:', error)
        // Instead of going to error state, try to use the existing result
        const updatedResult = {
          ...parseResult,
          rawText: enhancedText,
          needsClarification: false
        }
        setParseResult(updatedResult)
        setState('review')
      }
    } catch (error) {
      console.error('Error processing clarifications:', error)
      // Instead of going to error state, try to use the existing result
      const updatedResult = parseResult ? {
        ...parseResult,
        needsClarification: false
      } : null
      
      if (updatedResult) {
        setParseResult(updatedResult)
        setState('review')
      } else {
        setState('error')
      }
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