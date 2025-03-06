"use client"

import { AppHeader } from "@/components/app/app-header"
import { SelectProfile } from "@/db/schema"
import Link from "next/link"

interface AppLayoutWrapperProps {
  profile: SelectProfile
  children: React.ReactNode
}

export function AppLayoutWrapper({ profile, children }: AppLayoutWrapperProps) {
  return (
    <div className="flex min-h-screen">
      {/* Simplified sidebar */}
      <div className="w-64 bg-gray-100 p-4">
        <div className="mb-6">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="ml-2 font-bold text-lg">Smart Invoice</span>
          </div>
        </div>
        
        <nav className="space-y-1">
          <Link href="/app/dashboard" className="block px-4 py-2 rounded hover:bg-gray-200">Dashboard</Link>
          <Link href="/app/llm-test" className="block px-4 py-2 rounded hover:bg-gray-200">LLM Test</Link>
          <Link href="/app/client-test" className="block px-4 py-2 rounded hover:bg-gray-200">Client Test</Link>
          <Link href="/app/document-test" className="block px-4 py-2 rounded hover:bg-gray-200">Document Test</Link>
          <Link href="/app/profile-test" className="block px-4 py-2 rounded hover:bg-gray-200">Profile Test</Link>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center px-6">
          <div className="ml-auto">
            <span className="font-medium">{profile.businessName}</span>
          </div>
        </header>
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 