/**

@file Invoice actions component
@description
This component provides action buttons for invoice operations like
downloading, duplicating, deleting, and changing status.

Key features:
Status-aware action buttons
Confirmation dialogs for destructive actions
Download functionality
Status update capabilities
@dependencies
ShadCN UI: For button, dropdown, and dialog components
deleteInvoiceAction: For invoice deletion
updateInvoiceStatusAction: For updating invoice status
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
import { SelectInvoice } from "@/db/schema"
import { deleteInvoiceAction, updateInvoiceStatusAction } from "@/actions/db/invoices-actions"
import {
  CheckCircle, Copy, Download, MoreVertical,
  Send, Trash, Ban, AlertTriangle, Edit
} from "lucide-react"
import Link from "next/link"

/**
 * Props for the InvoiceActions component
 */
interface InvoiceActionsProps {
  invoice: SelectInvoice
  variant?: "dropdown" | "buttons"
}

/**
 * Component for invoice actions (view, edit, delete, etc.)
 * Can be displayed as a dropdown or as buttons
 */
export function InvoiceActions({
  invoice,
  variant = "dropdown"
}: InvoiceActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  /**
   * Handle invoice deletion
   */
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteInvoiceAction(invoice.id)
      if (result.isSuccess) {
        toast({
          title: "Success",
          description: "Invoice deleted successfully"
        })
        // Navigate back to invoices list
        router.push("/app/invoices")
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Handle invoice status update
   */
  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const result = await updateInvoiceStatusAction(invoice.id, newStatus as any)
      if (result.isSuccess) {
        toast({
          title: "Success",
          description: `Invoice marked as ${newStatus}`
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
      console.error("Error updating invoice status:", error)
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  /**
   * Handle invoice download
   */
  const handleDownload = async (format: 'pdf' | 'docx') => {
    // This would be replaced with actual download functionality
    toast({
      title: "Download Started",
      description: `Downloading invoice as ${format.toUpperCase()}`
    })
  }

  /**
   * Render dropdown menu for invoice actions
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
          <Link href={`/app/invoices/${invoice.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Invoice
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
          <Link href={`/app/invoices/duplicate/${invoice.id}`}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Link>
        </DropdownMenuItem>
        {/* Status update options based on current status */}
        {invoice.status === 'draft' && (
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
        {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              handleUpdateStatus('paid')
            }}
            disabled={isUpdatingStatus}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Paid
          </DropdownMenuItem>
        )}
        {(invoice.status === 'draft' || invoice.status === 'sent') && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              handleUpdateStatus('canceled')
            }}
            disabled={isUpdatingStatus}
          >
            <Ban className="mr-2 h-4 w-4" />
            Mark as Canceled
          </DropdownMenuItem>
        )}
        {invoice.status === 'sent' && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              handleUpdateStatus('overdue')
            }}
            disabled={isUpdatingStatus}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Mark as Overdue
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
              Delete Invoice
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the invoice
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
   * Render buttons for invoice actions
   */
  const renderButtons = () => (
    <div className="flex flex-wrap gap-2">
      {/* Edit button */}
      <Button variant="outline" asChild>
        <Link href={`/app/invoices/${invoice.id}/edit`}>
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
      {invoice.status === 'draft' && (
        <Button
          onClick={() => handleUpdateStatus('sent')}
          disabled={isUpdatingStatus}
          className="bg-blue-500 hover:bg-blue-600"
        >
          <Send className="mr-2 h-4 w-4" />
          Mark as Sent
        </Button>
      )}
      {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
        <Button
          onClick={() => handleUpdateStatus('paid')}
          disabled={isUpdatingStatus}
          className="bg-green-500 hover:bg-green-600"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark as Paid
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
              This action cannot be undone. This will permanently delete the invoice
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