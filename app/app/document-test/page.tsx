// app/app/document-test/page.tsx
"use client"

import { generateDocumentAction } from "@/actions/document-actions"
import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { getDefaultTemplateAction } from "@/actions/db/templates-actions"
import { createInvoiceAction } from "@/actions/db/invoices-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"

export default function DocumentTestPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [documentUrl, setDocumentUrl] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  
  useEffect(() => {
    if (user?.id) {
      loadClients()
    }
  }, [user?.id])
  
  const loadClients = async () => {
    if (!user?.id) return
    
    try {
      const response = await getClientsByUserIdAction(user.id)
      
      if (response.isSuccess) {
        setClients(response.data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      })
    }
  }
  
  const createTestInvoice = async () => {
    if (!user?.id || !selectedClientId) return
    
    setIsCreating(true)
    
    try {
      // Get default template
      const templateResult = await getDefaultTemplateAction(user.id, "invoice")
      
      if (!templateResult.isSuccess) {
        toast({
          title: "Error",
          description: "No invoice template found",
          variant: "destructive"
        })
        return
      }
      
      // Create a test invoice
      const today = new Date()
      const dueDate = new Date(today)
      dueDate.setDate(today.getDate() + 30)
      
      const invoiceData = {
        userId: user.id,
        invoiceNumber: `INV-${Date.now()}`,
        clientId: selectedClientId,
        templateId: templateResult.data.id,
        issueDate: today,
        dueDate: dueDate,
        status: "draft" as const,
        subtotal: "100.00",
        taxAmount: "10.00",
        total: "110.00",
        notes: "This is a test invoice created for document generation testing."
      }
      
      const invoiceItems = [
        {
          invoiceId: "", // This will be set by the createInvoiceAction
          description: "Test Service",
          quantity: "1",
          unitPrice: "100.00",
          taxRate: "10",
          taxAmount: "10.00",
          subtotal: "100.00",
          total: "110.00"
        }
      ]
      
      const response = await createInvoiceAction(invoiceData, invoiceItems)
      
      if (response.isSuccess) {
        setInvoiceId(response.data.invoice.id)
        toast({
          title: "Success",
          description: "Test invoice created successfully",
        })
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating test invoice:", error)
      toast({
        title: "Error",
        description: "Failed to create test invoice",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }
  
  const generateDocument = async (format: 'pdf' | 'docx') => {
    if (!invoiceId) return
    
    setIsGenerating(true)
    
    try {
      const response = await generateDocumentAction("invoice", invoiceId, format)
      
      if (response.isSuccess) {
        setDocumentUrl(response.data.url)
        toast({
          title: "Success",
          description: `${format.toUpperCase()} generated successfully`,
        })
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
        description: `Failed to generate ${format.toUpperCase()}`,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Document Generation Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Create Test Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Client</label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={clients.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clients.length === 0 && (
              <p className="text-sm text-red-500">
                Please create a client first on the client test page
              </p>
            )}
          </div>
          
          <Button 
            onClick={createTestInvoice}
            disabled={isCreating || !selectedClientId}
          >
            {isCreating ? "Creating..." : "Create Test Invoice"}
          </Button>
        </CardContent>
      </Card>
      
      {invoiceId && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={() => generateDocument('pdf')}
                disabled={isGenerating}
              >
                Generate PDF
              </Button>
              
              <Button 
                onClick={() => generateDocument('docx')}
                disabled={isGenerating}
              >
                Generate DOCX
              </Button>
            </div>
            
            {documentUrl && (
              <div className="pt-4">
                <p className="mb-2 font-medium">Document generated:</p>
                <a 
                  href={documentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View Document
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}