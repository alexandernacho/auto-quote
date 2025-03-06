/**
 * @file AI Invoice Creator client component
 * @description 
 * Client component for AI-assisted invoice creation.
 * Implements multi-step flow for LLM processing.
 */

"use client"

import { LLMInputForm } from "./llm-input-form"
import { LLMProcessing } from "./llm-processing"
import { LLMResults } from "./llm-results"
import { useLLMProcessing } from "@/hooks/use-llm-processing"
import { useState } from "react"

interface AIInvoiceCreatorProps {
  userId: string
  initialClient: any
  initialTemplate: any
  onSwitchToManual: () => void
}

/**
 * Client component for AI-assisted invoice creation
 */
export function AIInvoiceCreator({
  userId,
  initialClient,
  initialTemplate,
  onSwitchToManual
}: AIInvoiceCreatorProps) {
  // Get LLM processing state from custom hook
  const {
    state,
    parseResult,
    handleParsedResult,
    handleReset
  } = useLLMProcessing()
  
  return (
    <div className="space-y-4">
      {state === 'input' && (
        <LLMInputForm 
          userId={userId} 
          type="invoice" 
          onParsedResult={handleParsedResult} 
        />
      )}
      
      {(state === 'processing' || state === 'clarification') && (
        <LLMProcessing 
          userId={userId}
          type="invoice"
          onComplete={handleParsedResult}
          onCancel={onSwitchToManual}
        />
      )}
      
      {state === 'review' && parseResult && (
        <LLMResults 
          result={parseResult}
          type="invoice"
        />
      )}
    </div>
  )
} 