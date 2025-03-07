/**

@file Invoices list page
@description
Displays a searchable, filterable list of invoices with options to create,
view, edit, and delete invoices. This page serves as the main interface
for invoice management.

Key features:


Invoice listing with search and filter functionality




Create new invoice button




Invoice cards with action buttons




Responsive grid layout for different screen sizes



@dependencies


getInvoicesByUserIdAction: For fetching invoices from the database




InvoiceList: Component for displaying invoice cards




auth: For retrieving the authenticated user



@notes


Server component for initial data loading




Uses client components for interactive elements
*/



"use server"
import { getInvoicesByUserIdAction } from "@/actions/db/invoices-actions"
import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { auth } from "@clerk/nextjs/server"
import { Plus, Receipt } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import InvoiceList from "./_components/invoice-list"
/**

Invoices List Page

Renders the invoices list page with functionality to search, filter,
and perform actions on invoices.

@returns JSX component for the invoices list page
*/
export default async function InvoicesPage() {
// Get authenticated user ID
const { userId } = await auth()

// Redirect to login if not authenticated
if (!userId) {
return redirect("/login")
}
// Fetch invoices for the authenticated user
const invoicesResult = await getInvoicesByUserIdAction(userId)
const invoices = invoicesResult.isSuccess ? invoicesResult.data : []

// Fetch clients for the authenticated user
const clientsResult = await getClientsByUserIdAction(userId)
const clients = clientsResult.isSuccess ? clientsResult.data : []

// Create a map of client IDs to client names for quick lookup
const clientMap = new Map()
clients.forEach(client => {
  clientMap.set(client.id, client.name)
})

// Add client names to invoices
const invoicesWithClientNames = invoices.map(invoice => ({
  ...invoice,
  clientName: invoice.clientId ? clientMap.get(invoice.clientId) : undefined
}))

return (
<div className="space-y-6">
{/* Page header with title and add invoice button */}
<div className="flex items-center justify-between">
<h1 className="text-3xl font-bold">Invoices</h1>
<Button asChild className="bg-blue-500 hover:bg-blue-600">
<Link href="/app/invoices/new">
<Plus className="mr-2 h-4 w-4" />
New Invoice
</Link>
</Button>
</div>
  {/* Description text for the page */}
  <p className="text-muted-foreground">
    Manage your invoices and track payments.
  </p>
  
  {/* Display invoice list or empty state */}
  {invoices.length === 0 ? (
    <EmptyInvoiceState />
  ) : (
    <InvoiceList invoices={invoicesWithClientNames} />
  )}
</div>
)
}
/**

Empty state component when no invoices are available

@returns JSX component for empty state
*/
function EmptyInvoiceState() {
return (
<Card className="flex flex-col items-center justify-center p-12 text-center">
<Receipt className="h-12 w-12 text-muted-foreground mb-4" />
   <h3 className="text-lg font-semibold">No invoices yet</h3>
   <p className="mb-6 mt-2 text-muted-foreground">
     Create your first invoice to start tracking your payments.
   </p>
   <Button asChild className="bg-blue-500 hover:bg-blue-600">
     <Link href="/app/invoices/new">
       <Plus className="mr-2 h-4 w-4" />
       Create Your First Invoice
     </Link>
   </Button>
 </Card>


)
}