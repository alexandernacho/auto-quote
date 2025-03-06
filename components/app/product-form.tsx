"use client"

import { createProductAction, updateProductAction } from "@/actions/db/products-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/hooks/use-toast"
import { SelectProduct } from "@/db/schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

// Validation schema with numeric field refinement function
const validateNumericField = (val: string) => {
  if (!val) return true
  const parsed = parseFloat(val)
  return !isNaN(parsed) && parsed >= 0
}

const productFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  unitPrice: z.string().refine(validateNumericField, { message: "Price must be a positive number" }),
  taxRate: z.string().refine(validateNumericField, { message: "Tax rate must be a positive number" }),
  isRecurring: z.boolean().default(false),
  recurrenceUnit: z.string().optional()
    .refine(val => !val || ["day", "week", "month", "year"].includes(val), 
      { message: "Please select a valid recurrence unit" })
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface ProductFormProps {
  userId: string
  product?: SelectProduct
  onSuccess?: (product: SelectProduct) => void
}

export function ProductForm({ userId, product, onSuccess }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      unitPrice: product?.unitPrice || "0",
      taxRate: product?.taxRate || "0",
      isRecurring: product?.isRecurring || false,
      recurrenceUnit: product?.recurrenceUnit || undefined
    }
  })

  const isRecurring = form.watch("isRecurring")

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true)
    try {
      const action = product ? updateProductAction(product.id, { ...values, userId }) : createProductAction({ ...values, userId })
      const result = await action
      
      if (result.isSuccess) {
        toast({
          title: "Success",
          description: `Product ${product ? "updated" : "created"} successfully`
        })
        
        if (onSuccess) {
          onSuccess(result.data)
        } else {
          router.push(`/app/products/${result.data.id}`)
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
      console.error(`Error ${product ? "updating" : "creating"} product:`, error)
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
        <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
        <CardDescription>
          {product ? "Update product/service information" : "Enter product/service details"}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Product or service name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Product/service description"
                      className="min-h-20 resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed description of your product or service
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate (%)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Default tax rate applied to this product/service
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Recurring Service</FormLabel>
                    <FormDescription>
                      Mark if this is a subscription or recurring service
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isRecurring && (
              <FormField
                control={form.control}
                name="recurrenceUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence Unit</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["day", "week", "month", "year"].map(unit => (
                          <SelectItem key={unit} value={unit}>
                            {unit.charAt(0).toUpperCase() + unit.slice(1) + (unit === "day" ? "ly" : "ly")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>How often this service recurs</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
                  {product ? "Updating..." : "Creating..."}
                </>
              ) : (
                product ? "Update Product" : "Create Product"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}