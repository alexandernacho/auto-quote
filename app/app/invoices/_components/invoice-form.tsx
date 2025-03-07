"use client"

import { createInvoiceAction, updateInvoiceAction } from "@/actions/db/invoices-actions"
import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { getInvoiceItemsByInvoiceIdAction } from "@/actions/db/invoices-actions"
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
import { InsertInvoice, InsertInvoiceItem, SelectInvoice, SelectInvoiceItem, invoiceStatusEnum } from "@/db/schema"
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
 * Validation schema for invoice form
 */
const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  issueDate: z.date({
    required_error: "Issue date is required",
  }),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  status: z.enum(["draft", "sent", "paid", "overdue", "canceled"]),
  subject: z.string().min(1, "Subject is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discount: z.string().default("0"),
  items: z.array(
    z.object({
      id: z.string().optional(),
      description: z.string().min(1, "Description is required"),
      quantity: z.string().min(1, "Quantity is required"),
      unitPrice: z.string().min(1, "Unit price is required"),
      taxRate: z.string().default("0"),
    })
  ).min(1, "At least one item is required"),
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

/**
 * Props for the invoice form component
 */
interface InvoiceFormProps {
  userId: string
  invoice?: SelectInvoice
  initialClient?: any
  initialTemplate?: any
  onSuccess?: (invoice: SelectInvoice) => void
}

/**
 * Invoice form component for creating and editing invoices
 */
export default function InvoiceForm({ 
  userId, 
  invoice, 
  initialClient,
  initialTemplate,
  onSuccess 
}: InvoiceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [clients, setClients] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invoiceItems, setInvoiceItems] = useState<SelectInvoiceItem[]>([])
  
  // Initialize form with default values or existing invoice data
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoice ? {
      clientId: invoice.clientId || "",
      invoiceNumber: invoice.invoiceNumber,
      issueDate: new Date(invoice.issueDate),
      dueDate: new Date(invoice.dueDate),
      status: invoice.status,
      subject: invoice.notes?.split('\n')[0] || "", // Use first line of notes as subject
      notes: invoice.notes?.split('\n').slice(1).join('\n') || "",
      terms: invoice.termsAndConditions || "",
      discount: invoice.discount || "0",
      items: [] // Items will be loaded separately in useEffect
    } : {
      clientId: initialClient?.id || "",
      invoiceNumber: "",
      issueDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Default due date: 30 days from now
      status: "draft" as const,
      subject: "",
      notes: initialTemplate?.notes || "",
      terms: initialTemplate?.terms || "",
      discount: "0",
      items: [
        {
          description: "",
          quantity: "1",
          unitPrice: "0",
          taxRate: "0",
        }
      ]
    }
  })
  
  // Fetch clients and invoice items on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch clients
      const clientsResult = await getClientsByUserIdAction(userId)
      if (clientsResult.isSuccess) {
        setClients(clientsResult.data || [])
      }
      
      // Fetch invoice items if editing an existing invoice
      if (invoice) {
        const itemsResult = await getInvoiceItemsByInvoiceIdAction(invoice.id)
        if (itemsResult.isSuccess) {
          setInvoiceItems(itemsResult.data || [])
          
          // Update form with items
          const formItems = itemsResult.data.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || "0"
          }))
          
          form.setValue('items', formItems)
        }
      }
    }
    
    fetchData()
  }, [userId, invoice, form])
  
  // Setup field array for invoice items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  })
  
  // Calculate totals for an item
  const calculateItemTotals = (index: number) => {
    const values = form.getValues()
    const item = values.items[index]
    
    if (!item) return { subtotal: "0", tax: "0", total: "0" }
    
    const quantity = parseFloat(item.quantity) || 0
    const unitPrice = parseFloat(item.unitPrice) || 0
    const taxRate = parseFloat(item.taxRate) || 0
    
    const subtotal = quantity * unitPrice
    const tax = subtotal * (taxRate / 100)
    const total = subtotal + tax
    
    return { 
      subtotal: subtotal.toFixed(2), 
      tax: tax.toFixed(2), 
      total: total.toFixed(2) 
    }
  }
  
  // Calculate invoice totals based on all items
  const calculateInvoiceTotals = () => {
    const values = form.getValues()
    
    let subtotal = 0
    let tax = 0
    
    values.items.forEach((item, index) => {
      const itemTotals = calculateItemTotals(index)
      subtotal += parseFloat(itemTotals.subtotal)
      tax += parseFloat(itemTotals.tax)
    })
    
    const discount = parseFloat(values.discount) || 0
    const total = subtotal + tax - discount
    
    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: tax.toFixed(2),
      total: total.toFixed(2)
    }
  }
  
  // Handle form submission
  const onSubmit = async (values: InvoiceFormValues) => {
    setIsSubmitting(true)
    
    try {
      // Calculate invoice totals
      const { subtotal, taxAmount, total } = calculateInvoiceTotals()
      
      // Prepare invoice data
      const invoiceData = {
        id: invoice?.id,
        userId,
        clientId: values.clientId,
        invoiceNumber: values.invoiceNumber,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        status: values.status,
        notes: values.subject + (values.notes ? `\n\n${values.notes}` : ""),
        termsAndConditions: values.terms || null,
        discount: values.discount,
        // Set calculated totals
        subtotal,
        taxAmount,
        total
      }
      
      // Create or update invoice
      let result
      
      if (invoice) {
        // For update, we need to use the existing items with updated values
        const updatedItems = values.items.map(item => {
          // Find existing item or create new structure
          const existingItem = invoiceItems.find(i => i.id === item.id)
          const { subtotal, tax, total } = calculateItemTotals(
            values.items.indexOf(item)
          )
          
          if (existingItem) {
            // Update existing item
            return {
              ...existingItem,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || "0",
              taxAmount: tax,
              subtotal: subtotal,
              total: total
            }
          } else {
            // Create new item structure for existing invoice
            const now = new Date()
            return {
              id: item.id || crypto.randomUUID(),
              invoiceId: invoice.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || "0",
              taxAmount: tax,
              subtotal: subtotal,
              total: total,
              productId: null,
              createdAt: now,
              updatedAt: now
            }
          }
        })
        
        result = await updateInvoiceAction(invoice.id, invoiceData, updatedItems)
      } else {
        // For create, we prepare the items without IDs
        const newItems = values.items.map(item => {
          const { subtotal, tax, total } = calculateItemTotals(
            values.items.indexOf(item)
          )
          
          return {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || "0",
            taxAmount: tax,
            subtotal: subtotal,
            total: total,
            // The invoiceId will be added by the server
            invoiceId: ""
          }
        })
        
        result = await createInvoiceAction(invoiceData, newItems)
      }
      
      if (result.isSuccess) {
        toast({
          title: invoice ? "Invoice updated" : "Invoice created",
          description: invoice ? "Your invoice has been updated successfully." : "Your invoice has been created successfully.",
        })
        
        if (onSuccess) {
          onSuccess(result.data.invoice)
        } else {
          router.push("/app/invoices")
          router.refresh()
        }
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error submitting invoice:", error)
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>
              Enter the details for your invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
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
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Invoice Number */}
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Issue Date and Due Date */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
              
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
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
            
            {/* Status */}
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
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Invoice for services" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Discount */}
            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount</FormLabel>
                  <FormControl>
                    <Input placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a discount amount (not percentage)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
            <CardDescription>
              Add the items you want to include in your invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Item {index + 1}</h4>
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
                
                {/* Item Description */}
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Item description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input placeholder="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Unit Price */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input placeholder="0" {...field} />
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
                          <Input placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Item Totals */}
                <div className="grid grid-cols-3 gap-4 rounded-md bg-muted p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="font-medium">
                      ${calculateItemTotals(index).subtotal}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tax</p>
                    <p className="font-medium">
                      ${calculateItemTotals(index).tax}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-medium">
                      ${calculateItemTotals(index).total}
                    </p>
                  </div>
                </div>
                
                {index < fields.length - 1 && <hr className="my-6" />}
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({
                description: "",
                quantity: "1",
                unitPrice: "0",
                taxRate: "0",
              })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </CardContent>
        </Card>
        
        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>
              Add any additional information to your invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  <FormDescription>
                    These notes will be visible to the client.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Terms */}
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms and Conditions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Terms and conditions" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Payment terms, delivery conditions, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/app/invoices")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {invoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
