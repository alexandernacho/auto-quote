/**
 * @file Nav Main component for the sidebar
 * @description 
 * Creates the main navigation section for the sidebar with collapsible menu items.
 * Shows primary navigation links organized in a hierarchical structure.
 * 
 * Key features:
 * - Collapsible navigation groups
 * - Highlights active items based on current URL
 * - Icon and text display for each nav item
 * - Support for nested navigation items
 * 
 * @dependencies
 * - components/ui/collapsible: For expanding/collapsing menu sections
 * - components/ui/sidebar: For sidebar menu structure components
 * - lucide-react: For navigation icons
 * - next/navigation: For URL path matching
 * 
 * @notes
 * - This is a client component to allow for interactivity
 * - Uses the usePathname hook to determine the active item
 */

"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "@/components/ui/sidebar"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"

/**
 * Props for NavMainItem
 */
interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  items?: { title: string; url: string }[]
}

/**
 * Props for NavMain component
 */
interface NavMainProps {
  items: NavItem[]
}

/**
 * Creates the main navigation section for the app sidebar
 * 
 * @param items Array of navigation items to display
 * @returns JSX for the main navigation section
 */
export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname()
  
  // Determine which items should be expanded based on current URL
  const expandedItems = useMemo(() => {
    return items.map(item => {
      // Check if this item or any of its children match the current path
      const isActive = pathname === item.url || 
        (item.items?.some(subItem => pathname === subItem.url) ?? false) ||
        (pathname?.startsWith(item.url) && item.url !== '/app/dashboard')
        
      return {
        ...item,
        isActive
      }
    })
  }, [items, pathname])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {expandedItems.map(item => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton 
                  tooltip={item.title}
                  asChild={item.items?.length === 0}
                  data-active={item.isActive}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {item.items && item.items.length > 0 && (
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  )}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              
              {item.items && item.items.length > 0 && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map(subItem => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton 
                          asChild 
                          data-active={pathname === subItem.url}
                        >
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}