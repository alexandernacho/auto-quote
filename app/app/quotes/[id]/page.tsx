/**
 * @file Individual quote page
 * @description
 * Displays detailed information about a single quote, including
 * quote details, line items, and actions like editing, downloading,
 * and changing status.
 * 
 * Key features:
 * - Detailed quote information display
 * - Quote line items table
 * - Status management
 * - Download PDF option
 * - Edit and delete capabilities
 * 
 * @dependencies
 * - getQuoteByIdAction: For fetching the quote data
 * - getQuoteItemsByQuoteIdAction: For fetching quote items
 * - auth: For retrieving the authenticated user
 * - verifyQuoteOwnerAction: For security checks
 * 
 * @notes
 * - Server component for initial data loading
 * - Uses client components for interactive elements
 */

"use server"

import { 
  getQuoteByIdAction, 
  getQuoteItemsByQuoteIdAction,
  verifyQuoteOwnerAction
} from "@/actions/db/quotes-actions"
import { getClientByIdAction } from "@/actions/db/clients-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/llm/utils"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { QuoteStatusBadge } from "../_components/quote-status-badge"
import { QuoteActions } from "../_components/quote-actions"

/**
 * Individual Quote Page
 * 
 * Displays detailed information about a single quote
 * 
 * @param params - Contains the quote ID from the URL
 * @returns JSX component for the individual quote page
 */
export default async function QuotePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Get authenticated user ID
  const { userId } = await auth()

  // Redirect to login if not authenticated
  if (!userId) {
    return redirect("/login")
  }

  // Get the quote ID from the URL params
  const { id } = await params

  // Verify the user owns this quote
  const ownershipResult = await verifyQuoteOwnerAction(id, userId)
  if (!ownershipResult.isSuccess || !ownershipResult.data) {
    return notFound()
  }

  // Fetch the quote data
  const quoteResult = await getQuoteByIdAction(id)
  if (!quoteResult.isSuccess) {
    return notFound()
  }
  const quote = quoteResult.data

  // Fetch the quote items
  const itemsResult = await getQuoteItemsByQuoteIdAction(id)
  const items = itemsResult.isSuccess ? itemsResult.data : []

  // Fetch client data if clientId exists
  let clientName = "No client specified"
  if (quote.clientId) {
    const clientResult = await getClientByIdAction(quote.clientId)
    if (clientResult.isSuccess) {
      clientName = clientResult.data.name
    }
  }

  // Format dates for display
  const issueDate = new Date(quote.issueDate).toLocaleDateString()
  const validUntil = new Date(quote.validUntil).toLocaleDateString()

  return (
    <div className="space-y-6">
      {/* Back button and page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link 
            href="/app/quotes" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Quotes
          </Link>
        </div>
        
        {/* Quote actions */}
        <QuoteActions quote={quote} />
      </div>

      {/* Quote header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            Quote {quote.quoteNumber}
            <QuoteStatusBadge status={quote.status} className="ml-3" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Issued on {issueDate} • Valid until {validUntil}
          </p>
        </div>
      </div>

      {/* Quote details */}
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

        {/* Quote summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quote Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(quote.taxAmount)}</span>
            </div>
            {parseFloat(quote.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatCurrency(quote.discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="text-lg">{formatCurrency(quote.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quote Items</CardTitle>
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
                      No items found for this quote
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
      {(quote.notes || quote.termsAndConditions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
          
          {quote.termsAndConditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{quote.termsAndConditions}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
} 