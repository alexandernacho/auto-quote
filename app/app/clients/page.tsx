/**
 * @file Clients list page
 * @description 
 * Displays a searchable, filterable list of clients with options to create,
 * view, edit, and delete clients. This page serves as the main interface
 * for client management.
 * 
 * Key features:
 * - Client listing with search functionality
 * - Create new client button
 * - Client cards with action buttons
 * - Responsive grid layout for different screen sizes
 * 
 * @dependencies
 * - getClientsByUserIdAction: For fetching clients from the database
 * - ClientList: Component for displaying client cards
 * - auth: For retrieving the authenticated user
 * 
 * @notes
 * - Server component for initial data loading
 * - Uses client components for interactive elements
 */

"use server"

import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { auth } from "@clerk/nextjs/server"
import { Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ClientList } from "./_components/client-list"

/**
 * Clients List Page
 * 
 * Renders the clients list page with functionality to search, filter,
 * and perform actions on clients.
 * 
 * @returns JSX component for the clients list page
 */
export default async function ClientsPage() {
  // Get authenticated user ID
  const { userId } = await auth()
  
  // Redirect to login if not authenticated
  if (!userId) {
    return redirect("/login")
  }
  
  // Fetch clients for the authenticated user
  const clientsResult = await getClientsByUserIdAction(userId)
  const clients = clientsResult.isSuccess ? clientsResult.data : []
  
  return (
    <div className="space-y-6">
      {/* Page header with title and add client button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button asChild className="bg-blue-500 hover:bg-blue-600">
          <Link href="/app/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>
      
      {/* Description text for the page */}
      <p className="text-muted-foreground">
        Manage your clients and their contact information.
      </p>
      
      {/* Display client list or empty state */}
      {clients.length === 0 ? (
        <EmptyClientState />
      ) : (
        <ClientList clients={clients} />
      )}
    </div>
  )
}

/**
 * Empty state component when no clients are available
 * 
 * @returns JSX component for empty state
 */
function EmptyClientState() {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <h3 className="text-lg font-semibold">No clients yet</h3>
      <p className="mb-6 mt-2 text-muted-foreground">
        Create your first client to start creating invoices and quotes.
      </p>
      <Button asChild className="bg-blue-500 hover:bg-blue-600">
        <Link href="/app/clients/new">
          <Plus className="mr-2 h-4 w-4" />
          Add Your First Client
        </Link>
      </Button>
    </Card>
  )
}