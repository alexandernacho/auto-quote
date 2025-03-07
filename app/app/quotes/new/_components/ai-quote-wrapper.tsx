"use client"

import { useState } from "react"
import { AIQuoteCreator } from "./ai-quote-creator"

interface AIQuoteWrapperProps {
  userId: string
  initialClient: any
  initialTemplate: any
  ManualQuoteCreator: React.ComponentType<{
    userId: string
    initialClient: any
    initialTemplate: any
  }>
}

/**
 * Client wrapper component for AI quote creation with state management
 */
export function AIQuoteWrapper({
  userId,
  initialClient,
  initialTemplate,
  ManualQuoteCreator
}: AIQuoteWrapperProps) {
  const [showManual, setShowManual] = useState(false)
  
  if (showManual) {
    return (
      <ManualQuoteCreator 
        userId={userId} 
        initialClient={initialClient} 
        initialTemplate={initialTemplate} 
      />
    )
  }
  
  return (
    <AIQuoteCreator
      userId={userId}
      initialClient={initialClient}
      initialTemplate={initialTemplate}
      onSwitchToManual={() => setShowManual(true)}
    />
  )
} 