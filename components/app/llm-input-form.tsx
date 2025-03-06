/**
 * @file LLM Input Form component
 * @description 
 * This component provides a text input area for users to input unstructured text
 * to be processed by an LLM for invoice or quote generation.
 * 
 * Key features:
 * - Large text area for free-form input
 * - Processing state handling with loading indicator
 * - Example placeholder text to guide users
 * - Clear button to reset input
 * - Error handling with toast notifications
 * 
 * @dependencies
 * - parseLLMTextAction: Server action to process text with LLM
 * - Toast: For showing success/error messages
 * - Button, Card, Textarea: UI components
 * 
 * @notes
 * - This is a client component that submits data to a server action
 * - Shows loading state while processing text
 * - Handles both success and error states
 */

"use client"

import { parseLLMTextAction } from "@/actions/llm-actions"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/hooks/use-toast"
import { LLMParseResult } from "@/types"
import { Loader2 } from "lucide-react"
import { useState } from "react"

/**
 * Props for LLMInputForm component
 */
interface LLMInputFormProps {
  type: 'invoice' | 'quote'
  userId: string
  onParsedResult: (result: LLMParseResult) => void
}

/**
 * Form component for inputting unstructured text to be processed by LLM
 * 
 * @param type - The type of document to generate ('invoice' or 'quote')
 * @param userId - The user ID for context in LLM processing
 * @param onParsedResult - Callback function when text is successfully parsed
 * @returns JSX element with text input form
 */
export function LLMInputForm({ 
  type, 
  userId, 
  onParsedResult 
}: LLMInputFormProps) {
  // Component state
  const [text, setText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  
  /**
   * Handle form submission to process text with LLM
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input
    if (!text.trim()) {
      toast({
        title: "Empty input",
        description: "Please enter text to process",
        variant: "destructive"
      })
      return
    }
    
    // Begin processing
    setIsProcessing(true)
    
    try {
      // Call the server action to parse text
      const result = await parseLLMTextAction(text, userId, type)
      
      if (result.isSuccess) {
        // Pass result to parent component
        onParsedResult(result.data)
        
        // Show success message
        toast({
          title: "Success!",
          description: "Successfully processed your text"
        })
      } else {
        // Show error message
        toast({
          title: "Error processing text",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error processing text:", error)
      
      // Show generic error message
      toast({
        title: "Unexpected error",
        description: "Failed to process your text. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  /**
   * Clear the input text
   */
  const handleClear = () => {
    setText("")
  }
  
  // Get placeholder text based on document type
  const placeholderText = type === 'invoice'
    ? "Example: Create an invoice for John Doe for 5 hours of web development at $100/hour, plus $50 for hosting fees. Include 8% tax."
    : "Example: Create a quote for ABC Company for website redesign including 10 pages at $200 per page and SEO setup for $500. The quote should be valid for 30 days."
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create {type === 'invoice' ? 'an Invoice' : 'a Quote'} with AI</CardTitle>
        <CardDescription>
          Describe your {type} in plain language and our AI will help you create it.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholderText}
            className="h-40 resize-none"
            disabled={isProcessing}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleClear} 
            disabled={isProcessing || !text}
          >
            Clear
          </Button>
          <Button 
            type="submit" 
            disabled={isProcessing || !text}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Process with AI"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}