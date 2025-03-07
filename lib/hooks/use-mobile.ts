/**
 * @file Mobile detection hook
 * @description 
 * A custom React hook that detects if the current device is mobile based on window width.
 * Provides responsive behavior for components that need to adapt to mobile screens.
 * 
 * Key features:
 * - Uses media query matching for reliable detection
 * - Updates state when screen width changes
 * - Handles server-side rendering with initial undefined state
 * 
 * @dependencies
 * - React: For hooks functionality
 * 
 * @notes
 * - Mobile is defined as screen width less than 768px
 * - Returns undefined during server-side rendering
 * - Properly handles event listeners for cleanup
 */

import { useEffect, useState } from "react"

// Mobile breakpoint - screens smaller than this are considered mobile
const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect if the current device is mobile based on screen width
 * 
 * @returns Boolean indicating if device is mobile (true) or desktop (false)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    // Create media query list for mobile detection
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Handler function to update state when screen size changes
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Add event listener for screen size changes
    mql.addEventListener("change", onChange)
    
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup event listener on component unmount
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}