/**

@file Quotes list page
@description
Displays a searchable, filterable list of quotes with options to create,
view, edit, and delete quotes. This page serves as the main interface
for quote management.

Key features:


Quote listing with search and filter functionality




Create new quote button




Quote cards with action buttons




Responsive grid layout for different screen sizes



@dependencies


getQuotesByUserIdAction: For fetching quotes from the database




QuoteList: Component for displaying quote cards




auth: For retrieving the authenticated user



@notes


Server component for initial data loading




Uses client components for interactive elements
*/



"use server"
import { getQuotesByUserIdAction } from "@/actions/db/quotes-actions"
import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { auth } from "@clerk/nextjs/server"
import { Plus, FileText } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import QuoteList from "./_components/quote-list"
/**

Quotes List Page

Renders the quotes list page with functionality to search, filter,
and perform actions on quotes.

@returns JSX component for the quotes list page
*/
export default async function QuotesPage() {
// Get authenticated user ID
const { userId } = await auth()

// Redirect to login if not authenticated
if (!userId) {
return redirect("/login")
}
// Fetch quotes for the authenticated user
const quotesResult = await getQuotesByUserIdAction(userId)
const quotes = quotesResult.isSuccess ? quotesResult.data : []

// Fetch clients for the authenticated user
const clientsResult = await getClientsByUserIdAction(userId)
const clients = clientsResult.isSuccess ? clientsResult.data : []

// Create a map of client IDs to client names for quick lookup
const clientMap = new Map()
clients.forEach(client => {
  clientMap.set(client.id, client.name)
})

// Add client names to quotes
const quotesWithClientNames = quotes.map(quote => ({
  ...quote,
  clientName: quote.clientId ? clientMap.get(quote.clientId) : undefined
}))

return (
<div className="space-y-6">
{/* Page header with title and add quote button */}
<div className="flex items-center justify-between">
<h1 className="text-3xl font-bold">Quotes</h1>
<Button asChild className="bg-blue-500 hover:bg-blue-600">
<Link href="/app/quotes/new">
<Plus className="mr-2 h-4 w-4" />
New Quote
</Link>
</Button>
</div>
  {/* Description text for the page */}
  <p className="text-muted-foreground">
    Create and manage quotes for your clients.
  </p>
  
  {/* Display quote list or empty state */}
  {quotes.length === 0 ? (
    <EmptyQuoteState />
  ) : (
    <QuoteList quotes={quotesWithClientNames} />
  )}
</div>
)
}
/**

Empty state component when no quotes are available

@returns JSX component for empty state
*/
function EmptyQuoteState() {
return (
<Card className="flex flex-col items-center justify-center p-12 text-center">
<FileText className="h-12 w-12 text-muted-foreground mb-4" />
   <h3 className="text-lg font-semibold">No quotes yet</h3>
   <p className="mb-6 mt-2 text-muted-foreground">
     Create your first quote to start sending proposals to clients.
   </p>
   <Button asChild className="bg-blue-500 hover:bg-blue-600">
     <Link href="/app/quotes/new">
       <Plus className="mr-2 h-4 w-4" />
       Create Your First Quote
     </Link>
   </Button>
 </Card>


)
}