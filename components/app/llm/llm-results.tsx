/**
 * @file LLM Results component
 * @description
 * This component displays the parsed results from the LLM processing.
 * It shows structured data extracted from unstructured text in a user-friendly format.
 *
 * Key features:
 * - Displays client information with confidence indicators
 * - Shows document details like dates and notes
 * - Presents line items in a formatted table
 * - Calculates and displays totals
 * - Provides visual indicators for confidence levels
 * - Allows editing of extracted data
 * - Provides a button to generate the final document
 *
 * @dependencies
 * - UI components: Badge, Card, Table, Button
 * - lucide-react: For icons
 * - LLMParseResult: Type definition for parsed result
 * - ConfidenceLevel: Type for confidence levels
 *
 * @notes
 * - Client component for interactive elements
 * - Uses helper functions for formatting currency and dates
 * - Includes tooltips for additional information
 */

"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfidenceLevel, DocumentType, LLMParseResult } from "@/types"
import { formatCurrency, formatDate } from "@/lib/llm/utils"
import { AlertTriangle, CheckCircle, Edit, HelpCircle, Save } from "lucide-react"
import { useState } from "react"

/**
 * Props for LLMResults component
 */
interface LLMResultsProps {
  result: LLMParseResult
  type: DocumentType
  onGenerate?: (result: LLMParseResult) => void
}

/**
 * Component to display structured results from LLM parsing
 *
 * @param result - The parsed LLM result data
 * @param type - The type of document ('invoice' or 'quote')
 * @param onGenerate - Callback function when the generate button is clicked
 * @returns JSX element displaying the parsed results
 */
export function LLMResults({ result, type, onGenerate }: LLMResultsProps) {
  // State for edited result
  const [editedResult, setEditedResult] = useState<LLMParseResult>(result)
  // State for editing mode
  const [isEditing, setIsEditing] = useState(false)
  
  // Calculate totals
  const subtotal = editedResult.items.reduce((total, item) => total + (parseFloat(item.subtotal || "0") || 0), 0)
  const taxAmount = editedResult.items.reduce((total, item) => {
    const itemSubtotal = parseFloat(item.subtotal || "0") || 0
    const itemTotal = parseFloat(item.total || "0") || 0
    return total + (itemTotal - itemSubtotal)
  }, 0)

  /**
   * Get confidence badge by level
   * @param confidence - Confidence level string
   * @returns Badge JSX element with appropriate styling
   */
  const getConfidenceBadge = (confidence?: ConfidenceLevel) => {
    const badges = {
      high: { bg: "bg-green-100", text: "text-green-800", icon: <CheckCircle className="mr-1 h-3 w-3" />, label: "High Confidence" },
      medium: { bg: "bg-yellow-100", text: "text-yellow-800", icon: <HelpCircle className="mr-1 h-3 w-3" />, label: "Medium Confidence" },
      low: { bg: "bg-red-100", text: "text-red-800", icon: <AlertTriangle className="mr-1 h-3 w-3" />, label: "Low Confidence" }
    }
    const level = (confidence && confidence in badges) ? confidence : "low"
    const { bg, text, icon, label } = badges[level as keyof typeof badges]
    return <Badge className={`${bg} ${text} hover:${bg}`}>{icon}{label}</Badge>
  }
  
  /**
   * Handle client field changes
   * @param field - The field to update
   * @param value - The new value
   */
  const handleClientChange = (field: keyof typeof editedResult.client, value: string) => {
    setEditedResult(prev => ({
      ...prev,
      client: {
        ...prev.client,
        [field]: value
      }
    }))
  }
  
  /**
   * Handle document field changes
   * @param field - The field to update
   * @param value - The new value
   */
  const handleDocumentChange = (field: keyof typeof editedResult.document, value: string) => {
    setEditedResult(prev => ({
      ...prev,
      document: {
        ...prev.document,
        [field]: value
      }
    }))
  }
  
  /**
   * Handle item field changes
   * @param index - The index of the item to update
   * @param field - The field to update
   * @param value - The new value
   */
  const handleItemChange = (index: number, field: keyof typeof editedResult.items[0], value: string) => {
    setEditedResult(prev => {
      const newItems = [...prev.items]
      newItems[index] = {
        ...newItems[index],
        [field]: value
      }
      
      // Recalculate totals if quantity, unitPrice, or taxRate changes
      if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
        const quantity = parseFloat(newItems[index].quantity) || 0
        const unitPrice = parseFloat(newItems[index].unitPrice) || 0
        const taxRate = parseFloat(newItems[index].taxRate || "0") || 0
        
        const subtotal = (quantity * unitPrice).toFixed(2)
        const taxAmount = (quantity * unitPrice * taxRate / 100).toFixed(2)
        const total = (parseFloat(subtotal) + parseFloat(taxAmount)).toFixed(2)
        
        newItems[index].subtotal = subtotal
        newItems[index].taxAmount = taxAmount
        newItems[index].total = total
      }
      
      return {
        ...prev,
        items: newItems
      }
    })
  }
  
  /**
   * Toggle editing mode
   */
  const toggleEditing = () => {
    setIsEditing(!isEditing)
  }
  
  /**
   * Handle generate button click
   */
  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate(editedResult)
    }
  }

  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Client Information</CardTitle>
            {getConfidenceBadge(editedResult.client.confidence as ConfidenceLevel)}
          </div>
          <CardDescription>Review the identified client details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              { label: "Name", value: editedResult.client.name, field: "name" as const },
              { label: "Email", value: editedResult.client.email, field: "email" as const },
              { label: "Phone", value: editedResult.client.phone, field: "phone" as const },
              { label: "Tax Number", value: editedResult.client.taxNumber, field: "taxNumber" as const }
            ].map(({ label, value, field }) => (
              <div key={label}>
                <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                {isEditing ? (
                  <Input 
                    value={value || ""} 
                    onChange={(e) => handleClientChange(field, e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <dd className="text-sm font-semibold">{value || "Not specified"}</dd>
                )}
              </div>
            ))}
            {editedResult.client.address && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                {isEditing ? (
                  <Textarea 
                    value={editedResult.client.address} 
                    onChange={(e) => handleClientChange("address", e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <dd className="text-sm">{editedResult.client.address}</dd>
                )}
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Document Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Details</CardTitle>
          <CardDescription>Review the {type === 'invoice' ? 'invoice' : 'quote'} details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Issue Date</dt>
              {isEditing ? (
                <Input 
                  type="date" 
                  value={editedResult.document.issueDate ? new Date(editedResult.document.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
                  onChange={(e) => handleDocumentChange("issueDate", new Date(e.target.value).toISOString())}
                  className="mt-1"
                />
              ) : (
                <dd className="text-sm">{formatDate(editedResult.document.issueDate || new Date())}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {type === 'invoice' ? 'Due Date' : 'Valid Until'}
              </dt>
              {isEditing ? (
                <Input 
                  type="date" 
                  value={
                    type === 'invoice' 
                      ? (editedResult.document.dueDate ? new Date(editedResult.document.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0])
                      : (editedResult.document.validUntil ? new Date(editedResult.document.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0])
                  } 
                  onChange={(e) => handleDocumentChange(
                    type === 'invoice' ? "dueDate" : "validUntil", 
                    new Date(e.target.value).toISOString()
                  )}
                  className="mt-1"
                />
              ) : (
                <dd className="text-sm">
                  {formatDate(type === 'invoice' 
                    ? editedResult.document.dueDate || new Date(Date.now() + 30*24*60*60*1000) 
                    : editedResult.document.validUntil || new Date(Date.now() + 30*24*60*60*1000)
                  )}
                </dd>
              )}
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
              {isEditing ? (
                <Textarea 
                  value={editedResult.document.notes || ""} 
                  onChange={(e) => handleDocumentChange("notes", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <dd className="text-sm whitespace-pre-wrap">{editedResult.document.notes || "No notes"}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Discount</dt>
              {isEditing ? (
                <Input 
                  type="number" 
                  value={editedResult.document.discount || "0"} 
                  onChange={(e) => handleDocumentChange("discount", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <dd className="text-sm">{formatCurrency(editedResult.document.discount || "0")}</dd>
              )}
            </div>
          </dl>
        </CardContent>
      </Card>
      
      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
          <CardDescription>Review the identified products and services</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Tax Rate</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedResult.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        value={item.description} 
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      />
                    ) : (
                      item.description
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      />
                    ) : (
                      item.quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={item.unitPrice} 
                        onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                      />
                    ) : (
                      formatCurrency(item.unitPrice)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={item.taxRate || "0"} 
                        onChange={(e) => handleItemChange(index, "taxRate", e.target.value)}
                      />
                    ) : (
                      `${item.taxRate || "0"}%`
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.total || (parseFloat(item.subtotal || "0") + parseFloat(item.taxAmount || "0")).toString())}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right">Subtotal</TableCell>
                <TableCell className="text-right">{formatCurrency(subtotal.toString())}</TableCell>
              </TableRow>
              {taxAmount > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-right">Tax</TableCell>
                  <TableCell className="text-right">{formatCurrency(taxAmount.toString())}</TableCell>
                </TableRow>
              )}
              {editedResult.document.discount && parseFloat(editedResult.document.discount) > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-right">Discount</TableCell>
                  <TableCell className="text-right">-{formatCurrency(editedResult.document.discount)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency((subtotal + taxAmount - (parseFloat(editedResult.document.discount || "0") || 0)).toString())}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
      
      {/* Clarification needed warning */}
      {editedResult.needsClarification && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center space-x-2 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <AlertTriangle className="h-5 w-5" />
                <p>Some details may need clarification</p>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>The AI has detected some ambiguity in the provided information and may need additional clarification for the most accurate results.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={toggleEditing}
          className="flex items-center gap-2"
        >
          {isEditing ? (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          ) : (
            <>
              <Edit className="h-4 w-4" />
              Edit Details
            </>
          )}
        </Button>
        
        <Button 
          onClick={handleGenerate}
          className="flex items-center gap-2"
        >
          Generate {type === 'invoice' ? 'Invoice' : 'Quote'}
        </Button>
      </div>
    </div>
  )
}