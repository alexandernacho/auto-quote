// app/app/profile-test/page.tsx
"use client"

import { getProfileByUserIdAction, updateProfileAction } from "@/actions/db/profiles-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/hooks/use-toast"
import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"

export default function ProfileTestPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [businessName, setBusinessName] = useState("")
  const [businessEmail, setBusinessEmail] = useState("")
  const [businessPhone, setBusinessPhone] = useState("")
  const [businessAddress, setBusinessAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  useEffect(() => {
    if (user?.id) {
      loadProfile()
    }
  }, [user?.id])
  
  const loadProfile = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    
    try {
      const response = await getProfileByUserIdAction(user.id)
      
      if (response.isSuccess) {
        setProfile(response.data)
        setBusinessName(response.data.businessName || "")
        setBusinessEmail(response.data.businessEmail || "")
        setBusinessPhone(response.data.businessPhone || "")
        setBusinessAddress(response.data.businessAddress || "")
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) return
    
    setIsUpdating(true)
    
    try {
      const response = await updateProfileAction(user.id, {
        businessName,
        businessEmail,
        businessPhone: businessPhone || undefined,
        businessAddress: businessAddress || undefined
      })
      
      if (response.isSuccess) {
        setProfile(response.data)
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Profile Management Test</h1>
      
      {isLoading ? (
        <p>Loading profile...</p>
      ) : profile ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Business Name:</strong> {profile.businessName}</p>
                <p><strong>Email:</strong> {profile.businessEmail}</p>
                <p><strong>Phone:</strong> {profile.businessPhone || "Not set"}</p>
                <p><strong>Address:</strong> {profile.businessAddress || "Not set"}</p>
                <p><strong>Membership:</strong> {profile.membership}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Update Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Phone (optional)</Label>
                  <Input
                    id="businessPhone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Address (optional)</Label>
                  <Textarea
                    id="businessAddress"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p>No profile found</p>
      )}
    </div>
  )
}