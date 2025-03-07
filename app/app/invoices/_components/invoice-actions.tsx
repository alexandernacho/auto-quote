/**
 * @file Invoice actions component
 * @description
 * Provides action buttons for individual invoices, including
 * edit, download PDF, and delete options.
 * 
 * @dependencies
 * - Button: UI component from shadcn
 * - DropdownMenu: UI component from shadcn
 * - SelectInvoice: Type from db schema
 * 
 * @notes
 * - Client component for interactive features
 * - Uses dropdown menu for multiple actions
 */

"use client"

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { SelectInvoice } from "@/db/schema"
import { Download, Edit, MoreHorizontal, Trash } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { generateDocumentAction } from "@/actions/document-actions"
import { toast } from "@/components/ui/use-toast"

interface InvoiceActionsProps {
  invoice: SelectInvoice
}

/**
 * Provides action buttons for an individual invoice
 * 
 * @param invoice - The invoice data
 */
export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Function to handle invoice deletion (placeholder for now)
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // This would be replaced with an actual delete action
      // await deleteInvoiceAction(invoice.id)
      router.push("/app/invoices")
      router.refresh()
    } catch (error) {
      console.error("Error deleting invoice:", error)
      alert("Failed to delete invoice")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle PDF download
  const handleDownloadPdf = async () => {
    setIsLoading(true)
    
    try {
      const result = await generateDocumentAction('invoice', invoice.id, 'pdf')
      
      if (result.isSuccess && result.data.url) {
        // Open the URL in a new tab
        window.open(result.data.url, '_blank')
        
        toast({
          title: "PDF Generated",
          description: "Your invoice PDF has been generated and is ready to download."
        })
      } else {
        throw new Error(result.message || "Failed to generate PDF")
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        disabled={isLoading}
        onClick={handleDownloadPdf}
      >
        <Download className="h-4 w-4 mr-2" />
        Download PDF
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        asChild
        disabled={isLoading}
      >
        <Link href={`/app/invoices/${invoice.id}/edit`}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Link>
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            disabled={isLoading}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={handleDelete}
            className="text-red-600 cursor-pointer"
            disabled={isLoading}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default InvoiceActions