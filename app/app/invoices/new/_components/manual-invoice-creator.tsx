/**
 * @file Manual Invoice Creator client component
 * @description 
 * Client component for manual invoice creation.
 */

"use client"

import InvoiceForm from "../../_components/invoice-form"

interface ManualInvoiceCreatorProps {
  userId: string
  initialClient: any
  initialTemplate: any
}

/**
 * Client component for manual invoice creation
 */
export function ManualInvoiceCreator({
  userId,
  initialClient,
  initialTemplate
}: ManualInvoiceCreatorProps) {
  return (
    <InvoiceForm 
      userId={userId} 
      initialClient={initialClient}
      initialTemplate={initialTemplate}
    />
  )
} 