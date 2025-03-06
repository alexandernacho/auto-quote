/**
 * @file Client selector component
 * @description 
 * This component enables users to select an existing client or create a new one.
 * Used in invoice and quote creation pages for assigning clients.
 * 
 * Key features:
 * - Search existing clients by name, email, etc.
 * - Create new client from within the selector
 * - Display suggested client from LLM parsing
 * - Handle confidence levels for suggested clients
 * 
 * @dependencies
 * - ShadCN UI: For command menu, dialog, and other UI components
 * - Client Form: For creating new clients
 * - Server actions: For fetching clients
 * 
 * @notes
 * - Client-side component to allow for interactive features
 * - Uses a dialog for client creation to keep a seamless workflow
 * - Implements client search with filtering
 */

"use client"

import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { ClientForm } from "@/components/app/client-form"
import { Badge } from "@/components/ui/badge"
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
import { LLMExtractedClient } from "@/types/llm-types"
import { SelectClient } from "@/db/schema"
import { CheckCircle2, ChevronsUpDown, PlusCircle, User2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"

/**
 * Props for the ClientSelector component
 */
interface ClientSelectorProps {
  selectedClientId: string | null
  onClientSelect: (clientId: string) => void
  suggestedClient?: Partial<LLMExtractedClient>
  disabled?: boolean
}

/**
 * Component for selecting or creating clients
 * 
 * @param selectedClientId - The currently selected client ID (if any)
 * @param onClientSelect - Callback function when a client is selected
 * @param suggestedClient - Optional LLM-suggested client data
 * @param disabled - Whether the component is disabled
 */
export function ClientSelector({
  selectedClientId,
  onClientSelect,
  suggestedClient,
  disabled = false
}: ClientSelectorProps) {
  // State for UI controls
  const [open, setOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // State for data
  const [clients, setClients] = useState<SelectClient[]>([])
  const [selectedClient, setSelectedClient] = useState<SelectClient | null>(null)
  
  // Get userId from auth
  const { userId } = useAuth()
  const { toast } = useToast()
  
  /**
   * Load clients and set the selected client if there's a selectedClientId
   */
  useEffect(() => {
    async function loadClients() {
      if (!userId) return
      
      setIsLoading(true)
      try {
        const result = await getClientsByUserIdAction(userId)
        
        if (result.isSuccess) {
          setClients(result.data)
          
          // If there's a selectedClientId, find and set the corresponding client
          if (selectedClientId) {
            const selectedClient = result.data.find(
              client => client.id === selectedClientId
            )
            setSelectedClient(selectedClient || null)
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load clients",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("Error loading clients:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading clients",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadClients()
  }, [userId, selectedClientId, toast])
  
  /**
   * Handle client selection
   */
  const handleSelectClient = (client: SelectClient) => {
    setSelectedClient(client)
    onClientSelect(client.id)
    setOpen(false)
  }
  
  /**
   * Handle successful client creation
   */
  const handleClientCreated = (client: SelectClient) => {
    // Add the new client to the list
    setClients(prevClients => [client, ...prevClients])
    
    // Select the newly created client
    setSelectedClient(client)
    onClientSelect(client.id)
    
    // Close the create dialog
    setCreateDialogOpen(false)
    
    toast({
      title: "Client created",
      description: `${client.name} has been added to your clients`,
    })
  }
  
  /**
   * Get confidence badge based on LLM confidence level
   */
  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence) return null
    
    switch (confidence) {
      case "high":
        return (
          <Badge className="ml-2 bg-green-500 hover:bg-green-600">
            High match
          </Badge>
        )
      case "medium":
        return (
          <Badge className="ml-2 bg-yellow-500 hover:bg-yellow-600">
            Possible match
          </Badge>
        )
      case "low":
        return (
          <Badge className="ml-2 bg-red-500 hover:bg-red-600">
            Low confidence
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Client
      </label>
      
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
              ) : selectedClient ? (
                selectedClient.name
              ) : (
                "Select client"
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>
                  No client found. Try a different search or create a new client.
                </CommandEmpty>
                
                {/* Suggested client from LLM - if provided */}
                {suggestedClient?.name && !isLoading && (
                  <CommandGroup heading="Suggested Client">
                    <CommandItem
                      className="flex items-center justify-between gap-2"
                      value={`suggested-${suggestedClient.name}`}
                      onSelect={() => {
                        // Open create dialog with pre-filled data
                        setCreateDialogOpen(true)
                        setOpen(false)
                      }}
                    >
                      <div className="flex items-center">
                        <User2 className="mr-2 h-4 w-4" />
                        <span>{suggestedClient.name}</span>
                        {getConfidenceBadge(suggestedClient.confidence)}
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}
                
                {/* Existing clients */}
                <CommandGroup heading="Your Clients">
                  {clients.map(client => (
                    <CommandItem
                      key={client.id}
                      value={`${client.id}-${client.name}`}
                      onSelect={() => handleSelectClient(client)}
                    >
                      <div className="flex items-center">
                        {client.id === selectedClientId && (
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        )}
                        {client.id !== selectedClientId && (
                          <User2 className="mr-2 h-4 w-4" />
                        )}
                        <span>{client.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                
                {/* Create new client option */}
                <CommandGroup heading="Actions">
                  <CommandItem
                    onSelect={() => {
                      setCreateDialogOpen(true)
                      setOpen(false)
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create new client
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
              <DialogTitle>Create New Client</DialogTitle>
              <DialogDescription>
                Add a new client to your contacts. They will be available for selection in invoices and quotes.
              </DialogDescription>
            </DialogHeader>
            
            {userId && (
              <ClientForm
                userId={userId}
                onSuccess={handleClientCreated}
                // Pre-fill form with suggested client data if available
                client={
                  suggestedClient?.name
                    ? {
                        id: "",  // Will be ignored for new client
                        userId,
                        name: suggestedClient.name,
                        email: suggestedClient.email || "",
                        phone: suggestedClient.phone || "",
                        address: suggestedClient.address || "",
                        taxNumber: suggestedClient.taxNumber || "",
                        notes: "",
                        createdAt: new Date(),
                        updatedAt: new Date()
                      }
                    : undefined
                }
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Helpful message if a suggested client is present */}
      {suggestedClient?.name && !selectedClient && (
        <p className="text-sm text-muted-foreground">
          Suggested client: <strong>{suggestedClient.name}</strong>. Select from the list or create new.
        </p>
      )}
    </div>
  )
}