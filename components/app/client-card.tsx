/**
 * @file Client card component
 * @description 
 * This component displays client information in a card format.
 * Used for showing client details in lists and detail views.
 * 
 * Key features:
 * - Displays client contact information
 * - Provides action buttons for edit/delete operations
 * - Visual indicator for fields that have data
 * - Responsive layout
 * 
 * @dependencies
 * - ShadCN UI: For card and button components
 * - lucide-react: For icons
 * - SelectClient: Type from db schema
 * 
 * @notes
 * - Client-side component to allow for interactive features
 * - Uses conditional rendering to handle optional client fields
 */

"use client"

import { deleteClientAction } from "@/actions/db/clients-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { useToast } from "@/lib/hooks/use-toast"
import { SelectClient } from "@/db/schema"
import { Mail, MapPin, Phone, Trash2, Building, FileText, Edit } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Props for the ClientCard component
 */
interface ClientCardProps {
  client: SelectClient
  viewOnly?: boolean
  showActions?: boolean
}

/**
 * Card component for displaying client information
 * 
 * @param client - The client data to display
 * @param viewOnly - If true, removes action buttons (optional, default false)
 * @param showActions - If true, shows edit/delete actions (optional, default true)
 */
export function ClientCard({ client, viewOnly = false, showActions = true }: ClientCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  /**
   * Handle client deletion
   */
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const result = await deleteClientAction(client.id)
      
      if (result.isSuccess) {
        toast({
          title: "Success",
          description: "Client deleted successfully"
        })
        
        // Navigate back to clients list
        router.push("/app/clients")
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting client:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  /**
   * Format creation date for display
   */
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{client.name}</CardTitle>
        <CardDescription>
          Client since {formatDate(client.createdAt)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Client contact information section */}
        <div className="grid gap-3">
          {/* Email - if available */}
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${client.email}`}
                className="text-sm text-foreground hover:underline"
              >
                {client.email}
              </a>
            </div>
          )}
          
          {/* Phone - if available */}
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${client.phone}`}
                className="text-sm text-foreground hover:underline"
              >
                {client.phone}
              </a>
            </div>
          )}
          
          {/* Address - if available */}
          {client.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm whitespace-pre-line">{client.address}</p>
            </div>
          )}
          
          {/* Tax number - if available */}
          {client.taxNumber && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">Tax ID: {client.taxNumber}</p>
            </div>
          )}
        </div>
        
        {/* Notes section - if available */}
        {client.notes && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-start gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <h4 className="text-sm font-medium">Notes</h4>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line pl-6">
              {client.notes}
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Card actions - only show if not in view-only mode and showActions is true */}
      {!viewOnly && showActions && (
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <Button variant="outline" asChild>
            <Link href={`/app/clients/${client.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the client. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      )}
    </Card>
  )
}