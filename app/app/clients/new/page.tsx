/**
 * @file New client page
 * @description 
 * Provides a form to create a new client. This page allows users to enter
 * client details such as name, email, phone, address, and other information.
 * 
 * Key features:
 * - Form for entering new client details
 * - Validation for required fields
 * - Cancel and submit buttons
 * - Success handling with redirect
 * 
 * @dependencies
 * - ClientForm: Component for the client creation form
 * - auth: For retrieving the authenticated user
 * 
 * @notes
 * - Server component for initial setup
 * - Uses client components for form interaction
 */

"use server"

import { ClientForm } from "../_components/client-form"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

/**
 * New Client Page
 * 
 * Renders the page for creating a new client with a form
 * 
 * @returns JSX component for the new client page
 */
export default async function NewClientPage() {
  // Get authenticated user ID
  const { userId } = await auth()
  
  // Redirect to login if not authenticated
  if (!userId) {
    return redirect("/login")
  }
  
  return (
    <div className="space-y-6">
      {/* Page header with back link */}
      <div className="flex items-center gap-2">
        <Link 
          href="/app/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
      </div>
      
      {/* Page title and description */}
      <div>
        <h1 className="text-3xl font-bold">Add New Client</h1>
        <p className="text-muted-foreground">
          Create a new client to use in your invoices and quotes.
        </p>
      </div>
      
      {/* Client form component */}
      <ClientForm userId={userId} />
    </div>
  )
}