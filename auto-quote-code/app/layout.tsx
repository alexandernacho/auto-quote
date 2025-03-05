/**
 * @file RootLayout
 * @description
 * The main root layout for the Smart Invoice WebApp. This layout is responsible for:
 * 1. Setting up global HTML structure (html/body tags).
 * 2. Setting up the global styling with Tailwind and the Inter font.
 * 3. Checking for an authenticated user using Clerk (via `auth()`).
 * 4. Ensuring the user has a profile record in the database. If the user does not have a profile,
 *    we create one with default values. This step completes the requirement in step 4 of the plan
 *    to handle basic profile creation upon user sign-in.
 * 
 * Key responsibilities:
 * - Render the main HTML boilerplate for the Next.js app.
 * - Provide a global style foundation via `globals.css` and Inter font.
 * - If a user is logged in but doesn't have a profile, automatically create one.
 * 
 * @dependencies
 * - Clerk for authentication
 * - getProfileByUserIdAction, createProfileAction from "@/actions/db/profiles-actions"
 * - Inter from "next/font/google"
 * 
 * @notes
 * - After sign-up, or upon any login, if the user does not have a profile, a default profile is created.
 *   This satisfies the plan's requirement for "User Profile Setup".
 * - In the future (step 7) we will add code in `createProfileAction` to create default templates.
 *   For now, we only create the basic profile so the user can proceed.
 * - The membership is set to "free" by default. The user can upgrade to "pro" via the Stripe subscription flow.
 */

"use server"

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { auth } from "@clerk/nextjs/server"
import {
  createProfileAction,
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Smart Invoice WebApp",
  description: "A web application that automates the creation of invoices and quotes using an LLM."
}

/**
 * RootLayout component
 * @param {object} props
 * @param {React.ReactNode} props.children - The child components of the layout.
 * 
 * @returns {JSX.Element} The main application layout, including necessary HTML/head/body wrappers.
 */
export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Retrieve the authenticated user's ID (if logged in)
  const { userId } = await auth()

  // If the user is logged in, ensure they have a profile
  if (userId) {
    const profileResult = await getProfileByUserIdAction(userId)

    // If the profile does not exist, create a new default profile
    if (!profileResult.isSuccess) {
      // For now, set placeholder values for business info
      // The user can update these later in Settings or Onboarding
      await createProfileAction({
        userId,
        membership: "free",
        businessName: "My Business",
        businessEmail: "info@mybusiness.com"
      })
    }
  }

  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}