/**
 * @file LLM Results component
 * @description 
 * This component displays the structured results from LLM processing.
 * It shows client information, document details, and line items in an organized layout.
 * 
 * Key features:
 * - Displays client details with confidence indicator
 * - Shows document information (dates, notes)
 * - Presents line items in a structured table
 * - Shows totals and calculations
 * - Highlights areas with low confidence that may need review
 * 
 * @dependencies
 * - Badge: For displaying confidence levels
 * - Separator: For visual separation of sections
 * - Card components: For structured display
 * 
 * @notes
 * - Displays information only, does not handle editing
 * - Uses color coding for confidence levels
 * - Formats currency and dates for readability
 */

"use client"

import { Badge } from "@/components/ui/badge"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableFooter, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { LLMParseResult } from "@/types"
import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react"

/**
 * Props for LLMResults component
 */
interface LLMResultsProps {
  result: LLMParseResult
  type: 'invoice' | 'quote'
}

/**
 * Component for displaying structured results from LLM processing
 * 
 * @param result - The parsed result from LLM
 * @param type - The type of document ('invoice' or 'quote')
 * @returns JSX element displaying structured LLM results
 */
export function LLMResults({ result, type }: LLMResultsProps) {
  // Format dates for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified"
    
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(date)
    } catch (error) {
      return dateString
    }
  }
  
  // Format currency for display
  const formatCurrency = (value?: string) => {
    if (!value) return "$0.00"
    
    try {
      const numberValue = parseFloat(value)
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(numberValue)
    } catch (error) {
      return value
    }
  }
  
  // Calculate totals for items
  const subtotal = result.items.reduce(
    (total, item) => total + (parseFloat(item.subtotal || "0") || 0), 
    0
  )
  
  const taxAmount = result.items.reduce(
    (total, item) => {
      const itemSubtotal = parseFloat(item.subtotal || "0") || 0
      const itemTotal = parseFloat(item.total || "0") || 0
      return total + (itemTotal - itemSubtotal)
    }, 
    0
  )
  
  // Helper to get badge color based on confidence
  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'high':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            High Confidence
          </Badge>
        )
      case 'medium':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <HelpCircle className="mr-1 h-3 w-3" />
            Medium Confidence
          </Badge>
        )
      case 'low':
      default:
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Low Confidence
          </Badge>
        )
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Client Information</CardTitle>
            {getConfidenceBadge(result.client.confidence)}
          </div>
          <CardDescription>
            Review the identified client details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="text-sm font-semibold">{result.client.name || "Not specified"}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="text-sm">{result.client.email || "Not specified"}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
              <dd className="text-sm">{result.client.phone || "Not specified"}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Tax Number</dt>
              <dd className="text-sm">{result.client.taxNumber || "Not specified"}</dd>
            </div>
            
            {result.client.address && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                <dd className="text-sm">{result.client.address}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
      
      {/* Document Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Details</CardTitle>
          <CardDescription>
            Review the {type === 'invoice' ? 'invoice' : 'quote'} details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Issue Date</dt>
              <dd className="text-sm">{formatDate(result.document.issueDate)}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {type === 'invoice' ? 'Due Date' : 'Valid Until'}
              </dt>
              <dd className="text-sm">
                {formatDate(type === 'invoice' 
                  ? result.document.dueDate 
                  : result.document.validUntil)}
              </dd>
            </div>
            
            {result.document.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{result.document.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
      
      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
          <CardDescription>
            Review the identified products and services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Tax Rate</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{item.taxRate ? `${item.taxRate}%` : "0%"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.total || 
                      (parseFloat(item.quantity || "1") * parseFloat(item.unitPrice || "0")).toString())}
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
              {result.document.discount && parseFloat(result.document.discount) > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-right">Discount</TableCell>
                  <TableCell className="text-right">-{formatCurrency(result.document.discount)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency((subtotal + taxAmount - (parseFloat(result.document.discount || "0") || 0)).toString())}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
      
      {/* Clarification needed warning */}
      {result.needsClarification && (
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
    </div>
  )
}