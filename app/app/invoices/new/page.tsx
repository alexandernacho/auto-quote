/**
 * @file New invoice page with LLM integration
 * @description 
 * Provides both manual and AI-assisted invoice creation.
 * Users can either enter an unstructured text description that will be parsed by LLM
 * or manually fill out invoice details.
 * 
 * Key features:
 * - LLM text input for AI-assisted invoice creation
 * - LLM text parsing and extraction
 * - Pre-fill form with extracted data
 * - Client selection from existing clients
 * - Invoice details input
 * 
 * @dependencies
 * - parseLLMTextAction: For processing unstructured text
 * - getClientByIdAction: For fetching client by ID from query params
 * - getDefaultTemplateAction: For getting default invoice template
 * - LLMInputForm: Component for LLM text input
 * - auth: For retrieving the authenticated user
 * 
 * @notes
 * - Server component for initial setup and data loading
 * - Uses client components for interactive form elements
 * - Supports client ID from query parameter for pre-selection
 */

"use server"

import { getClientByIdAction } from "@/actions/db/clients-actions"
import { getDefaultTemplateAction } from "@/actions/db/templates-actions"
import { LLMInputForm } from "@/components/app/llm-input-form"
import { LLMProcessing } from "@/components/app/llm-processing"
import { LLMResults } from "@/components/app/llm-results"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft, BrainCircuit, FormInput } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AIInvoiceCreator as AIInvoiceCreatorClient } from "./_components/ai-invoice-creator"
import { AIInvoiceWrapper } from "./_components/ai-invoice-wrapper"
import { ManualInvoiceCreator } from "./_components/manual-invoice-creator"

/**
 * New invoice page component with LLM integration
 * 
 * @param searchParams Object containing query parameters, possibly including clientId
 * @returns JSX component for the new invoice page
 */
export default async function NewInvoicePage({
  searchParams
}: {
  searchParams: { clientId?: string }
}) {
  // Get authenticated user
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/sign-in")
  }
  
  // Initialize client and template
  let initialClient = null
  let initialTemplate = null
  
  // Get default template
  const templateResult = await getDefaultTemplateAction(userId, "invoice")
  if (templateResult.isSuccess) {
    initialTemplate = templateResult.data
  }
  
  // If clientId is provided in query params, fetch client data
  const clientId = searchParams.clientId
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
          href="/app/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Link>
      </div>
      
      {/* Page title and description */}
      <div>
        <h1 className="text-3xl font-bold">Create New Invoice</h1>
        <p className="text-muted-foreground">
          Create an invoice using AI assistance or manual entry.
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
        
        {/* AI-assisted invoice creation */}
        <TabsContent value="ai" className="mt-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Describe your invoice in plain text and our AI will help you create it.
            Include details about the client, services, prices, and any other relevant information.
          </p>
          
          <AIInvoiceCreator
            userId={userId}
            initialClient={initialClient}
            initialTemplate={initialTemplate}
          />
        </TabsContent>
        
        {/* Manual invoice creation */}
        <TabsContent value="manual" className="mt-6">
          <Card className="p-6">
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Fill out the invoice details manually.
            </p>
            
            <ManualInvoiceCreator
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
 * AI-assisted invoice creation component
 * Implements multi-step flow for LLM processing
 */
function AIInvoiceCreator({ 
  userId, 
  initialClient,
  initialTemplate
}: { 
  userId: string;
  initialClient: any;
  initialTemplate: any;
}) {
  return (
    <AIInvoiceWrapper
      userId={userId}
      initialClient={initialClient}
      initialTemplate={initialTemplate}
      ManualInvoiceCreator={ManualInvoiceCreator}
    />
  )
}