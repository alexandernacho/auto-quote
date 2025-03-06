/**
 * @file Client detail page
 * @description 
 * Displays detailed information about a specific client including
 * contact details and associated invoices and quotes.
 * 
 * Key features:
 * - Shows client's full contact information
 * - Lists associated invoices and quotes
 * - Provides options to edit client or create new documents
 * - Implements tabbed interface for invoices/quotes
 * 
 * @dependencies
 * - getClientByIdAction: For fetching the specific client
 * - getInvoicesByClientIdAction: For fetching client's invoices
 * - getQuotesByClientIdAction: For fetching client's quotes
 * - auth: For retrieving the authenticated user
 * 
 * @notes
 * - Server component for data loading
 * - Uses suspense for asynchronous data fetching
 * - Uses tabs component for organizing content
 */

"use server"

import { getClientByIdAction } from "@/actions/db/clients-actions"
import { getInvoicesByClientIdAction } from "@/actions/db/invoices-actions"
import { getQuotesByClientIdAction } from "@/actions/db/quotes-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SelectInvoice, SelectQuote } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft, FileText, Pencil, Receipt } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

/**
 * Client detail page component
 * 
 * @param params Object containing the client ID from the URL
 * @returns JSX component for the client detail page
 */
export default async function ClientDetailPage({
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
  
  // Await params to get the client ID
  const { id } = await params
  
  // Fetch client data
  const clientResult = await getClientByIdAction(id)
  
  // Redirect if client not found or doesn't belong to user
  if (!clientResult.isSuccess || !clientResult.data || clientResult.data.userId !== userId) {
    return redirect("/app/clients")
  }
  
  const client = clientResult.data
  
  return (
    <div className="space-y-6">
      {/* Page header with back link and edit button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link 
            href="/app/clients"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
        </div>
        
        <Button asChild variant="outline">
          <Link href={`/app/clients/${client.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Client
          </Link>
        </Button>
      </div>
      
      {/* Client name */}
      <h1 className="text-3xl font-bold">{client.name}</h1>
      
      {/* Client details card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <ClientInfoItem label="Email" value={client.email || "Not provided"} />
            <ClientInfoItem label="Phone" value={client.phone || "Not provided"} />
            <ClientInfoItem label="Address" value={client.address || "Not provided"} />
            <ClientInfoItem label="Tax Number" value={client.taxNumber || "Not provided"} />
            {client.notes && (
              <div className="md:col-span-2">
                <ClientInfoItem label="Notes" value={client.notes} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* New document buttons */}
      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-blue-500 hover:bg-blue-600">
          <Link href={`/app/invoices/new?clientId=${client.id}`}>
            <Receipt className="mr-2 h-4 w-4" />
            Create Invoice
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/app/quotes/new?clientId=${client.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            Create Quote
          </Link>
        </Button>
      </div>
      
      {/* Tabs for invoices and quotes */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices" className="mt-4">
          <Suspense fallback={<DocumentsSkeleton />}>
            <InvoicesTab clientId={client.id} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="quotes" className="mt-4">
          <Suspense fallback={<DocumentsSkeleton />}>
            <QuotesTab clientId={client.id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Client information item component
 */
function ClientInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
      <p className="break-words">{value}</p>
    </div>
  )
}

/**
 * Invoices tab content component
 * Fetches and displays client's invoices
 */
async function InvoicesTab({ clientId }: { clientId: string }) {
  const invoicesResult = await getInvoicesByClientIdAction(clientId)
  const invoices = invoicesResult.isSuccess ? invoicesResult.data : []
  
  return (
    <div>
      {invoices.length === 0 ? (
        <EmptyDocumentsState 
          type="invoice" 
          clientId={clientId} 
        />
      ) : (
        <div className="space-y-4">
          {invoices.map(invoice => (
            <DocumentItem 
              key={invoice.id}
              document={invoice}
              type="invoice"
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Quotes tab content component
 * Fetches and displays client's quotes
 */
async function QuotesTab({ clientId }: { clientId: string }) {
  const quotesResult = await getQuotesByClientIdAction(clientId)
  const quotes = quotesResult.isSuccess ? quotesResult.data : []
  
  return (
    <div>
      {quotes.length === 0 ? (
        <EmptyDocumentsState 
          type="quote" 
          clientId={clientId} 
        />
      ) : (
        <div className="space-y-4">
          {quotes.map(quote => (
            <DocumentItem 
              key={quote.id}
              document={quote}
              type="quote"
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Document item component for invoices and quotes
 */
function DocumentItem({ 
  document, 
  type 
}: { 
  document: SelectInvoice | SelectQuote; 
  type: 'invoice' | 'quote'
}) {
  const isInvoice = type === 'invoice'
  const number = isInvoice 
    ? (document as SelectInvoice).invoiceNumber 
    : (document as SelectQuote).quoteNumber
  
  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString()
  }
  
  // Format currency
  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value) || 0
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numValue)
  }
  
  // Define status badge colors based on status
  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    expired: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    canceled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
  
  const statusStyle = statusStyles[document.status] || statusStyles.draft
  
  return (
    <Link href={`/app/${type}s/${document.id}`} className="block">
      <div className="flex flex-col justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{number}</p>
            <span className={`rounded-full px-2 py-1 text-xs ${statusStyle}`}>
              {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Issued: {formatDate(document.issueDate)} | 
            {isInvoice 
              ? ` Due: ${formatDate((document as SelectInvoice).dueDate)}`
              : ` Valid until: ${formatDate((document as SelectQuote).validUntil)}`
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium">{formatCurrency(document.total)}</span>
          <ArrowLeft className="h-4 w-4 rotate-180" />
        </div>
      </div>
    </Link>
  )
}

/**
 * Empty state component when no documents are found
 */
function EmptyDocumentsState({ 
  type, 
  clientId 
}: { 
  type: 'invoice' | 'quote'; 
  clientId: string 
}) {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center">
      <h3 className="text-lg font-semibold">No {type}s yet</h3>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">
        Create your first {type} for this client.
      </p>
      <Button asChild>
        <Link href={`/app/${type}s/new?clientId=${clientId}`}>
          <Plus className="mr-2 h-4 w-4" />
          Create {type.charAt(0).toUpperCase() + type.slice(1)}
        </Link>
      </Button>
    </Card>
  )
}

/**
 * Loading skeleton component for documents list
 */
function DocumentsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Plus icon component for empty states
 */
function Plus({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}