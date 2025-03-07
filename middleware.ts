/**
 * @file Authentication middleware
 * @description
 * Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
 * Handles security and routing for protected application areas.
 * 
 * Key features:
 * - Protects application routes that require authentication
 * - Redirects unauthenticated users to login
 * - Allows public access to marketing pages
 * 
 * @dependencies
 * - @clerk/nextjs/server: Authentication middleware and utilities
 * - next/server: Next.js server components
 * 
 * @notes
 * - All routes under /app/* require authentication
 * - Public routes (marketing, auth) are accessible without login
 * - Uses Clerk middleware for auth state management
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/app(.*)", // Protect all routes under /app
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth()

  // If the user isn't signed in and the route is private, redirect to sign-in
  if (!userId && isProtectedRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url })
  }

  // If the user is logged in and the route is protected, let them view.
  if (userId && isProtectedRoute(req)) {
    return NextResponse.next()
  }

  // For all other routes, proceed normally
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
}