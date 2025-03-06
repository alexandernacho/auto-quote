/**
 * @file Dashboard page component
 * @description 
 * Main dashboard for the application showing key metrics and navigation to main areas.
 * Provides an overview of the user's activity and quick access to important features.
 * 
 * Key features:
 * - Shows key metrics (invoices, quotes, clients)
 * - Provides quick access links to main functionality
 * - Displays user profile information
 * - Shows recent activity
 * 
 * @dependencies
 * - auth: For retrieving the authenticated user
 * - getProfileByUserIdAction: For fetching user profile data
 * - getInvoicesByUserIdAction: For fetching recent invoices
 * - getQuotesByUserIdAction: For fetching recent quotes
 * - getClientsByUserIdAction: For fetching recent clients
 * 
 * @notes
 * - Server component for initial data loading
 * - Uses card components to organize dashboard sections
 * - Implements responsive grid layout for different screen sizes
 */

"use server"

import { getClientsByUserIdAction } from "@/actions/db/clients-actions"
import { getInvoicesByUserIdAction } from "@/actions/db/invoices-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { getQuotesByUserIdAction } from "@/actions/db/quotes-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SelectClient, SelectInvoice, SelectQuote } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { CheckCircle, Clock, FileText, Plus, Receipt, Users } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

/**
 * Dashboard page component
 * Shows overview data and quick access links to main app functionality
 * 
 * @returns JSX component for the dashboard page
 */
export default async function DashboardPage() {
  // Get authenticated user
  const { userId } = await auth()
  
  if (!userId) {
    return redirect("/login")
  }
  
  // Fetch user profile and data for dashboard
  const profileResult = await getProfileByUserIdAction(userId)
  const invoicesResult = await getInvoicesByUserIdAction(userId)
  const quotesResult = await getQuotesByUserIdAction(userId)
  const clientsResult = await getClientsByUserIdAction(userId)
  
  // Get data from results if available
  const profile = profileResult.isSuccess ? profileResult.data : null
  const invoices = invoicesResult.isSuccess ? invoicesResult.data : []
  const quotes = quotesResult.isSuccess ? quotesResult.data : []
  const clients = clientsResult.isSuccess ? clientsResult.data : []
  
  // Count statistics
  const draftInvoices = invoices.filter(invoice => invoice.status === "draft").length
  const paidInvoices = invoices.filter(invoice => invoice.status === "paid").length
  const pendingQuotes = quotes.filter(quote => quote.status === "sent").length
  
  // Format currency from string to readable format
  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value) || 0
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numValue)
  }
  
  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.total || "0"), 0)
  const totalPaid = invoices
    .filter(invoice => invoice.status === "paid")
    .reduce((sum, invoice) => sum + parseFloat(invoice.total || "0"), 0)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="flex space-x-2">
          <Button asChild className="bg-blue-500 hover:bg-blue-600">
            <Link href="/app/invoices/new">
              <Receipt className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/quotes/new">
              <FileText className="mr-2 h-4 w-4" />
              New Quote
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Show membership banner for free users */}
      {profile && profile.membership === "free" && (
        <Card className="bg-gradient-to-r from-blue-500 to-purple-500">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2 text-white sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <h3 className="text-xl font-bold">Free Plan</h3>
                <p>Upgrade to Pro for unlimited invoices, custom templates, and more.</p>
              </div>
              <Button className="mt-3 bg-white text-blue-600 hover:bg-gray-100 sm:mt-0" asChild>
                <Link href="/pricing">Upgrade Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Invoices"
          value={formatCurrency(totalInvoiced.toString())}
          description={`${invoices.length} Total`}
          icon={<Receipt className="h-5 w-5" />}
          linkHref="/app/invoices"
        />
        
        <StatCard 
          title="Paid"
          value={formatCurrency(totalPaid.toString())}
          description={`${paidInvoices} Invoices`}
          icon={<CheckCircle className="h-5 w-5" />}
          linkHref="/app/invoices?status=paid"
          className="bg-green-50 dark:bg-green-950"
        />
        
        <StatCard 
          title="Pending"
          value={`${pendingQuotes}`}
          description="Awaiting Response"
          icon={<Clock className="h-5 w-5" />}
          linkHref="/app/quotes?status=sent"
          className="bg-amber-50 dark:bg-amber-950"
        />
        
        <StatCard 
          title="Clients"
          value={`${clients.length}`}
          description="Total Clients"
          icon={<Users className="h-5 w-5" />}
          linkHref="/app/clients"
        />
      </div>
      
      {/* Recent activities */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Your latest invoice activities</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/invoices">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.slice(0, 5).map((invoice) => (
                  <RecentItemCard
                    key={invoice.id}
                    title={invoice.invoiceNumber}
                    subtitle={formatDate(invoice.issueDate)}
                    amount={formatCurrency(invoice.total)}
                    status={invoice.status}
                    link={`/app/invoices/${invoice.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                message="No invoices yet"
                action={
                  <Button asChild>
                    <Link href="/app/invoices/new">
                      <span className="flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Invoice
                      </span>
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Recent Quotes</CardTitle>
              <CardDescription>Your latest quote activities</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/quotes">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {quotes.length > 0 ? (
              <div className="space-y-4">
                {quotes.slice(0, 5).map((quote) => (
                  <RecentItemCard
                    key={quote.id}
                    title={quote.quoteNumber}
                    subtitle={formatDate(quote.issueDate)}
                    amount={formatCurrency(quote.total)}
                    status={quote.status}
                    link={`/app/quotes/${quote.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                message="No quotes yet"
                action={
                  <Button asChild>
                    <Link href="/app/quotes/new">
                      <span className="flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Quote
                      </span>
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Test Links Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test Pages</CardTitle>
          <CardDescription>
            Access test pages for development and demonstration purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TestPageLink href="/app/llm-test" title="LLM Test" description="Test the LLM integration" />
            <TestPageLink href="/app/client-test" title="Client Test" description="Test client management" />
            <TestPageLink href="/app/document-test" title="Document Test" description="Test document generation" />
            <TestPageLink href="/app/profile-test" title="Profile Test" description="Test profile management" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Formats a date string or Date object into a readable format
 * 
 * @param date Date to format as string or Date object
 * @returns Formatted date string
 */
function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(dateObj)
}

/**
 * Stats card component used on the dashboard
 */
function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  linkHref,
  className = ""
}: { 
  title: string
  value: string
  description: string
  icon: React.ReactNode
  linkHref: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-0">
        <Button asChild variant="ghost" className="w-full rounded-t-none">
          <Link href={linkHref}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

/**
 * Recent item card for invoices and quotes
 */
function RecentItemCard({ 
  title, 
  subtitle, 
  amount, 
  status, 
  link 
}: { 
  title: string
  subtitle: string
  amount: string
  status: string
  link: string
}) {
  // Define status badge colors based on status
  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    expired: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    canceled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
  
  const statusStyle = statusStyles[status] || statusStyles.draft
  
  return (
    <Link href={link} className="block">
      <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-medium">{amount}</span>
          <span className={`rounded-full px-2 py-1 text-xs ${statusStyle}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>
    </Link>
  )
}

/**
 * Empty state component when no data is available
 */
function EmptyState({ 
  message, 
  action 
}: { 
  message: string
  action: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border border-dashed py-8">
      <p className="text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}

/**
 * Test page link component for the test pages section
 */
function TestPageLink({ 
  href, 
  title, 
  description 
}: { 
  href: string
  title: string
  description: string
}) {
  return (
    <Link href={href} className="block">
      <div className="rounded-lg border p-4 transition-colors hover:bg-muted">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}