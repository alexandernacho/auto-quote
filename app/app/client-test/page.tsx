// app/app/client-test/page.tsx
"use client"

import { createClientAction, getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"
import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"

export default function ClientTestPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  
  // Load clients when the component mounts
  useEffect(() => {
    if (user?.id) {
      loadClients()
    }
  }, [user?.id])
  
  const loadClients = async () => {
    if (!user?.id) return
    
    setIsLoadingClients(true)
    
    try {
      const response = await getClientsByUserIdAction(user.id)
      
      if (response.isSuccess) {
        setClients(response.data)
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      })
    } finally {
      setIsLoadingClients(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !name) return
    
    setIsLoading(true)
    
    try {
      const response = await createClientAction({
        userId: user.id,
        name,
        email: email || undefined
      })
      
      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Client created successfully",
        })
        setName("")
        setEmail("")
        // Reload the clients list
        loadClients()
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Client Management Test</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Client Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Client"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Clients List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <p>Loading clients...</p>
            ) : clients.length > 0 ? (
              <ul className="space-y-2">
                {clients.map((client) => (
                  <li key={client.id} className="p-2 border rounded">
                    <p className="font-medium">{client.name}</p>
                    {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No clients found</p>
            )}
            
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={loadClients}
              disabled={isLoadingClients}
            >
              Refresh List
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}