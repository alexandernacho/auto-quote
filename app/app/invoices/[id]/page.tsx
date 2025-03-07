/**
 * @file Individual invoice page
 * @description
 * Displays detailed information about a single invoice, including
 * invoice details, line items, and actions like editing, downloading,
 * and changing status.
 * 
 * Key features:
 * - Detailed invoice information display
 * - Invoice line items table
 * - Status management
 * - Download PDF option
 * - Edit and delete capabilities
 * 
 * @dependencies
 * - getInvoiceByIdAction: For fetching the invoice data
 * - getInvoiceItemsByInvoiceIdAction: For fetching invoice items
 * - auth: For retrieving the authenticated user
 * - verifyInvoiceOwnerAction: For security checks
 * 
 * @notes
 * - Server component for initial data loading
 * - Uses client components for interactive elements
 */

"use server"

import { 
  getInvoiceByIdAction, 
  getInvoiceItemsByInvoiceIdAction,
  verifyInvoiceOwnerAction
} from "@/actions/db/invoices-actions"
import { getClientByIdAction } from "@/actions/db/clients-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/llm/utils"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft, Download, Edit, Trash } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { InvoiceStatusBadge } from "../_components/invoice-status-badge"
import { InvoiceActions } from "../_components/invoice-actions"

/**
 * Individual Invoice Page
 * 
 * Displays detailed information about a single invoice
 * 
 * @param params - Contains the invoice ID from the URL
 * @returns JSX component for the individual invoice page
 */
export default async function InvoicePage({ params }: { params: { id: string } }) {
  // Get authenticated user ID
  const { userId } = await auth()

  // Redirect to login if not authenticated
  if (!userId) {
    return redirect("/login")
  }

  // Get the invoice ID from the URL params
  const { id } = params

  // Verify the user owns this invoice
  const ownershipResult = await verifyInvoiceOwnerAction(id, userId)
  if (!ownershipResult.isSuccess || !ownershipResult.data) {
    return notFound()
  }

  // Fetch the invoice data
  const invoiceResult = await getInvoiceByIdAction(id)
  if (!invoiceResult.isSuccess) {
    return notFound()
  }
  const invoice = invoiceResult.data

  // Fetch the invoice items
  const itemsResult = await getInvoiceItemsByInvoiceIdAction(id)
  const items = itemsResult.isSuccess ? itemsResult.data : []

  // Fetch client data if clientId exists
  let clientName = "No client specified"
  if (invoice.clientId) {
    const clientResult = await getClientByIdAction(invoice.clientId)
    if (clientResult.isSuccess) {
      clientName = clientResult.data.name
    }
  }

  // Format dates for display
  const issueDate = new Date(invoice.issueDate).toLocaleDateString()
  const dueDate = new Date(invoice.dueDate).toLocaleDateString()

  return (
    <div className="space-y-6">
      {/* Back button and page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link 
            href="/app/invoices" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Invoices
          </Link>
        </div>
        
        {/* Invoice actions */}
        <InvoiceActions invoice={invoice} />
      </div>

      {/* Invoice header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            Invoice {invoice.invoiceNumber}
            <InvoiceStatusBadge status={invoice.status} className="ml-3" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Issued on {issueDate} • Due on {dueDate}
          </p>
        </div>
      </div>

      {/* Invoice details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{clientName}</p>
          </CardContent>
        </Card>

        {/* Invoice summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
            {parseFloat(invoice.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="text-lg">{formatCurrency(invoice.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium">Description</th>
                  <th className="py-3 px-4 text-right font-medium">Quantity</th>
                  <th className="py-3 px-4 text-right font-medium">Unit Price</th>
                  <th className="py-3 px-4 text-right font-medium">Tax</th>
                  <th className="py-3 px-4 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 text-center text-muted-foreground">
                      No items found for this invoice
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-4">{item.description}</td>
                      <td className="py-3 px-4 text-right">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.taxAmount)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes and terms */}
      {(invoice.notes || invoice.termsAndConditions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
          
          {invoice.termsAndConditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{invoice.termsAndConditions}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
} 