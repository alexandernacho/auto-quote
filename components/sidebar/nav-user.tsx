/**
 * @file Nav User component for the sidebar
 * @description 
 * Creates the user-related section at the bottom of the sidebar.
 * Shows user profile information and provides access to user-specific actions.
 * 
 * Key features:
 * - Displays user information from Clerk
 * - Provides sign out functionality
 * - Shows user avatar
 * 
 * @dependencies
 * - components/ui/sidebar: For sidebar structure components
 * - clerk/nextjs: For user profile data and actions
 * 
 * @notes
 * - This is a client component to allow for interactive elements
 * - Uses the useUser hook from Clerk to get user information
 */

"use client"

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import { UserButton, useUser } from "@clerk/nextjs"

/**
 * Renders the user section in the sidebar footer
 * 
 * @returns JSX for the user navigation section
 */
export function NavUser() {
  const { user, isLoaded } = useUser()

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-3 font-medium p-2">
        <UserButton afterSignOutUrl="/" />
        {isLoaded && user ? (
          <div className="flex flex-col text-sm">
            <span className="font-medium">{user.fullName || user.username}</span>
            <span className="text-muted-foreground text-xs">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        ) : (
          <div className="h-8 w-36 animate-pulse rounded bg-muted"></div>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}