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
 * - Includes quick actions dropdown
 * - Responsive for mobile and desktop
 * 
 * @dependencies
 * - SelectProfile: User profile type from database schema
 * - UserButton: Clerk component for user profile dropdown
 * - ThemeSwitcher: Component for toggling dark/light theme
 * - Button: UI component for actions
 * 
 * @notes
 * - This is a client component so it can handle interactive elements
 * - Uses Lucide icons for visual elements
 */

"use client"

import { SelectProfile } from "@/db/schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { UserButton } from "@clerk/nextjs"
import { 
  FileText, 
  LayoutDashboard,
  LifeBuoy, 
  Menu,
  MoreVertical, 
  Plus, 
  Receipt, 
  Settings, 
  Users
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

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
  const router = useRouter()
  const pathname = usePathname()
  
  /**
   * Handles navigation to specified route
   * 
   * @param route Route path to navigate to
   */
  const handleNavigate = (route: string) => {
    router.push(route)
  }

  /**
   * Checks if the given path is the current active route
   * 
   * @param path Path to check
   * @returns Boolean indicating if path is active
   */
  const isActive = (path: string) => {
    return pathname?.startsWith(path)
  }

  return (
    <div className="flex w-full items-center justify-between">
      {/* Left section - Business name */}
      <div className="font-medium truncate max-w-[200px] md:max-w-md">
        {profile.businessName}
      </div>
      
      {/* Middle section - Navigation links (desktop) */}
      <div className="hidden md:flex items-center space-x-4">
        <Link 
          href="/app/dashboard" 
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive("/app/dashboard") 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <LayoutDashboard className="h-4 w-4 mr-1" />
          Dashboard
        </Link>
        <Link 
          href="/app/invoices" 
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive("/app/invoices") 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Receipt className="h-4 w-4 mr-1" />
          Invoices
        </Link>
        <Link 
          href="/app/quotes" 
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive("/app/quotes") 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <FileText className="h-4 w-4 mr-1" />
          Quotes
        </Link>
        <Link 
          href="/app/clients" 
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive("/app/clients") 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Users className="h-4 w-4 mr-1" />
          Clients
        </Link>
      </div>
      
      {/* Right section - User controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile Navigation Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Navigation menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 md:hidden">
            <DropdownMenuLabel>Navigation</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => handleNavigate("/app/dashboard")}
              className={cn(
                isActive("/app/dashboard") && "bg-primary/10 text-primary"
              )}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleNavigate("/app/invoices")}
              className={cn(
                isActive("/app/invoices") && "bg-primary/10 text-primary"
              )}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Invoices
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleNavigate("/app/quotes")}
              className={cn(
                isActive("/app/quotes") && "bg-primary/10 text-primary"
              )}
            >
              <FileText className="mr-2 h-4 w-4" />
              Quotes
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleNavigate("/app/clients")}
              className={cn(
                isActive("/app/clients") && "bg-primary/10 text-primary"
              )}
            >
              <Users className="mr-2 h-4 w-4" />
              Clients
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Quick Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <span className="flex items-center">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Quick actions</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleNavigate("/app/invoices/new")}>
              <Receipt className="mr-2 h-4 w-4" />
              New Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigate("/app/quotes/new")}>
              <FileText className="mr-2 h-4 w-4" />
              New Quote
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigate("/app/clients/new")}>
              <Users className="mr-2 h-4 w-4" />
              Add Client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Subscription badge */}
        <Badge 
          variant={profile.membership === "pro" ? "default" : "outline"}
          className={profile.membership === "pro" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          {profile.membership === "pro" ? "Pro" : "Free"}
        </Badge>
        
        {/* More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hidden md:flex">
              <span className="flex items-center">
                <MoreVertical className="h-5 w-5" />
                <span className="sr-only">More options</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleNavigate("/app/settings")}>
              <span className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="mailto:support@example.com">
                <span className="flex items-center">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  Help & Support
                </span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* User profile button */}
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  )
}