/**

@file Quote list component
@description
This component displays a list of quotes with searching and filtering capabilities.
Used in the quote management pages for browsing and managing quotes.

Key features:
Display quotes in a list view
Search/filter functionality by quote number, client, and status
Status badges with appropriate colors

Empty state handling
Loading state visualization
@dependencies
ShadCN UI: For input, card, and other UI components
SelectQuote: Type from db schema
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
import { SelectQuote } from "@/db/schema"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/llm/utils"
import {
Search, MoreVertical, Download, Edit, Trash,
Copy, ArrowUpDown, FileText, Filter, Plus
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
/**

Extended quote interface with client name
*/
interface QuoteWithClient extends SelectQuote {
  clientName?: string;
}

/**

Props for the QuoteList component
*/
interface QuoteListProps {
quotes: QuoteWithClient[]
isLoading?: boolean
className?: string
}

/**

List component for displaying and searching quotes

@param quotes - Array of quote data to display
@param isLoading - Whether the data is still loading
@param className - Optional additional CSS classes
*/
export default function QuoteList({
quotes,
isLoading = false,
className
}: QuoteListProps): React.ReactElement {
const router = useRouter()

// State for search term and filtered quotes
const [searchTerm, setSearchTerm] = useState("")
const [filteredQuotes, setFilteredQuotes] = useState<QuoteWithClient[]>(quotes)
const [statusFilter, setStatusFilter] = useState<string | null>(null)
// State for sorting
const [sortField, setSortField] = useState<keyof SelectQuote>("issueDate")
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
/**

Filter and sort quotes when dependencies change
*/
useEffect(() => {
let result = [...quotes]

// Apply search filter if search term exists
if (searchTerm) {
  const lowerCaseSearch = searchTerm.toLowerCase()
  result = result.filter(quote => 
    quote.quoteNumber.toLowerCase().includes(lowerCaseSearch) ||
    (quote.clientName && quote.clientName.toLowerCase().includes(lowerCaseSearch))
  )
}

// Apply status filter if selected
if (statusFilter) {
  result = result.filter(quote => quote.status === statusFilter)
}

// Apply sorting
result.sort((a, b) => {
  let aValue: any = a[sortField]
  let bValue: any = b[sortField]
  
  // Handle dates
  if (typeof aValue === 'string' && 
      (sortField === 'issueDate' || sortField === 'validUntil')) {
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

setFilteredQuotes(result)
}, [quotes, searchTerm, statusFilter, sortField, sortDirection])
/**

Handle sort toggle
@param field The field to sort by
*/
const toggleSort = (field: keyof SelectQuote) => {
if (field === sortField) {
setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
} else {
setSortField(field)
setSortDirection('asc')
}
}

/**

Render status badge with appropriate color
@param status Quote status
*/
const renderStatusBadge = (status: string) => {
const statusStyles: Record<string, string> = {
draft: "bg-gray-200 text-gray-800",
sent: "bg-blue-100 text-blue-800",
accepted: "bg-green-100 text-green-800",
rejected: "bg-red-100 text-red-800",
expired: "bg-amber-100 text-amber-800"
}

return (
  <Badge className={statusStyles[status] || ""}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
)
}
/**

Format date for display
@param dateString Date string to format
*/
const formatDate = (dateString: string) => {
return new Date(dateString).toLocaleDateString()
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
placeholder="Search quotes..."
className="pl-8"
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
disabled={isLoading || quotes.length === 0}
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
        <DropdownMenuItem onClick={() => setStatusFilter("accepted")}>
          Accepted
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>
          Rejected
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatusFilter("expired")}>
          Expired
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Create quote button */}
    <Button asChild className="shrink-0 bg-blue-500 hover:bg-blue-600">
      <Link href="/app/quotes/new">
        <Plus className="mr-2 h-4 w-4" />
        New Quote
      </Link>
    </Button>
  </div>

  {/* Loading state */}
  {isLoading && renderLoadingSkeleton()}

  {/* Empty state */}
  {!isLoading && filteredQuotes.length === 0 && (
    <div className="text-center p-8 border rounded-md">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">No matching quotes</h3>
      <p className="text-muted-foreground mt-2">
        {searchTerm || statusFilter 
          ? "Try adjusting your search or filters" 
          : "Create your first quote to get started"}
      </p>
    </div>
  )}

  {/* Quotes table */}
  {!isLoading && filteredQuotes.length > 0 && (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">
              <div 
                className="flex items-center cursor-pointer"
                onClick={() => toggleSort("quoteNumber")}
              >
                Quote #
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
                onClick={() => toggleSort("validUntil")}
              >
                Valid Until
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
          {filteredQuotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="font-medium">
                <Link 
                  href={`/app/quotes/${quote.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {quote.quoteNumber}
                </Link>
              </TableCell>
              <TableCell>{quote.clientName || "No client"}</TableCell>
              <TableCell>{formatDate(quote.issueDate.toString())}</TableCell>
              <TableCell>{formatDate(quote.validUntil.toString())}</TableCell>
              <TableCell>{formatCurrency(quote.total)}</TableCell>
              <TableCell>{renderStatusBadge(quote.status)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => router.push(`/app/quotes/${quote.id}`)}
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
  {!isLoading && quotes.length > 0 && (
    <p className="text-sm text-muted-foreground">
      Showing {filteredQuotes.length} of {quotes.length} quotes
    </p>
  )}
</div>
)
}