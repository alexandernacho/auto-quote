/**

@file Quote actions component
@description
This component provides action buttons for quote operations like
downloading, duplicating, deleting, and changing status.

Key features:


Status-aware action buttons




Confirmation dialogs for destructive actions




Download functionality




Status update capabilities



@dependencies


ShadCN UI: For button, dropdown, and dialog components




deleteQuoteAction: For quote deletion




updateQuoteStatusAction: For updating quote status




generateDocumentAction: For document generation



@notes


Client-side component to allow for interactive features




Handles confirmation for destructive actions




Provides appropriate feedback for actions
*/



"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { SelectQuote } from "@/db/schema"
import { deleteQuoteAction, updateQuoteStatusAction } from "@/actions/db/quotes-actions"
import { generateDocumentAction } from "@/actions/document-actions"
import {
CheckCircle, Copy, Download, MoreVertical,
Send, Trash, Ban, AlertTriangle, Edit
} from "lucide-react"
import Link from "next/link"
/**

Props for the QuoteActions component
*/
interface QuoteActionsProps {
quote: SelectQuote
variant?: "dropdown" | "buttons"
}

/**

Component for quote actions (view, edit, delete, etc.)
Can be displayed as a dropdown or as buttons
*/
export function QuoteActions({
quote,
variant = "dropdown"
}: QuoteActionsProps) {
const router = useRouter()
const { toast } = useToast()
const [isDeleting, setIsDeleting] = useState(false)
const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

/**

Handle quote deletion
*/
const handleDelete = async () => {
setIsDeleting(true)
try {
const result = await deleteQuoteAction(quote.id)
if (result.isSuccess) {
toast({
title: "Success",
description: "Quote deleted successfully"
})
// Navigate back to quotes list
router.push("/app/quotes")
router.refresh()
} else {
toast({
title: "Error",
description: result.message,
variant: "destructive"
})
}
} catch (error) {
console.error("Error deleting quote:", error)
toast({
title: "Error",
description: "Failed to delete quote",
variant: "destructive"
})
} finally {
setIsDeleting(false)
}
}

/**

Handle quote status update
*/
const handleUpdateStatus = async (newStatus: string) => {
setIsUpdatingStatus(true)
try {
const result = await updateQuoteStatusAction(quote.id, newStatus as any)
if (result.isSuccess) {
toast({
title: "Success",
description: `Quote marked as ${newStatus}`
})
router.refresh()
} else {
toast({
title: "Error",
description: result.message,
variant: "destructive"
})
}
} catch (error) {
console.error("Error updating quote status:", error)
toast({
title: "Error",
description: "Failed to update quote status",
variant: "destructive"
})
} finally {
setIsUpdatingStatus(false)
}
}

/**
 * Handle document download
 */
const handleDownload = async (format: 'pdf' | 'docx') => {
  try {
    const result = await generateDocumentAction('quote', quote.id, format)
    
    if (result.isSuccess && result.data.url) {
      // Open the URL in a new tab
      window.open(result.data.url, '_blank')
      
      toast({
        title: `${format.toUpperCase()} Generated`,
        description: `Your quote ${format.toUpperCase()} has been generated and is ready to download.`
      })
    } else {
      throw new Error(result.message || `Failed to generate ${format.toUpperCase()}`)
    }
  } catch (error) {
    console.error(`Error generating ${format.toUpperCase()}:`, error)
    toast({
      title: "Error",
      description: `Failed to generate ${format.toUpperCase()}. Please try again.`,
      variant: "destructive"
    })
  }
}

/**
 * Render dropdown menu for quote actions
 */
const renderDropdown = () => (
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon">
<MoreVertical className="h-4 w-4" />
<span className="sr-only">Actions</span>
</Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end">
{/* Edit action */}
<DropdownMenuItem asChild>
<Link href={`/app/quotes/${quote.id}/edit`}>
<Edit className="mr-2 h-4 w-4" />
Edit Quote
</Link>
</DropdownMenuItem>
{/* Download options */}
<DropdownMenuItem onSelect={(e) => {
e.preventDefault()
handleDownload('pdf')
}}>
<Download className="mr-2 h-4 w-4" />
Download PDF
</DropdownMenuItem>
<DropdownMenuItem onSelect={(e) => {
e.preventDefault()
handleDownload('docx')
}}>
<Download className="mr-2 h-4 w-4" />
Download DOCX
</DropdownMenuItem>
{/* Duplicate action */}
<DropdownMenuItem asChild>
<Link href={`/app/quotes/duplicate/${quote.id}`}>
<Copy className="mr-2 h-4 w-4" />
Duplicate
</Link>
</DropdownMenuItem>
{/* Status update options based on current status */}
{quote.status === 'draft' && (
<DropdownMenuItem
onSelect={(e) => {
e.preventDefault()
handleUpdateStatus('sent')
}}
disabled={isUpdatingStatus}
>
<Send className="mr-2 h-4 w-4" />
Mark as Sent
</DropdownMenuItem>
)}
{quote.status === 'sent' && (
<DropdownMenuItem
onSelect={(e) => {
e.preventDefault()
handleUpdateStatus('accepted')
}}
disabled={isUpdatingStatus}
>
<CheckCircle className="mr-2 h-4 w-4" />
Mark as Accepted
</DropdownMenuItem>
)}
{quote.status === 'sent' && (
<DropdownMenuItem
onSelect={(e) => {
e.preventDefault()
handleUpdateStatus('rejected')
}}
disabled={isUpdatingStatus}
>
<Ban className="mr-2 h-4 w-4" />
Mark as Rejected
</DropdownMenuItem>
)}
{quote.status === 'sent' && (
<DropdownMenuItem
onSelect={(e) => {
e.preventDefault()
handleUpdateStatus('expired')
}}
disabled={isUpdatingStatus}
>
<AlertTriangle className="mr-2 h-4 w-4" />
Mark as Expired
</DropdownMenuItem>
)}
{/* Delete action with confirmation */}
<AlertDialog>
<AlertDialogTrigger asChild>
<DropdownMenuItem
onSelect={(e) => e.preventDefault()}
className="text-destructive focus:text-destructive"
>
<Trash className="mr-2 h-4 w-4" />
Delete Quote
</DropdownMenuItem>
</AlertDialogTrigger>
<AlertDialogContent>
<AlertDialogHeader>
<AlertDialogTitle>Are you sure?</AlertDialogTitle>
<AlertDialogDescription>
This action cannot be undone. This will permanently delete the quote
and remove it from our servers.
</AlertDialogDescription>
</AlertDialogHeader>
<AlertDialogFooter>
<AlertDialogCancel>Cancel</AlertDialogCancel>
<AlertDialogAction
        onClick={handleDelete}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
{isDeleting ? "Deleting..." : "Delete"}
</AlertDialogAction>
</AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>
</DropdownMenuContent>
</DropdownMenu>
)

/**
 * Render buttons for quote actions
 */
const renderButtons = () => (
<div className="flex flex-wrap gap-2">
{/* Edit button */}
<Button variant="outline" asChild>
   <Link href={`/app/quotes/${quote.id}/edit`}>
     Edit
   </Link>
 </Button>
 {/* Download button */}
 <Button
   variant="outline"
   onClick={() => handleDownload('pdf')}
 >
   <Download className="mr-2 h-4 w-4" />
   Download
 </Button>
 {/* Status update buttons based on current status */}
 {quote.status === 'draft' && (
   <Button
     onClick={() => handleUpdateStatus('sent')}
     disabled={isUpdatingStatus}
     className="bg-blue-500 hover:bg-blue-600"
   >
     <Send className="mr-2 h-4 w-4" />
     Mark as Sent
   </Button>
 )}
 {quote.status === 'sent' && (
   <Button
     onClick={() => handleUpdateStatus('accepted')}
     disabled={isUpdatingStatus}
     className="bg-green-500 hover:bg-green-600"
   >
     <CheckCircle className="mr-2 h-4 w-4" />
     Mark as Accepted
   </Button>
 )}
 {/* Delete button with confirmation */}
 <AlertDialog>
   <AlertDialogTrigger asChild>
     <Button variant="destructive">
       <Trash className="mr-2 h-4 w-4" />
       Delete
     </Button>
   </AlertDialogTrigger>
   <AlertDialogContent>
     <AlertDialogHeader>
       <AlertDialogTitle>Are you sure?</AlertDialogTitle>
       <AlertDialogDescription>
         This action cannot be undone. This will permanently delete the quote
         and remove it from our servers.
       </AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter>
       <AlertDialogCancel>Cancel</AlertDialogCancel>
       <AlertDialogAction
         onClick={handleDelete}
         className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
       >
         {isDeleting ? "Deleting..." : "Delete"}
       </AlertDialogAction>
     </AlertDialogFooter>
   </AlertDialogContent>
 </AlertDialog>
</div>
)
// Return the appropriate variant
return variant === "dropdown" ? renderDropdown() : renderButtons()
}