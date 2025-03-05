/**
 * @file App Sidebar component
 * @description 
 * Provides the main navigation sidebar for the application.
 * Contains links to different sections of the app and user-related actions.
 * 
 * Key features:
 * - Collapsible navigation with sections
 * - Links to main app areas (dashboard, invoices, quotes, etc.)
 * - User profile and settings access
 * - Responsive design (collapses to icons on smaller screens)
 * 
 * @dependencies
 * - components/ui/sidebar: For sidebar structure components
 * - lucide-react: For navigation icons
 * - NavMain, NavUser: Sub-components for specific navigation sections
 * 
 * @notes
 * - This is a client component to allow for interactive behaviors
 * - Uses the SidebarMenu components from shadcn UI
 */

"use client"

import {
  Building2,
  CreditCard,
  FileText,
  Home,
  Receipt,
  Settings,
  ShoppingBag,
  Users
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"

/**
 * Main navigation items for the sidebar
 */
const navigationItems = [
  {
    title: "Dashboard",
    url: "/app/dashboard",
    icon: Home,
    items: []
  },
  {
    title: "Invoices",
    url: "/app/invoices",
    icon: Receipt,
    items: [
      { title: "All Invoices", url: "/app/invoices" },
      { title: "Create New", url: "/app/invoices/new" },
      { title: "Templates", url: "/app/templates?type=invoice" }
    ]
  },
  {
    title: "Quotes",
    url: "/app/quotes",
    icon: FileText,
    items: [
      { title: "All Quotes", url: "/app/quotes" },
      { title: "Create New", url: "/app/quotes/new" },
      { title: "Templates", url: "/app/templates?type=quote" }
    ]
  },
  {
    title: "Clients",
    url: "/app/clients",
    icon: Users,
    items: [
      { title: "All Clients", url: "/app/clients" },
      { title: "Add Client", url: "/app/clients/new" }
    ]
  },
  {
    title: "Products",
    url: "/app/products",
    icon: ShoppingBag,
    items: [
      { title: "All Products", url: "/app/products" },
      { title: "Add Product", url: "/app/products/new" }
    ]
  },
  {
    title: "Business",
    url: "/app/business",
    icon: Building2,
    items: [
      { title: "Profile", url: "/app/settings/profile" },
      { title: "Branding", url: "/app/settings/branding" }
    ]
  },
  {
    title: "Billing",
    url: "/app/billing",
    icon: CreditCard,
    items: [
      { title: "Subscription", url: "/app/billing" },
      { title: "Payment History", url: "/app/billing/history" },
      { title: "Upgrade", url: "/app/billing/upgrade" }
    ]
  },
  {
    title: "Settings",
    url: "/app/settings",
    icon: Settings,
    items: [
      { title: "General", url: "/app/settings" },
      { title: "Templates", url: "/app/settings/templates" },
      { title: "Account", url: "/app/settings/account" }
    ]
  }
]

/**
 * Application sidebar component providing main navigation
 * 
 * @param props Sidebar props
 * @returns JSX for the app sidebar
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center px-4 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white">
            <span className="text-lg font-bold">S</span>
          </div>
          <span className="ml-2 text-lg font-bold">Smart Invoice</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>
      
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}