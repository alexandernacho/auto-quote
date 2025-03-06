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
 * - components/app/app-layout-wrapper: For the layout wrapper
 * 
 * @notes
 * - Protects all routes under the /app path
 * - Checks user authentication and profile existence
 * - Redirects free users to pricing page for certain sections (premium features)
 */

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { AppLayoutWrapper } from "@/components/app/app-layout-wrapper"
import { AppSidebar } from "@/components/sidebar/app-sidebar" 
import { SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@clerk/nextjs/server"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

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
  // Get authenticated user - this should now work with the middleware
  const { userId } = await auth()
  
  // This should never happen due to middleware, but just in case
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
  const headersList = await headers();
  const pathname = new URL(
    headersList.get("x-url") || "", 
    "http://localhost"
  ).pathname

  // Redirect free users to pricing page unless they're on dashboard or settings
  if (profile.membership === "free" && 
      !isSettingsPage(pathname) && 
      !isDashboardPage(pathname)) {
    return redirect("/pricing")
  }

  return (
    <div className="flex min-h-screen">
      <AppLayoutWrapper profile={profile}>{children}</AppLayoutWrapper>
    </div>
  )
}