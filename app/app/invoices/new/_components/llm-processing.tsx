/**
 * @file LLM Processing component for invoice creation
 * @description 
 * This component handles the processing of text with LLM, transforming
 * unstructured input into structured data for invoices. It's placed in
 * the invoice creation workflow.
 * 
 * Key features:
 * - Step-by-step workflow for LLM processing
 * - Handles interactive clarification steps if needed
 * - Displays matched clients and products with confidence indicators
 * - Provides editing capabilities for LLM-generated data
 * 
 * @dependencies
 * - LLMInputForm: For text input
 * - LLMResults: For displaying parsed results
 * - useLLMProcessing: Hook for managing LLM processing state
 * - various UI components for display and interaction
 * 
 * @notes
 * - This is a client component that orchestrates the LLM processing flow
 * - Uses step-based UI to guide users through the process
 * - Handles both success and error cases
 */

"use client"

import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/lib/hooks/use-toast"
import { useLLMProcessing } from "@/lib/hooks/use-llm-processing"
import { LLMParseResult } from "@/types"
import { AlertCircle, Check, Edit, HelpCircle, Loader2, RotateCcw } from "lucide-react"
import { useState } from "react"
import { LLMInputForm } from "./llm-input-form"
import { LLMResults } from "./llm-results"

/**
 * Props for LLMProcessing component
 */
interface LLMProcessingProps {
  userId: string
  type: 'invoice' | 'quote'
  onComplete: (result: LLMParseResult) => void
  onCancel: () => void
}

/**
 * Component for processing text with LLM in a multi-step workflow
 * 
 * @param userId - The user ID for context in LLM processing
 * @param type - The type of document to generate ('invoice' or 'quote')
 * @param onComplete - Callback function when processing is complete
 * @param onCancel - Callback function to cancel processing
 * @returns JSX element with LLM processing workflow
 */
export function LLMProcessing({
  userId,
  type,
  onComplete,
  onCancel
}: LLMProcessingProps) {
  // Get LLM processing state from custom hook
  const {
    state,
    parseResult,
    clarificationAnswers,
    handleParsedResult,
    handleClarificationChange,
    handleClarificationSubmit,
    handleEditResult,
    handleReset
  } = useLLMProcessing()
  
  const { toast } = useToast()
  
  /**
   * Handle final completion of LLM processing
   */
  const handleCompleteProcess = () => {
    if (!parseResult) {
      toast({
        title: "Error",
        description: "No result available to complete",
        variant: "destructive"
      })
      return
    }
    
    onComplete(parseResult)
  }
  
  // Render different content based on current state
  return (
    <div className="space-y-6">
      {/* Input Step */}
      {state === 'input' && (
        <LLMInputForm 
          type={type} 
          userId={userId} 
          onParsedResult={handleParsedResult} 
        />
      )}
      
      {/* Clarification Step - shown if LLM needs more information */}
      {state === 'clarification' && parseResult?.needsClarification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5 text-amber-500" />
              We Need More Information
            </CardTitle>
            <CardDescription>
              Please answer these questions to help us generate your {type} accurately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {parseResult.clarificationQuestions?.map((question: string, index: number) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium">
                  {question}
                </label>
                <Input
                  value={clarificationAnswers[index] || ''}
                  onChange={(e) => handleClarificationChange(index, e.target.value)}
                  placeholder="Your answer"
                />
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
            <Button 
              onClick={handleClarificationSubmit}
              disabled={!parseResult.clarificationQuestions?.every((_: string, i: number) => !!clarificationAnswers[i])}
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Review Step - show parsed results for review */}
      {state === 'review' && parseResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  AI-Generated {type === 'invoice' ? 'Invoice' : 'Quote'}
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1" 
                        onClick={() => handleEditResult()}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Edit AI-generated content</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription>
                Review the AI-generated {type} details before continuing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LLMResults result={parseResult} type={type} />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
              <Button onClick={handleCompleteProcess}>
                Continue to {type === 'invoice' ? 'Invoice' : 'Quote'} Creation
              </Button>
            </CardFooter>
          </Card>
          
          {/* Original text reminder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Original Text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {parseResult.rawText}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Error State */}
      {state === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error Processing Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>We encountered an error while processing your text. Please try again or use the manual form.</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Use Manual Form
            </Button>
            <Button onClick={handleReset}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}