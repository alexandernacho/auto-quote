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
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl space-y-8"
      >
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Smart Invoice
        </h1>
        
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300 sm:text-xl">
          Generate professional invoices and quotes with AI assistance. 
          Streamline your business workflow and focus on what matters most.
        </p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          <Link href="/app/dashboard" onClick={handleDashboardClick}>
            <Button 
              size="lg" 
              className="bg-blue-600 text-lg hover:bg-blue-700 px-8 py-3 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Go to Dashboard
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
