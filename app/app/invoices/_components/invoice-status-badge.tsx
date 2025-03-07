/**
@file Invoice status badge component
@description
This component displays a colored badge representing the status of an invoice.
It provides visual differentiation between different invoice statuses.

Key features:


Color-coded badges for different statuses




Consistent styling across the application




Proper capitalization of status text



@dependencies


Badge: UI component from shadcn/ui



@notes


Client-side component for reusability




Status colors follow a consistent pattern:




Draft: Gray




Sent: Blue




Paid: Green




Overdue: Red




Canceled: Gray
*/



"use client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Props for the InvoiceStatusBadge component
 */
interface InvoiceStatusBadgeProps {
  status: string
  className?: string
}

/**
 * Component for displaying invoice status as a colored badge
 *
 * @param status - The invoice status to display
 * @param className - Optional additional CSS classes
 * @returns JSX element with appropriately styled status badge
 */
export function InvoiceStatusBadge({
  status,
  className
}: InvoiceStatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    draft: "bg-gray-200 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    canceled: "bg-gray-100 text-gray-800"
  }

  // Capitalize the first letter of status for display
  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1)
  
  return (
    <Badge className={cn(statusStyles[status] || "", className)}>
      {displayStatus}
    </Badge>
  )
}

export default InvoiceStatusBadge