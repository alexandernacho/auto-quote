/*
<ai_context>
This client page provides the login form from Clerk.
</ai_context>
*/

"use client"

import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
  return (
    <SignIn
      forceRedirectUrl="/"
    />
  )
}
