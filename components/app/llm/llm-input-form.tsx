/**
 * @file LLM Input Form component
 * @description
 * This component provides a text input area for users to input unstructured text
 * to be processed by an LLM. It's used in both invoice and quote creation workflows.
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
  onParsedResult: (result: LLMParseResult, userId: string, type: 'invoice' | 'quote') => void
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

    console.log(`🚀 Starting LLM processing for ${type}:`, text.substring(0, 100) + '...')
    
    // Begin processing
    setIsProcessing(true)

    try {
      // Call the server action to parse text
      console.log('📡 Calling parseLLMTextAction with:', { userId, type, textLength: text.length })
      const result = await parseLLMTextAction(text, userId, type)
      
      console.log('📥 LLM Action Result:', result)
      
      if (result.isSuccess) {
        console.log('✅ LLM processing successful, data:', result.data)
        
        // Pass result to parent component with context
        console.log('🔄 Calling onParsedResult with:', { data: result.data, userId, type })
        onParsedResult(result.data, userId, type)
        
        // Show success message
        toast({
          title: "Success!",
          description: "Successfully processed your text"
        })
      } else {
        console.warn('⚠️ LLM processing failed:', result.message)
        
        // Show error message but still try to use the data if available
        toast({
          title: "Warning",
          description: "Some information may be incomplete. Please review and clarify.",
          variant: "destructive"
        })
        
        // Create a basic fallback response
        const today = new Date().toISOString().split('T')[0]
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 30)
        const thirtyDaysFromNow = futureDate.toISOString().split('T')[0]
        
        // Create a minimal valid response
        const fallbackResponse: LLMParseResult = {
          client: {
            name: "Unknown Client",
            confidence: "low"
          },
          items: [
            {
              description: "Services as described",
              quantity: "1",
              unitPrice: "0",
              subtotal: "0",
              total: "0"
            }
          ],
          document: {
            issueDate: today,
            ...(type === 'invoice' ? { dueDate: thirtyDaysFromNow } : { validUntil: thirtyDaysFromNow }),
            notes: "Generated from incomplete information. Please review and edit."
          },
          needsClarification: true,
          clarificationQuestions: [
            "Could you provide more details about the client?",
            "What specific products or services should be included?",
            "What are the quantities and prices for each item?"
          ],
          rawText: text
        }
        
        console.log('🔄 Using fallback response:', fallbackResponse)
        // Pass the fallback response to parent with context
        onParsedResult(fallbackResponse, userId, type)
      }
    } catch (error) {
      console.error("❌ Error processing text:", error)
      
      // Show generic error message
      toast({
        title: "Unexpected error",
        description: "Failed to process your text. Please try again or provide more details.",
        variant: "destructive"
      })
      
      // Reset processing state
      setIsProcessing(false)
    } finally {
      console.log('🏁 LLM processing finished, resetting state')
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