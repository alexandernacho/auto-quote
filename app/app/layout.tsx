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
 */

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { AppLayoutWrapper } from "@/components/app/app-layout-wrapper"
import { AppSidebar } from "@/components/sidebar/app-sidebar" 
import { SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@clerk/nextjs/server"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Dashboard | Smart Invoice WebApp",
  description: "Manage your invoices and quotes"
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


  return (
    <div className="flex min-h-screen">
      <AppLayoutWrapper profile={profile}>{children}</AppLayoutWrapper>
    </div>
  )
}