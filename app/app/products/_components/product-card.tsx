/**
 * @file Product card component
 * @description 
 * This component displays product/service information in a card format.
 * Used for showing product details in lists and detail views.
 * 
 * Key features:
 * - Displays product name, description, and pricing
 * - Shows recurring service information if applicable
 * - Provides action buttons for edit/delete operations
 * - Formats currency and tax rate for display
 * 
 * @dependencies
 * - ShadCN UI: For card and button components
 * - lucide-react: For icons
 * - SelectProduct: Type from db schema
 * 
 * @notes
 * - Client-side component to allow for interactive features
 * - Uses conditional rendering to handle optional product fields
 * - Formats currency and percentages for better readability
 */

"use client"

import { deleteProductAction } from "@/actions/db/products-actions"
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
import { Badge } from "@/components/ui/badge"
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
import { SelectProduct } from "@/db/schema"
import { CalendarClock, DollarSign, Edit, PercentIcon, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Props for the ProductCard component
 */
interface ProductCardProps {
  product: SelectProduct
  viewOnly?: boolean
  showActions?: boolean
}

/**
 * Card component for displaying product/service information
 * 
 * @param product - The product data to display
 * @param viewOnly - If true, removes action buttons (optional, default false)
 * @param showActions - If true, shows edit/delete actions (optional, default true)
 */
export function ProductCard({ product, viewOnly = false, showActions = true }: ProductCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  /**
   * Format currency for display
   * @param value - String value to format as currency
   */
  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue)
  }

  /**
   * Format tax rate for display
   * @param rate - String value to format as percentage
   */
  const formatTaxRate = (rate: string) => {
    const numValue = parseFloat(rate) || 0
    return `${numValue}%`
  }

  /**
   * Get text description for recurrence period
   * @param unit - The recurrence unit (day, week, month, year)
   */
  const getRecurrenceText = (unit?: string) => {
    if (!unit) return "Recurring"
    
    switch (unit) {
      case "day": return "Daily"
      case "week": return "Weekly"
      case "month": return "Monthly"
      case "year": return "Yearly"
      default: return "Recurring"
    }
  }

  /**
   * Handle product deletion
   */
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const result = await deleteProductAction(product.id)
      
      if (result.isSuccess) {
        toast({
          title: "Success",
          description: "Product deleted successfully"
        })
        
        // Navigate back to products list
        router.push("/app/products")
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting product:", error)
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
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="truncate">{product.name}</CardTitle>
          {product.isRecurring && (
            <Badge variant="outline" className="ml-2 flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {getRecurrenceText(product.recurrenceUnit || undefined)}
            </Badge>
          )}
        </div>
        <CardDescription>
          Added on {formatDate(product.createdAt)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price and tax rate */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-muted-foreground mr-1" />
            <span className="font-medium">{formatCurrency(product.unitPrice)}</span>
          </div>
          {parseFloat(product.taxRate) > 0 && (
            <div className="flex items-center">
              <PercentIcon className="h-4 w-4 text-muted-foreground mr-1" />
              <span>{formatTaxRate(product.taxRate)} tax</span>
            </div>
          )}
        </div>
        
        {/* Description - if available */}
        {product.description && (
          <div className="text-sm text-muted-foreground">
            {product.description}
          </div>
        )}
      </CardContent>
      
      {/* Card actions - only show if not in view-only mode and showActions is true */}
      {!viewOnly && showActions && (
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <Button variant="outline" asChild>
            <Link href={`/app/products/${product.id}/edit`}>
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
                  This will permanently delete the product. This action cannot be undone.
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