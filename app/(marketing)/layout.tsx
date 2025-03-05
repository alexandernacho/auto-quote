/**
 * @file Marketing layout component
 * @description 
 * This layout is used for all marketing/public pages like homepage, about, pricing, etc.
 * It provides a consistent header and structure for marketing content.
 * 
 * Key features:
 * - Adds the common header component to all marketing pages
 * - Provides appropriate spacing and structure
 * - Creates a clean, consistent marketing experience
 * 
 * @dependencies
 * - components/header: The shared header component
 * 
 * @notes
 * - Uses server component for better SEO and initial page load
 * - Used for routes under the (marketing) folder group
 */


import Header from "@/components/header"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Smart Invoice WebApp",
  description: "Generate invoices and quotes with AI assistance"
}

/**
 * Layout wrapper for marketing pages
 * 
 * @param children The page content to render within the layout
 * @returns JSX for the marketing layout
 */
export default async function MarketingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed header for navigation */}
      <Header />

      {/* Main content area with flex-grow to fill available space */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer could be added here in the future */}
    </div>
  )
}