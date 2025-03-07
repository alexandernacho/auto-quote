/**
 * @file Root layout component for the Smart Invoice WebApp
 * @description
 * This is the main layout wrapper for the entire application.
 * It sets up global providers, styling, and user authentication.
 * 
 * Key responsibilities:
 * - Set up Clerk authentication provider
 * - Initialize user profile if needed
 * - Apply global styling and fonts
 * - Configure theme provider
 * - Set up analytics tracking
 * 
 * @dependencies
 * - clerk/nextjs: For user authentication
 * - next/font: For font configuration
 * - components/utilities/providers: For theme and other providers
 * 
 * @notes
 * - This component runs on every page request as a server component
 * - User profile creation happens here to ensure profile exists before any other operations
 */

import { createProfileAction, getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { Toaster } from "@/components/ui/toaster"
import { PostHogPageview } from "@/components/utilities/posthog/posthog-pageview"
import { PostHogUserIdentify } from "@/components/utilities/posthog/posthog-user-identity"
import { Providers } from "@/components/utilities/providers"
import { TailwindIndicator } from "@/components/utilities/tailwind-indicator"
import { cn } from "@/lib/utils"
import { ClerkProvider } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

// Configure Inter font with Latin subset
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Smart Invoice WebApp",
  description: "Generate invoices and quotes with AI assistance",
  keywords: ["invoice", "quote", "AI", "business", "automation"],
  authors: [{ name: "Smart Invoice Team" }],
  creator: "Smart Invoice WebApp"
}

/**
 * Root layout component that wraps all pages in the application
 * @param children The page content to render within the layout
 * @returns JSX for the root layout
 */
export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Get the authenticated user (if any)
  const { userId } = await auth()

  // If user is logged in, ensure they have a profile
  if (userId) {
    const profileRes = await getProfileByUserIdAction(userId)
    // Create profile if it doesn't exist yet
    if (!profileRes.isSuccess) {
      await createProfileAction({ 
        userId,
        businessName: "My Business",
        businessEmail: "business@example.com",
        membership: "free"
      })
    }
  }
  
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen bg-background text-foreground antialiased",
            inter.className
          )}
        >
          <Providers
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {/* Analytics tracking components */}
            <PostHogUserIdentify />
            <PostHogPageview />
            {/* Main content area */}
            {children}
            {/* UI utilities */}
            <TailwindIndicator />
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}