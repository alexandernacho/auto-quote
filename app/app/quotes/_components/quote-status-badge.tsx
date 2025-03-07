/**

@file Quote status badge component
@description
This component displays a colored badge representing the status of a quote.
It provides visual differentiation between different quote statuses.

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




Accepted: Green




Rejected: Red




Expired: Amber
*/



"use client"
import { Badge } from "@/components/ui/badge"
/**

Props for the QuoteStatusBadge component
*/
interface QuoteStatusBadgeProps {
status: string
className?: string
}

/**

Component for displaying quote status as a colored badge

@param status - The quote status to display
@param className - Optional additional CSS classes
@returns JSX element with appropriately styled status badge
*/
export function QuoteStatusBadge({
status,
className
}: QuoteStatusBadgeProps) {
/*

Get appropriate CSS classes based on status
@returns CSS class string for the status
*/
const getStatusStyles = () => {
switch (status) {
case 'draft':
return "bg-gray-200 text-gray-800"
case 'sent':
return "bg-blue-100 text-blue-800"
case 'accepted':
return "bg-green-100 text-green-800"
case 'rejected':
return "bg-red-100 text-red-800"
case 'expired':
return "bg-amber-100 text-amber-800"
default:
return "bg-gray-100 text-gray-800"
}
}



// Capitalize the first letter of status for display
const displayStatus = status.charAt(0).toUpperCase() + status.slice(1)
return (
<Badge className={`${getStatusStyles()} ${className || ""}`}>
{displayStatus}
</Badge>
)
}