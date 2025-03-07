"use server"

import { getQuoteByIdAction, getQuoteItemsByQuoteIdAction } from "@/actions/db/quotes-actions"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import QuoteForm from "../../_components/quote-form"

/**
 * Quote edit page component
 * 
 * @param params Object containing the quote ID
 * @returns JSX component for the quote edit page
 */
export default async function QuoteEditPage({
  params
}: {
  params: { id: string }
}) {
  // Get authenticated user
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/login")
  }
  
  // Fetch quote data
  const quoteResult = await getQuoteByIdAction(params.id)
  
  // If quote not found or doesn't belong to user, show 404
  if (!quoteResult.isSuccess || quoteResult.data.userId !== userId) {
    notFound()
  }
  
  const quote = quoteResult.data
  
  // Fetch quote items
  const itemsResult = await getQuoteItemsByQuoteIdAction(params.id)
  const items = itemsResult.isSuccess ? itemsResult.data : []
  
  return (
    <div className="space-y-6">
      {/* Page header with back link */}
      <div className="flex items-center gap-2">
        <Link 
          href={`/app/quotes/${quote.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quote
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold">Edit Quote</h1>
      <p className="text-muted-foreground">
        Update the quote details below.
      </p>
      
      <QuoteForm userId={userId} quote={quote} initialItems={items} />
    </div>
  )
} 