/**
 * @file Client list component
 * @description 
 * This component displays a list of clients with searching and filtering capabilities.
 * Used in the clients management pages for browsing and selecting clients.
 * 
 * Key features:
 * - Display clients in a list or grid view
 * - Search/filter functionality
 * - Empty state handling
 * - Loading state
 * 
 * @dependencies
 * - ClientCard: For displaying individual client cards
 * - ShadCN UI: For input, card, and other UI components
 * 
 * @notes
 * - Client-side component to allow for interactive features
 * - Implements filtering without server trips
 * - Shows appropriate feedback for empty states
 */

"use client"

import { ClientCard } from "@/components/app/client-card"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SelectClient } from "@/db/schema"
import { cn } from "@/lib/utils"
import { AlignJustify, Grid, Plus, Search, UserIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

/**
 * Props for the ClientList component
 */
interface ClientListProps {
  clients: SelectClient[]
  isLoading?: boolean
  className?: string
}

/**
 * View type for client display
 */
type ViewType = "grid" | "list"

/**
 * List component for displaying and searching clients
 * 
 * @param clients - Array of client data to display
 * @param isLoading - Whether the data is still loading
 * @param className - Optional additional CSS classes
 */
export function ClientList({ clients, isLoading = false, className }: ClientListProps) {
  // State for search term and filtered clients
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredClients, setFilteredClients] = useState<SelectClient[]>(clients)
  // State for view type (grid or list)
  const [viewType, setViewType] = useState<ViewType>("grid")
  
  /**
   * Filter clients when search term or clients list changes
   */
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients)
      return
    }
    
    const term = searchTerm.toLowerCase()
    const filtered = clients.filter(client => {
      return (
        client.name.toLowerCase().includes(term) ||
        (client.email && client.email.toLowerCase().includes(term)) ||
        (client.phone && client.phone.toLowerCase().includes(term)) ||
        (client.address && client.address.toLowerCase().includes(term)) ||
        (client.taxNumber && client.taxNumber.toLowerCase().includes(term)) ||
        (client.notes && client.notes.toLowerCase().includes(term))
      )
    })
    
    setFilteredClients(filtered)
  }, [searchTerm, clients])
  
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
                  <div className="h-3 w-2/3 rounded bg-muted"></div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }
  
  /**
   * Renders empty state with create client button
   */
  const renderEmptyState = () => {
    // Different message if no clients at all vs no search results
    const noResults = clients.length > 0 && filteredClients.length === 0
    
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center bg-muted/50">
        <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="text-xl">
          {noResults ? "No matching clients" : "No clients yet"}
        </CardTitle>
        <CardDescription className="max-w-sm mb-4">
          {noResults
            ? "Try a different search term or clear the search"
            : "Create your first client to get started with invoicing"}
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
            <Link href="/app/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading || clients.length === 0}
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
        
        {/* Add client button */}
        <Button asChild className="shrink-0">
          <Link href="/app/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>
      
      {/* Content section */}
      <div>
        {/* Loading state */}
        {isLoading && renderLoadingSkeleton()}
        
        {/* Empty state */}
        {!isLoading && filteredClients.length === 0 && renderEmptyState()}
        
        {/* Client list/grid */}
        {!isLoading && filteredClients.length > 0 && (
          <div className={cn(
            "grid gap-4",
            viewType === "grid" 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {filteredClients.map((client) => (
              <Link 
                key={client.id} 
                href={`/app/clients/${client.id}`}
                className="block transition-transform hover:scale-[1.01]"
              >
                <ClientCard client={client} viewOnly />
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Results count */}
      {!isLoading && clients.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredClients.length} of {clients.length} clients
        </p>
      )}
    </div>
  )
}