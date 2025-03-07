/*
<ai_context>
This client component provides the providers for the app.
</ai_context>
*/

"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { CSPostHogProvider } from "./posthog/posthog-provider"

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <TooltipProvider>
      <CSPostHogProvider>{children}</CSPostHogProvider>
    </TooltipProvider>
  )
}
