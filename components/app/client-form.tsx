/**
 * @file Client form component
 * @description 
 * A form component for creating and editing client information.
 * Handles input validation, form submission, and error handling.
 * 
 * Key features:
 * - Create new clients or edit existing ones
 * - Form validation with error messages
 * - Responsive layout for different screen sizes
 * - Loading state during submission
 * 
 * @dependencies
 * - React Hook Form: For form state management and validation
 * - ShadCN UI components: For form inputs and styling
 * - Server actions: For database operations
 * 
 * @notes
 * - Client-side component to allow for interactive form features
 * - Uses controlled inputs with React Hook Form
 * - Implements custom validation rules for fields like email, phone
 */

"use client"

import { createClientAction, updateClientAction } from "@/actions/db/clients-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { SelectClient } from "@/db/schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

/**
 * Validation schema for client form
 */
const clientFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  taxNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal(""))
})

/**
 * Type for form values with validation
 */
type ClientFormValues = z.infer<typeof clientFormSchema>

/**
 * Props for the ClientForm component
 */
interface ClientFormProps {
  userId: string
  client?: SelectClient
  onSuccess?: (client: SelectClient) => void
}

/**
 * Form component for creating or editing a client
 * 
 * @param userId - The ID of the current user
 * @param client - Optional existing client data for editing
 * @param onSuccess - Optional callback function after successful submission
 */
export function ClientForm({ userId, client, onSuccess }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Set up form with default values and validation
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      taxNumber: client?.taxNumber || "",
      notes: client?.notes || ""
    }
  })

  /**
   * Handle form submission
   * Creates a new client or updates an existing one
   */
  const onSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true)

    try {
      if (client) {
        // Update existing client
        const result = await updateClientAction(client.id, {
          ...values,
          userId
        })

        if (result.isSuccess) {
          toast({
            title: "Success",
            description: "Client updated successfully"
          })
          
          if (onSuccess) {
            onSuccess(result.data)
          } else {
            router.push(`/app/clients/${result.data.id}`)
            router.refresh()
          }
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      } else {
        // Create new client
        const result = await createClientAction({
          ...values,
          userId
        })

        if (result.isSuccess) {
          toast({
            title: "Success",
            description: "Client created successfully"
          })
          
          if (onSuccess) {
            onSuccess(result.data)
          } else {
            router.push(`/app/clients/${result.data.id}`)
            router.refresh()
          }
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error("Error submitting client form:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{client ? "Edit Client" : "Add New Client"}</CardTitle>
        <CardDescription>
          {client
            ? "Update client information"
            : "Enter client details to create a new client"}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Client name field - required */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email field - optional but validated if provided */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="client@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Primary contact email address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone field - optional */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address field - optional */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Client address"
                      className="min-h-20 resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tax number field - optional */}
            <FormField
              control={form.control}
              name="taxNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax/VAT Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Tax/VAT number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used for tax documentation on invoices
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes field - optional */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this client"
                      className="min-h-20 resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {client ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{client ? "Update Client" : "Create Client"}</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}