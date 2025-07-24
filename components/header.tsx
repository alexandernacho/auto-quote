/**
 * @file Header component for marketing pages
 * @description 
 * Provides the main navigation header for public/marketing pages.
 * Displays branding, navigation links, theme switcher, and auth buttons.
 * 
 * Key features:
 * - Responsive navigation with mobile menu
 * - Authentication state-aware rendering
 * - Dark/light theme toggle
 * - Transparent to solid background transition on scroll
 * 
 * @dependencies
 * - components/ui/button: For action buttons
 * - clerk/nextjs: For authentication state and components
 * - components/utilities/theme-switcher: For theme toggling
 * 
 * @notes
 * - This is a client component to allow for interactive behaviors
 * - Uses useState and useEffect for component state management
 */

"use client"

import { Button } from "@/components/ui/button"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs"
import { FileText, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

/**
 * Navigation link structure
 */
type NavLink = {
  href: string
  label: string
}

/**
 * Marketing site navigation links
 */
const navLinks: NavLink[] = []

/**
 * Additional navigation links for authenticated users
 */
const signedInLinks: NavLink[] = [
  { href: "/app/dashboard", label: "Dashboard" }
]

/**
 * Marketing site header component with responsive navigation
 * 
 * @returns JSX for the header component
 */
export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  // Handle scroll events to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-background/80 shadow-sm backdrop-blur-sm"
          : "bg-background"
      }`}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between p-4">
        {/* Logo and brand name */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center hover:opacity-80">
            <FileText className="h-6 w-6 text-blue-500" />
            <span className="ml-2 text-xl font-bold">Smart Invoice</span>
          </Link>
        </div>

        {/* Desktop navigation */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 space-x-1 font-medium md:flex">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                pathname === link.href ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}

          <SignedIn>
            {signedInLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  pathname === link.href ? "bg-gray-100 dark:bg-gray-800" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </SignedIn>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          <SignedOut>
            <div className="hidden sm:flex sm:space-x-3">
              <SignInButton>
                <Button variant="outline" size="sm">Login</Button>
              </SignInButton>

              <SignUpButton>
                <Button className="bg-blue-500 hover:bg-blue-600" size="sm">Sign Up</Button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label="Toggle menu"
              className="text-foreground"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {isMenuOpen && (
        <nav className="border-t p-4 md:hidden">
          <ul className="space-y-3">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block rounded px-3 py-2 text-sm ${
                    pathname === link.href ? "bg-gray-100 dark:bg-gray-800" : ""
                  }`}
                  onClick={toggleMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            
            <SignedIn>
              {signedInLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded px-3 py-2 text-sm ${
                      pathname === link.href ? "bg-gray-100 dark:bg-gray-800" : ""
                    }`}
                    onClick={toggleMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </SignedIn>
            
            <SignedOut>
              <li className="border-t pt-3 mt-3">
                <SignInButton>
                  <Button variant="outline" className="w-full justify-center">
                    Login
                  </Button>
                </SignInButton>
              </li>
              <li>
                <SignUpButton>
                  <Button className="w-full justify-center bg-blue-500 hover:bg-blue-600">
                    Sign Up
                  </Button>
                </SignUpButton>
              </li>
            </SignedOut>
          </ul>
        </nav>
      )}
    </header>
  )
}