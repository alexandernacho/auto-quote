/*
<ai_context>
This client component provides the hero section for the landing page.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from "next/link"
import posthog from "posthog-js"

export const HeroSection = () => {
  const handleDashboardClick = () => {
    posthog.capture("clicked_dashboard")
  }

  return (
    <div className="flex flex-col items-center justify-center px-8 py-32 text-center">
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Link href="/dashboard" onClick={handleDashboardClick}>
          <Button className="bg-blue-500 text-lg hover:bg-blue-600">
            Go to Dashboard &rarr;
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
