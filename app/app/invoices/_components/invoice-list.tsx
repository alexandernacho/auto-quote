/**

@file Invoice list component
@description
This component displays a list of invoices with searching and filtering capabilities.
Used in the invoice management pages for browsing and managing invoices.

Key features:


Display invoices in a list or grid view




Search/filter functionality by invoice number, client, and status




Status badges with appropriate colors




Empty state handling




Loading state visualization



@dependencies


ShadCN UI: For input, card, and other UI components




SelectInvoice: Type from db schema



@notes


Client-side component to allow for interactive features




Implements filtering without server trips




Shows appropriate feedback for empty states
*/



"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
Table, TableBody, TableCell, TableHead,
TableHeader, TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
DropdownMenu, DropdownMenuTrigger,
DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { SelectInvoice } from "@/db/schema"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/llm/utils"
import {
Search, MoreVertical, Download, Edit, Trash,
Copy, ArrowUpDown, Receipt, Filter, Plus
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
/**

Props for the InvoiceList component
*/
interface InvoiceWithClient extends SelectInvoice {
  clientName?: string;
}

interface InvoiceListProps {
  invoices: InvoiceWithClient[]
  isLoading?: boolean
  className?: string
}

/**

List component for displaying and searching invoices

@param invoices - Array of invoice data to display
@param isLoading - Whether the data is still loading
@param className - Optional additional CSS classes
*/
export default function InvoiceList({
invoices,
isLoading = false,
className
}: InvoiceListProps) {
const router = useRouter()

// State for search term and filtered invoices
const [searchTerm, setSearchTerm] = useState("")
const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithClient[]>(invoices)
const [statusFilter, setStatusFilter] = useState<string | null>(null)
// State for sorting
const [sortField, setSortField] = useState<keyof SelectInvoice>("issueDate")
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
/**

Filter and sort invoices when dependencies change
*/
useEffect(() => {
let result = [...invoices]

// Apply search filter if search term exists
if (searchTerm) {
  const lowerCaseSearch = searchTerm.toLowerCase()
  result = result.filter(invoice => 
    invoice.invoiceNumber.toLowerCase().includes(lowerCaseSearch) ||
    (invoice.clientName && invoice.clientName.toLowerCase().includes(lowerCaseSearch))
  )
}

// Apply status filter if selected
if (statusFilter) {
  result = result.filter(invoice => invoice.status === statusFilter)
}

// Apply sorting
result.sort((a, b) => {
  let aValue: any = a[sortField]
  let bValue: any = b[sortField]
  
  // Handle dates
  if (typeof aValue === 'string' && 
      (sortField === 'issueDate' || sortField === 'dueDate')) {
    aValue = new Date(aValue).getTime()
    bValue = new Date(bValue).getTime()
  }
  
  // Handle numeric strings
  if (sortField === 'total' || sortField === 'subtotal') {
    aValue = parseFloat(aValue || '0')
    bValue = parseFloat(bValue || '0')
  }
  
  if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
  if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
  return 0
})

setFilteredInvoices(result)
}, [invoices, searchTerm, statusFilter, sortField, sortDirection])
/**

Handle sort toggle
@param field The field to sort by
*/
const toggleSort = (field: keyof SelectInvoice) => {
if (field === sortField) {
setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
} else {
setSortField(field)
setSortDirection('asc')
}
}

/**

Format date for display
@param dateString Date string to format
*/
const formatDate = (dateString: string) => {
return new Date(dateString).toLocaleDateString()
}

/**

Render status badge with appropriate color
@param status Invoice status
*/
const renderStatusBadge = (status: string) => {
const statusStyles: Record<string, string> = {
draft: "bg-gray-200 text-gray-800",
sent: "bg-blue-100 text-blue-800",
paid: "bg-green-100 text-green-800",
overdue: "bg-red-100 text-red-800",
canceled: "bg-gray-100 text-gray-800"
}

return (
  <Badge className={statusStyles[status] || ""}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
)
}
/**

Creates loading skeleton UI
*/
const renderLoadingSkeleton = () => {
return (
 <div className="animate-pulse">
   <div className="h-10 w-full bg-muted rounded mb-4"></div>
   <div className="space-y-2">
     {Array(5).fill(0).map((_, i) => (
       <div key={i} className="h-16 w-full bg-muted rounded"></div>
     ))}
   </div>
 </div>
)
}
return (
<div className={cn("space-y-4", className)}>
{/* Search and filter controls */}
<div className="flex flex-wrap gap-3">
<div className="relative flex-1 min-w-[200px]">
<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
<Input
placeholder="Search invoices..."
className="pl-8"
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
disabled={isLoading || invoices.length === 0}
/>
{searchTerm && (
<Button
variant="ghost"
size="sm"
className="absolute right-0 top-0 h-9 w-9 px-0"
onClick={() => setSearchTerm("")}
disabled={isLoading}
>
×
</Button>
)}
</div>

{/* Status filter dropdown */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="gap-1">
      <Filter className="h-4 w-4" />
      {statusFilter ? (
        <span>{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
      ) : (
        <span>All Statuses</span>
      )}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setStatusFilter(null)}>
      All Statuses
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setStatusFilter("draft")}>
      Draft
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setStatusFilter("sent")}>
      Sent
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setStatusFilter("paid")}>
      Paid
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setStatusFilter("overdue")}>
      Overdue
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setStatusFilter("canceled")}>
      Canceled
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

{/* Create invoice button */}
<Button asChild className="shrink-0 bg-blue-500 hover:bg-blue-600">
  <Link href="/app/invoices/new">
    <Plus className="mr-2 h-4 w-4" />
    New Invoice
  </Link>
</Button>
</div>

{/* Loading state */}
{isLoading && renderLoadingSkeleton()}

{/* Empty state */}
{!isLoading && filteredInvoices.length === 0 && (
  <div className="text-center p-8 border rounded-md">
    <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold">No matching invoices</h3>
    <p className="text-muted-foreground mt-2">
      {searchTerm || statusFilter 
        ? "Try adjusting your search or filters" 
        : "Create your first invoice to get started"}
    </p>
  </div>
)}

{/* Invoices table */}
{!isLoading && filteredInvoices.length > 0 && (
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("invoiceNumber")}
            >
              Invoice #
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead>
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("clientId")}
            >
              Client
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead>
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("issueDate")}
            >
              Issue Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead>
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("dueDate")}
            >
              Due Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead>
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("total")}
            >
              Amount
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead>
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("status")}
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          </TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredInvoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              <Link 
                href={`/app/invoices/${invoice.id}`}
                className="text-blue-600 hover:underline"
              >
                {invoice.invoiceNumber}
              </Link>
            </TableCell>
            <TableCell>{invoice.clientName || "No client"}</TableCell>
            <TableCell>{formatDate(invoice.issueDate.toString())}</TableCell>
            <TableCell>{formatDate(invoice.dueDate.toString())}</TableCell>
            <TableCell>{formatCurrency(invoice.total)}</TableCell>
            <TableCell>{renderStatusBadge(invoice.status)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => router.push(`/app/invoices/${invoice.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    View/Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)}

{/* Results count */}
{!isLoading && invoices.length > 0 && (
  <p className="text-sm text-muted-foreground">
    Showing {filteredInvoices.length} of {invoices.length} invoices
  </p>
)}
</div>
)
}