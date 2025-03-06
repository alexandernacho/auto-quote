// app/app/llm-test/page.tsx
"use client"

import { parseLLMTextAction } from "@/actions/llm-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/hooks/use-toast"
import { useUser } from "@clerk/nextjs"
import { useState } from "react"

export default function LLMTestPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [text, setText] = useState("")
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !text) return
    
    setIsLoading(true)
    
    try {
      // Test with invoice type
      const response = await parseLLMTextAction(text, user.id, "invoice")
      
      if (response.isSuccess) {
        setResult(response.data)
        toast({
          title: "Success",
          description: "Text processed successfully",
        })
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process text",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">LLM Test</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="Enter some text about an invoice, e.g.: Create an invoice for John Doe for 5 hours of web development at $100/hour, plus $50 for hosting fees."
          className="min-h-[200px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Process Text"}
        </Button>
      </form>
      
      {result && (
        <Card className="mt-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Results:</h2>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}