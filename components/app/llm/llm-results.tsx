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
 *
 * @dependencies
 * - UI components: Badge, Card, Table
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfidenceLevel, DocumentType, LLMParseResult } from "@/types"
import { formatCurrency, formatDate } from "@/lib/llm/utils"
import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react"

/**
 * Props for LLMResults component
 */
interface LLMResultsProps {
  result: LLMParseResult
  type: DocumentType
}

/**
 * Component to display structured results from LLM parsing
 *
 * @param result - The parsed LLM result data
 * @param type - The type of document ('invoice' or 'quote')
 * @returns JSX element displaying the parsed results
 */
export function LLMResults({ result, type }: LLMResultsProps) {
  // Calculate totals
  const subtotal = result.items.reduce((total, item) => total + (parseFloat(item.subtotal || "0") || 0), 0)
  const taxAmount = result.items.reduce((total, item) => {
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

  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Client Information</CardTitle>
            {getConfidenceBadge(result.client.confidence as ConfidenceLevel)}
          </div>
          <CardDescription>Review the identified client details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              { label: "Name", value: result.client.name },
              { label: "Email", value: result.client.email },
              { label: "Phone", value: result.client.phone },
              { label: "Tax Number", value: result.client.taxNumber }
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold">{value || "Not specified"}</dd>
              </div>
            ))}
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
          <CardDescription>Review the {type === 'invoice' ? 'invoice' : 'quote'} details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Issue Date</dt>
              <dd className="text-sm">{formatDate(result.document.issueDate || new Date())}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {type === 'invoice' ? 'Due Date' : 'Valid Until'}
              </dt>
              <dd className="text-sm">
                {formatDate(type === 'invoice' 
                  ? result.document.dueDate || new Date(Date.now() + 30*24*60*60*1000) 
                  : result.document.validUntil || new Date(Date.now() + 30*24*60*60*1000)
                )}
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
          <CardDescription>Review the identified products and services</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Description", "Quantity", "Unit Price", "Tax Rate", "Total"].map((header, i) => (
                  <TableHead key={header} className={i > 0 ? "text-right" : ""}>
                    {header}
                  </TableHead>
                ))}
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
                    {formatCurrency(item.total || (parseFloat(item.quantity || "1") * parseFloat(item.unitPrice || "0")).toString())}
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