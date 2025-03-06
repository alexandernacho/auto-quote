/**
 * @file Edit client page
 * @description 
 * Provides a form to edit an existing client. This page allows users to update
 * client details such as name, email, phone, address, and other information.
 * 
 * Key features:
 * - Pre-filled form with existing client data
 * - Validation for required fields
 * - Cancel and submit buttons
 * - Success handling with redirect
 * 
 * @dependencies
 * - getClientByIdAction: For fetching the specific client to edit
 * - ClientForm: Component for the client editing form
 * - auth: For retrieving the authenticated user
 * 
 * @notes
 * - Server component for initial data loading
 * - Uses client components for form interaction
 * - Verifies that client belongs to the authenticated user
 */

"use server"

import { getClientByIdAction } from "@/actions/db/clients-actions"
import { ClientForm } from "../../_components/client-form"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

/**
 * Edit client page component
 * 
 * @param params Object containing the client ID from the URL
 * @returns JSX component for the edit client page
 */
export default async function EditClientPage({
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
      {/* Page header with back link */}
      <div className="flex items-center gap-2">
        <Link 
          href={`/app/clients/${client.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Client
        </Link>
      </div>
      
      {/* Page title and description */}
      <div>
        <h1 className="text-3xl font-bold">Edit Client</h1>
        <p className="text-muted-foreground">
          Update client information for {client.name}
        </p>
      </div>
      
      {/* Client form component with existing client data */}
      <ClientForm userId={userId} client={client} />
    </div>
  )
}