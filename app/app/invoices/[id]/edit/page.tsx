"use server"

import { getInvoiceByIdAction } from "@/actions/db/invoices-actions"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import InvoiceForm from "../../_components/invoice-form"

/**
 * Invoice edit page component
 * 
 * @param params Object containing the invoice ID
 * @returns JSX component for the invoice edit page
 */
export default async function InvoiceEditPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // Get authenticated user
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/login")
  }
  
  // Fetch invoice data
  const { id } = await params
  const invoiceResult = await getInvoiceByIdAction(id)
  
  // If invoice not found or doesn't belong to user, show 404
  if (!invoiceResult.isSuccess || invoiceResult.data.userId !== userId) {
    notFound()
  }
  
  const invoice = invoiceResult.data
  
  return (
    <div className="space-y-6">
      {/* Page header with back link */}
      <div className="flex items-center gap-2">
        <Link 
          href={`/app/invoices/${invoice.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoice
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold">Edit Invoice</h1>
      <p className="text-muted-foreground">
        Update the invoice details below.
      </p>
      
      <InvoiceForm userId={userId} invoice={invoice} />
    </div>
  )
} 