/**
 * @file App layout component for authenticated sections
 * @description 
 * This layout is used for all authenticated app pages.
 * It provides the sidebar navigation, header, and common structure for the application.
 * 
 * Key features:
 * - Adds the app sidebar for navigation
 * - Provides authentication checks and redirects
 * - Renders the app header and main content area
 * - Handles subscription status checks for feature access
 * 
 * @dependencies
 * - clerk/nextjs: For authentication
 * - components/sidebar/app-sidebar: For the main navigation sidebar
 * - components/ui/sidebar: For the sidebar container components
 * 
 * @notes
 * - Protects all routes under the /app path
 * - Checks user authentication and profile existence
 * - Redirects free users to pricing page for certain sections (premium features)
 */

"use server"

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { AppHeader } from "@/components/app/app-header"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@clerk/nextjs/server"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Dashboard | Smart Invoice WebApp",
  description: "Manage your invoices and quotes"
}

/**
 * Checks if the current pathname is the settings page
 * 
 * @param pathname The current URL path
 * @returns True if on a settings page
 */
function isSettingsPage(pathname: string): boolean {
  return pathname.startsWith("/app/settings")
}

/**
 * Checks if the current pathname is the dashboard page
 * 
 * @param pathname The current URL path
 * @returns True if on the dashboard page
 */
function isDashboardPage(pathname: string): boolean {
  return pathname === "/app/dashboard" || pathname === "/app"
}

/**
 * Layout wrapper for authenticated app pages
 * 
 * @param children The page content to render within the layout
 * @returns JSX for the app layout
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get authenticated user
  const { userId } = await auth()

  // Redirect to login if not authenticated
  if (!userId) {
    return redirect("/login")
  }

  // Get user profile
  const { data: profile, isSuccess } = await getProfileByUserIdAction(userId)

  // Redirect to signup if profile doesn't exist
  if (!isSuccess || !profile) {
    return redirect("/signup")
  }

  // Get current pathname for route-based logic
  const pathname = new URL(
    // @ts-expect-error headers() is not typed correctly
    headers().get("x-url") || "", 
    "http://localhost"
  ).pathname

  // Redirect free users to pricing page unless they're on dashboard or settings
  if (profile.membership === "free" && 
      !isSettingsPage(pathname) && 
      !isDashboardPage(pathname)) {
    return redirect("/pricing")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center px-6 border-b">
          <AppHeader profile={profile} />
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}