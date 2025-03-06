/**
 * @file Product selector component
 * @description 
 * This component enables users to select existing products or create new ones.
 * Used in invoice and quote creation pages for adding line items.
 * 
 * Key features:
 * - Search existing products by name and description
 * - Create new product from within the selector
 * - Display price and tax rate information
 * - Format currency and tax values for readability
 * 
 * @dependencies
 * - ShadCN UI: For command menu, dialog, and other UI components
 * - Product Form: For creating new products
 * - Server actions: For fetching products
 * 
 * @notes
 * - Client-side component to allow for interactive features
 * - Uses a dialog for product creation to keep a seamless workflow
 * - Implements product search with filtering
 */

"use client"

import { getProductsByUserIdAction } from "@/actions/db/products-actions"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/lib/hooks/use-toast"
import { SelectProduct } from "@/db/schema"
import { CheckCircle2, ChevronsUpDown, DollarSign, LucideIcon, PackagePlus, PercentIcon, PlusCircle } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { ProductForm } from "../../products/_components/product-form"

/**
 * Props for the ProductSelector component
 */
interface ProductSelectorProps {
  selectedProductId?: string
  onProductSelect: (product: SelectProduct) => void
  placeholderText?: string
  disabled?: boolean
  icon?: LucideIcon
}

/**
 * Component for selecting or creating products
 * 
 * @param selectedProductId - Optional ID of currently selected product
 * @param onProductSelect - Callback function when a product is selected
 * @param placeholderText - Optional custom placeholder text for the selector
 * @param disabled - Whether the component is disabled
 * @param icon - Optional custom icon for the selector button
 */
export function ProductSelector({
  selectedProductId,
  onProductSelect,
  placeholderText = "Select product",
  disabled = false,
  icon: Icon = PackagePlus
}: ProductSelectorProps) {
  // State for UI controls
  const [open, setOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // State for data
  const [products, setProducts] = useState<SelectProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null)
  
  // Get userId from auth
  const { userId } = useAuth()
  const { toast } = useToast()
  
  /**
   * Load products and set the selected product if there's a selectedProductId
   */
  useEffect(() => {
    async function loadProducts() {
      if (!userId) return
      
      setIsLoading(true)
      try {
        const result = await getProductsByUserIdAction(userId)
        
        if (result.isSuccess) {
          setProducts(result.data)
          
          // If there's a selectedProductId, find and set the corresponding product
          if (selectedProductId) {
            const selectedProduct = result.data.find(
              product => product.id === selectedProductId
            )
            setSelectedProduct(selectedProduct || null)
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load products",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("Error loading products:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading products",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProducts()
  }, [userId, selectedProductId, toast])
  
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
   * Handle product selection
   */
  const handleSelectProduct = (product: SelectProduct) => {
    setSelectedProduct(product)
    onProductSelect(product)
    setOpen(false)
  }
  
  /**
   * Handle successful product creation
   */
  const handleProductCreated = (product: SelectProduct) => {
    // Add the new product to the list
    setProducts(prevProducts => [product, ...prevProducts])
    
    // Select the newly created product
    setSelectedProduct(product)
    onProductSelect(product)
    
    // Close the create dialog
    setCreateDialogOpen(false)
    
    toast({
      title: "Product created",
      description: `${product.name} has been added to your products`,
    })
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : selectedProduct ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <Icon className="h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate">{selectedProduct.name}</span>
                <span className="text-muted-foreground">
                  ({formatCurrency(selectedProduct.unitPrice)})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 opacity-50" />
                <span>{placeholderText}</span>
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]">
          <Command>
            <CommandInput placeholder="Search products..." />
            <CommandList>
              <CommandEmpty>
                No product found. Try a different search or create a new product.
              </CommandEmpty>
              
              {/* Existing products */}
              <CommandGroup heading="Your Products">
                {products.map(product => (
                  <CommandItem
                    key={product.id}
                    value={`${product.id}-${product.name}`}
                    onSelect={() => handleSelectProduct(product)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        {product.id === selectedProductId && (
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        )}
                        {product.id !== selectedProductId && (
                          <Icon className="mr-2 h-4 w-4" />
                        )}
                        <span className="truncate">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatCurrency(product.unitPrice)}</span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              
              {/* Create new product option */}
              <CommandGroup heading="Actions">
                <CommandItem
                  onSelect={() => {
                    setCreateDialogOpen(true)
                    setOpen(false)
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create new product
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Quick create button */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="shrink-0"
            disabled={disabled || isLoading}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Add a new product or service to your catalog. This will be available for selection in invoices and quotes.
            </DialogDescription>
          </DialogHeader>
          
          {userId && (
            <ProductForm
              userId={userId}
              onSuccess={handleProductCreated}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}