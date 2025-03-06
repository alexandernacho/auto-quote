/**
 * @file Manual Invoice Creator client component
 * @description 
 * Client component for manual invoice creation.
 */

"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

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
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <p className="text-center">
        Use the form below to create an invoice manually.
      </p>
      
      <Button asChild className="bg-blue-500 hover:bg-blue-600">
        <Link href="/app/invoices/manual-entry">
          Open Invoice Form
        </Link>
      </Button>
      
      <p className="text-xs text-muted-foreground">
        The manual form will include client selection, invoice details, and item entry.
      </p>
    </div>
  )
} 