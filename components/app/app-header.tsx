/**
 * @file App Header component
 * @description 
 * This component renders the application header that appears at the top of all app pages.
 * It provides user information, navigation controls, and common actions.
 * 
 * Key features:
 * - Displays user business name
 * - Shows subscription status badge
 * - Provides theme toggle
 * - Shows user profile menu
 * 
 * @dependencies
 * - SelectProfile: User profile type from database schema
 * - UserButton: Clerk component for user profile dropdown
 * - ThemeSwitcher: Component for toggling dark/light theme
 * 
 * @notes
 * - This is a client component so it can handle interactive elements
 */

"use client"

import { SelectProfile } from "@/db/schema"
import { Badge } from "@/components/ui/badge"
import { ThemeSwitcher } from "@/components/utilities/theme-switcher"
import { UserButton } from "@clerk/nextjs"

interface AppHeaderProps {
  profile: SelectProfile
}

/**
 * Header component for the app layout
 * 
 * @param profile The user's profile data
 * @returns JSX for the app header
 */
export function AppHeader({ profile }: AppHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between">
      {/* Left section - Business name */}
      <div className="font-medium">{profile.businessName}</div>
      
      {/* Right section - User controls */}
      <div className="flex items-center gap-4">
        {/* Subscription badge */}
        <Badge 
          variant={profile.membership === "pro" ? "default" : "outline"}
          className={profile.membership === "pro" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          {profile.membership === "pro" ? "Pro" : "Free"}
        </Badge>
        
        {/* Theme toggle */}
        <ThemeSwitcher />
        
        {/* User profile button */}
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  )
}