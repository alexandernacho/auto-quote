// app/app/dashboard/page.tsx
"use server"

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    return redirect("/login")
  }
  
  const profileResult = await getProfileByUserIdAction(userId)
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {profileResult.isSuccess ? (
              <div className="space-y-2">
                <p>Business: {profileResult.data.businessName}</p>
                <p>Email: {profileResult.data.businessEmail}</p>
                <p>Membership: {profileResult.data.membership}</p>
              </div>
            ) : (
              <p>Profile not found</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>LLM Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <a href="/app/llm-test" className="text-blue-500 hover:underline">
              Test LLM Integration
            </a>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Client Test</CardTitle>
          </CardHeader>
          <CardContent>
            <a href="/app/client-test" className="text-blue-500 hover:underline">
              Test Client Management
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}