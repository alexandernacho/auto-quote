/**
 * @file Product list component
 * @description 
 * This component displays a list of products with searching and filtering capabilities.
 * Used in the products management pages for browsing and managing products.
 * 
 * Key features:
 * - Display products in a list or grid view
 * - Search/filter functionality
 * - Empty state handling
 * - Loading state visualization
 * - Toggle between grid and list views
 * 
 * @dependencies
 * - ProductCard: For displaying individual product cards
 * - ShadCN UI: For input, card, and other UI components
 * 
 * @notes
 * - Client-side component to allow for interactive features
 * - Implements filtering without server trips
 * - Shows appropriate feedback for empty states
 */

"use client"

import { ProductCard } from "@/components/app/product-card"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SelectProduct } from "@/db/schema"
import { cn } from "@/lib/utils"
import { AlignJustify, Grid, Package, Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

/**
 * Props for the ProductList component
 */
interface ProductListProps {
  products: SelectProduct[]
  isLoading?: boolean
  className?: string
}

/**
 * View type for product display
 */
type ViewType = "grid" | "list"

/**
 * List component for displaying and searching products
 * 
 * @param products - Array of product data to display
 * @param isLoading - Whether the data is still loading
 * @param className - Optional additional CSS classes
 */
export function ProductList({ products, isLoading = false, className }: ProductListProps) {
  // State for search term and filtered products
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredProducts, setFilteredProducts] = useState<SelectProduct[]>(products)
  // State for view type (grid or list)
  const [viewType, setViewType] = useState<ViewType>("grid")
  
  /**
   * Filter products when search term or products list changes
   */
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products)
      return
    }
    
    const term = searchTerm.toLowerCase()
    const filtered = products.filter(product => {
      return (
        product.name.toLowerCase().includes(term) ||
        (product.description && product.description.toLowerCase().includes(term))
      )
    })
    
    setFilteredProducts(filtered)
  }, [searchTerm, products])
  
  /**
   * Creates loading skeleton UI
   */
  const renderLoadingSkeleton = () => {
    return (
      <div className={cn(
        "grid gap-4",
        viewType === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {Array(6).fill(0).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-1/3 rounded bg-muted"></div>
                <div className="h-3 w-1/4 rounded bg-muted"></div>
              </CardHeader>
              <div className="px-6 pb-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-3 w-3/4 rounded bg-muted"></div>
                  <div className="h-3 w-1/2 rounded bg-muted"></div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }
  
  /**
   * Renders empty state with create product button
   */
  const renderEmptyState = () => {
    // Different message if no products at all vs no search results
    const noResults = products.length > 0 && filteredProducts.length === 0
    
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center bg-muted/50">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="text-xl">
          {noResults ? "No matching products" : "No products yet"}
        </CardTitle>
        <CardDescription className="max-w-sm mb-4">
          {noResults
            ? "Try a different search term or clear the search"
            : "Create your first product to get started with invoicing"}
        </CardDescription>
        
        {noResults ? (
          <Button
            variant="outline"
            onClick={() => setSearchTerm("")}
            className="mt-2"
          >
            Clear Search
          </Button>
        ) : (
          <Button asChild>
            <Link href="/app/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        )}
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls section - search and view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Package className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading || products.length === 0}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-9 w-9 px-0"
              onClick={() => setSearchTerm("")}
              disabled={isLoading}
            >
              &times;
            </Button>
          )}
        </div>
        
        {/* View type toggle buttons */}
        <div className="flex items-center border rounded-md bg-muted/40">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-r-none",
              viewType === "grid" && "bg-background shadow-sm"
            )}
            onClick={() => setViewType("grid")}
            disabled={isLoading}
          >
            <Grid className="h-4 w-4" />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-l-none",
              viewType === "list" && "bg-background shadow-sm"
            )}
            onClick={() => setViewType("list")}
            disabled={isLoading}
          >
            <AlignJustify className="h-4 w-4" />
            <span className="sr-only">List view</span>
          </Button>
        </div>
        
        {/* Add product button */}
        <Button asChild className="shrink-0">
          <Link href="/app/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>
      
      {/* Content section */}
      <div>
        {/* Loading state */}
        {isLoading && renderLoadingSkeleton()}
        
        {/* Empty state */}
        {!isLoading && filteredProducts.length === 0 && renderEmptyState()}
        
        {/* Product list/grid */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className={cn(
            "grid gap-4",
            viewType === "grid" 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {filteredProducts.map((product) => (
              <Link 
                key={product.id} 
                href={`/app/products/${product.id}`}
                className="block transition-transform hover:scale-[1.01]"
              >
                <ProductCard product={product} viewOnly />
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Results count */}
      {!isLoading && products.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      )}
    </div>
  )
}