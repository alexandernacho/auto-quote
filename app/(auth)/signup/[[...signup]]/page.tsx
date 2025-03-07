/*
<ai_context>
This client page provides the signup form from Clerk.
</ai_context>
*/

"use client"

import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <SignUp
      forceRedirectUrl="/"
    />
  )
}
