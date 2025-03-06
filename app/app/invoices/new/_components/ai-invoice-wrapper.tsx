/**
 * @file AI Invoice Wrapper client component
 * @description 
 * Client wrapper component that manages state for AI-assisted invoice creation.
 */

"use client"

import { useState } from "react"
import { AIInvoiceCreator } from "./ai-invoice-creator"

interface AIInvoiceWrapperProps {
  userId: string
  initialClient: any
  initialTemplate: any
  ManualInvoiceCreator: React.ComponentType<{
    userId: string
    initialClient: any
    initialTemplate: any
  }>
}

/**
 * Client wrapper component for AI invoice creation with state management
 */
export function AIInvoiceWrapper({
  userId,
  initialClient,
  initialTemplate,
  ManualInvoiceCreator
}: AIInvoiceWrapperProps) {
  const [showManual, setShowManual] = useState(false)
  
  if (showManual) {
    return (
      <ManualInvoiceCreator 
        userId={userId} 
        initialClient={initialClient} 
        initialTemplate={initialTemplate} 
      />
    )
  }
  
  return (
    <AIInvoiceCreator
      userId={userId}
      initialClient={initialClient}
      initialTemplate={initialTemplate}
      onSwitchToManual={() => setShowManual(true)}
    />
  )
} 