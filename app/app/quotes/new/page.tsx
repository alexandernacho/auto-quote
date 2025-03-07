"use server"

import { getClientByIdAction } from "@/actions/db/clients-actions"
import { getDefaultTemplateAction } from "@/actions/db/templates-actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft, BrainCircuit, FormInput } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AIQuoteWrapper } from "./_components/ai-quote-wrapper"
import { ManualQuoteCreator } from "./_components/manual-quote-creator"

/**
 * New quote page component with LLM integration
 * 
 * @param searchParams Object containing query parameters, possibly including clientId
 * @returns JSX component for the new quote page
 */
export default async function NewQuotePage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  // Get authenticated user
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/login")
  }
  
  // Await searchParams to get the clientId
  const { clientId } = await searchParams
  
  // Initialize client and template
  let initialClient = null
  let initialTemplate = null
  
  // Get default template
  const templateResult = await getDefaultTemplateAction(userId, "quote")
  if (templateResult.isSuccess) {
    initialTemplate = templateResult.data
  }
  
  // If clientId is provided in query params, fetch client data
  if (clientId) {
    const clientResult = await getClientByIdAction(clientId)
    if (clientResult.isSuccess && clientResult.data?.userId === userId) {
      initialClient = clientResult.data
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Page header with back link */}
      <div className="flex items-center gap-2">
        <Link 
          href="/app/quotes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotes
        </Link>
      </div>
      
      {/* Page title and description */}
      <div>
        <h1 className="text-3xl font-bold">Create New Quote</h1>
        <p className="text-muted-foreground">
          Create a quote using AI assistance or manual entry.
        </p>
      </div>
      
      {/* Tabs for AI and manual creation methods */}
      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            <span>AI Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <FormInput className="h-4 w-4" />
            <span>Manual Entry</span>
          </TabsTrigger>
        </TabsList>
        
        {/* AI-assisted quote creation */}
        <TabsContent value="ai" className="mt-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Describe your quote in plain text and our AI will help you create it.
            Include details about the client, services, prices, and any other relevant information.
          </p>
          
          <AIQuoteCreator
            userId={userId}
            initialClient={initialClient}
            initialTemplate={initialTemplate}
          />
        </TabsContent>
        
        {/* Manual quote creation */}
        <TabsContent value="manual" className="mt-6">
          <Card className="p-6">
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Fill out the quote details manually.
            </p>
            
            <ManualQuoteCreator
              userId={userId}
              initialClient={initialClient}
              initialTemplate={initialTemplate}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * AI-assisted quote creation component
 * Implements multi-step flow for LLM processing
 */
function AIQuoteCreator({ 
  userId, 
  initialClient,
  initialTemplate
}: { 
  userId: string;
  initialClient: any;
  initialTemplate: any;
}) {
  return (
    <AIQuoteWrapper
      userId={userId}
      initialClient={initialClient}
      initialTemplate={initialTemplate}
      ManualQuoteCreator={ManualQuoteCreator}
    />
  )
} 