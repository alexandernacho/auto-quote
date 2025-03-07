"use client"

import { createQuoteAction, updateQuoteAction } from "@/actions/db/quotes-actions"
import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { InsertQuote, InsertQuoteItem, SelectQuote, SelectQuoteItem } from "@/db/schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, Loader2, Plus, Trash } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * Validation schema for quote form
 */
const quoteItemSchema = z.object({
  description: z.string().min(1, { message: "Description is required" }),
  quantity: z.string().min(1, { message: "Quantity is required" }),
  unitPrice: z.string().min(1, { message: "Unit price is required" }),
  taxRate: z.string().default("0"),
  taxAmount: z.string().default("0"),
  subtotal: z.string().default("0"),
  total: z.string().default("0"),
})

const quoteFormSchema = z.object({
  clientId: z.string().min(1, { message: "Client is required" }),
  issueDate: z.date({ required_error: "Issue date is required" }),
  validUntil: z.date({ required_error: "Valid until date is required" }),
  status: z.string().default("draft"),
  discount: z.string().default("0"),
  notes: z.string().optional().or(z.literal("")),
  termsAndConditions: z.string().optional().or(z.literal("")),
  items: z.array(quoteItemSchema).min(1, { message: "At least one item is required" })
})

/**
 * Type for form values with validation
 */
type QuoteFormValues = z.infer<typeof quoteFormSchema>

/**
 * Props for the QuoteForm component
 */
interface QuoteFormProps {
  userId: string
  quote?: SelectQuote
  initialClient?: any
  initialTemplate?: any
  initialItems?: SelectQuoteItem[]
  onSuccess?: (quote: SelectQuote) => void
}

/**
 * Form component for creating or editing a quote
 * 
 * @param userId - The ID of the current user
 * @param quote - Optional existing quote data for editing
 * @param initialClient - Optional initial client data
 * @param initialTemplate - Optional initial template data
 * @param initialItems - Optional initial line items for editing
 * @param onSuccess - Optional callback function after successful submission
 */
export default function QuoteForm({ 
  userId, 
  quote, 
  initialClient,
  initialTemplate,
  initialItems = [],
  onSuccess 
}: QuoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const { toast } = useToast()
  const router = useRouter()

  // Fetch clients when component mounts
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const result = await getClientsByUserIdAction(userId)
        if (result.isSuccess) {
          setClients(result.data)
          
          // If we have an initialClient and it's not in the clients list, add it
          if (initialClient && !result.data.some((c: any) => c.id === initialClient.id)) {
            setClients(prev => [...prev, initialClient])
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load clients. " + result.message,
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("Error fetching clients:", error)
        toast({
          title: "Error",
          description: "Failed to load clients. Please try again.",
          variant: "destructive"
        })
      }
    }

    fetchClients()
  }, [userId, toast, initialClient])

  // Set up form with default values and validation
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      clientId: quote?.clientId || (initialClient?.id || ""),
      issueDate: quote?.issueDate ? new Date(quote.issueDate) : new Date(),
      validUntil: quote?.validUntil ? new Date(quote.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      status: quote?.status || "draft",
      discount: quote?.discount || "0",
      notes: quote?.notes || "",
      termsAndConditions: quote?.termsAndConditions || (initialTemplate?.termsAndConditions || ""),
      items: initialItems.length > 0 ? initialItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || "0",
        taxAmount: item.taxAmount || "0",
        subtotal: item.subtotal,
        total: item.total
      })) : [
        {
          description: "",
          quantity: "1",
          unitPrice: "0",
          taxRate: "0",
          taxAmount: "0",
          subtotal: "0",
          total: "0"
        }
      ]
    }
  })

  // Set up field array for line items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  })

  /**
   * Calculate line item totals when quantity or unit price changes
   */
  const calculateItemTotals = (index: number) => {
    const quantity = parseFloat(form.getValues(`items.${index}.quantity`) || "0")
    const unitPrice = parseFloat(form.getValues(`items.${index}.unitPrice`) || "0")
    const taxRate = parseFloat(form.getValues(`items.${index}.taxRate`) || "0")
    
    const subtotal = (quantity * unitPrice).toFixed(2)
    const taxAmount = (parseFloat(subtotal) * (taxRate / 100)).toFixed(2)
    const total = (parseFloat(subtotal) + parseFloat(taxAmount)).toFixed(2)
    
    form.setValue(`items.${index}.subtotal`, subtotal)
    form.setValue(`items.${index}.taxAmount`, taxAmount)
    form.setValue(`items.${index}.total`, total)
  }

  /**
   * Handle form submission
   * Creates a new quote or updates an existing one
   */
  const onSubmit = async (values: QuoteFormValues) => {
    setIsSubmitting(true)

    try {
      // Prepare items with calculated totals
      const items = values.items.map(item => ({
        ...item,
        quoteId: quote?.id || "", // Will be set by the server action for new quotes
      }))

      if (quote) {
        // Update existing quote
        const result = await updateQuoteAction(
          quote.id,
          {
            userId,
            clientId: values.clientId,
            // Use Date objects directly, not ISO strings
            issueDate: values.issueDate,
            validUntil: values.validUntil,
            status: values.status,
            discount: values.discount,
            notes: values.notes,
            termsAndConditions: values.termsAndConditions,
          } as any, // Use type assertion to bypass TypeScript check
          items as any
        )

        if (result.isSuccess) {
          toast({
            title: "Success",
            description: "Quote updated successfully"
          })
          
          if (onSuccess) {
            onSuccess(result.data.quote)
          } else {
            router.push(`/app/quotes/${result.data.quote.id}`)
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
        // Create new quote
        const result = await createQuoteAction(
          {
            userId,
            clientId: values.clientId,
            // Use Date objects directly, not ISO strings
            issueDate: values.issueDate,
            validUntil: values.validUntil,
            status: values.status,
            discount: values.discount,
            notes: values.notes,
            termsAndConditions: values.termsAndConditions,
            quoteNumber: "", // Will be generated by the server action
          } as any, // Use type assertion to bypass TypeScript check
          items as any
        )

        if (result.isSuccess) {
          toast({
            title: "Success",
            description: "Quote created successfully"
          })
          
          if (onSuccess) {
            onSuccess(result.data.quote)
          } else {
            router.push(`/app/quotes/${result.data.quote.id}`)
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
      console.error("Error submitting quote form:", error)
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
        <CardTitle>{quote ? "Edit Quote" : "Create New Quote"}</CardTitle>
        <CardDescription>
          {quote
            ? "Update quote information and line items"
            : "Enter quote details and add line items"}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client selection */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.length > 0 ? (
                          clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-clients" disabled>
                            No clients found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-normal text-xs"
                        type="button"
                        onClick={() => router.push('/app/clients/new')}
                      >
                        + Add a new client
                      </Button>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status selection */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Issue date */}
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Valid until date */}
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid Until</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Line items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    description: "",
                    quantity: "1",
                    unitPrice: "0",
                    taxRate: "0",
                    taxAmount: "0",
                    subtotal: "0",
                    total: "0"
                  })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-md space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Description */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Item description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quantity */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="1" 
                              step="1"
                              onChange={(e) => {
                                field.onChange(e)
                                calculateItemTotals(index)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Unit Price */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0" 
                              step="0.01"
                              onChange={(e) => {
                                field.onChange(e)
                                calculateItemTotals(index)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tax Rate */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.taxRate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0" 
                              step="0.1"
                              onChange={(e) => {
                                field.onChange(e)
                                calculateItemTotals(index)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Subtotal (calculated, read-only) */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.subtotal`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtotal</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Discount */}
            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" step="0.01" />
                  </FormControl>
                  <FormDescription>
                    Enter discount amount (not percentage)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes for the client"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Terms and Conditions */}
            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms and Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Terms and conditions for this quote"
                      className="min-h-[100px]"
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
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {quote ? "Update Quote" : "Create Quote"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
} 