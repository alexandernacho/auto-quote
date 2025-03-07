/**
 * @file Theme Switcher component
 * @description 
 * A simple theme toggle button that switches between light and dark modes.
 * Provides visual feedback with appropriate icons for the current theme.
 * 
 * Key features:
 * - Toggles between light and dark themes
 * - Shows appropriate icon for current theme
 * - Persists theme choice in localStorage
 * - Applies theme changes immediately
 * 
 * @dependencies
 * - next-themes: For theme management
 * - lucide-react: For theme icons
 * 
 * @notes
 * - This is a client component to allow for theme switching
 * - Uses next-themes for consistent theme management
 * - Saves preference to localStorage for persistence
 */

"use client"

import { cn } from "@/lib/utils"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { HTMLAttributes, ReactNode } from "react"

/**
 * Props for ThemeSwitcher component
 */
interface ThemeSwitcherProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

/**
 * Theme switcher component for toggling between light and dark modes
 * 
 * @param props Component props including optional children and HTML attributes
 * @returns JSX element for the theme switcher
 */
export function ThemeSwitcher({ children, ...props }: ThemeSwitcherProps) {
  const { setTheme, theme } = useTheme()

  /**
   * Handle theme change when clicked
   * 
   * @param theme The theme to switch to ('light' or 'dark')
   */
  const handleChange = (theme: "dark" | "light") => {
    localStorage.setItem("theme", theme)
    setTheme(theme)
  }

  return (
    <div
      className={cn(
        "p-1 hover:cursor-pointer hover:opacity-50",
        props.className
      )}
      onClick={() => handleChange(theme === "light" ? "dark" : "light")}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      role="button"
      tabIndex={0}
    >
      {theme === "dark" ? (
        <Moon className="size-6" />
      ) : (
        <Sun className="size-6" />
      )}
      {children}
    </div>
  )
}