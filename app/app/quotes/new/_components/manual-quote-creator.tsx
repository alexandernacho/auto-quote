"use client"

import QuoteForm from "../../_components/quote-form"

interface ManualQuoteCreatorProps {
  userId: string
  initialClient: any
  initialTemplate: any
}

/**
 * Manual quote creation component
 * Uses the existing QuoteForm component
 */
export function ManualQuoteCreator({
  userId,
  initialClient,
  initialTemplate
}: ManualQuoteCreatorProps) {
  return (
    <QuoteForm 
      userId={userId} 
      initialClient={initialClient}
      initialTemplate={initialTemplate}
    />
  )
} 