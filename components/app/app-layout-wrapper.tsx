/**
 * @file App Layout Wrapper component
 * @description 
 * Client-side wrapper for the app layout. This component wraps the server-rendered
 * app layout, providing client-side interactivity and context.
 * 
 * Key features:
 * - App sidebar with navigation
 * - Header with user controls
 * - Main content area
 * - Client-side layout handling
 * 
 * @dependencies
 * - SelectProfile: User profile type
 * - AppHeader: Header component with user controls
 * 
 * @notes
 * - Client component to allow interactive behavior
 * - Receives server-loaded profile data as prop
 */

"use client"

import { AppHeader } from "@/components/app/app-header"
import { SelectProfile } from "@/db/schema"

interface AppLayoutWrapperProps {
  children: React.ReactNode
  profile: SelectProfile
}

/**
 * Client-side wrapper for the app layout
 * Provides the header and main content area
 * 
 * @param children The page content to render
 * @param profile The user's profile data
 * @returns JSX for the app layout wrapper
 */
export function AppLayoutWrapper({
  children,
  profile
}: AppLayoutWrapperProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center border-b px-6">
        <AppHeader profile={profile} />
      </header>
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}