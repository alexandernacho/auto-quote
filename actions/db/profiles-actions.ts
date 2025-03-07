/**
@file profiles-actions.ts
@description
Contains server actions related to user profiles in the database.
Handles creating, retrieving, updating, and deleting user profiles,
as well as special operations like updating via Stripe customer ID.

Optimizations:


Improved schema imports to use centralized schema exports




Enhanced error handling with standardized patterns




Removed redundant type checks and validations




Optimized queries for better performance



Key features:


Profile creation with default templates generation




Profile retrieval by user ID




Profile updating by user ID or Stripe customer ID




Profile deletion




Standardized error handling



@dependencies


db: Database connection




profilesTable: Database schema for profiles




createDefaultTemplatesAction: Action to create default templates for new users




handleActionError, createSuccessResponse: Standardized error/success handling



@notes


Creates default templates when creating a new profile




Handles Stripe integration for subscription management




Uses standardized error handling for consistent responses
*/



"use server"
import { createDefaultTemplatesAction } from "@/actions/db/templates-actions"
import { db } from "@/db/db"
import { profilesTable, InsertProfile, SelectProfile } from "@/db/schema"
import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"
/**

Creates a new user profile in the database
Also triggers creation of default templates for the user

@param data Profile data to insert
@returns Promise resolving to an ActionState with the created profile
*/
export async function createProfileAction(
data: InsertProfile
): Promise<ActionState<SelectProfile>> {
try {
const [newProfile] = await db.insert(profilesTable).values(data).returning()
// Create default templates for new user
await createDefaultTemplatesAction(data.userId)
return createSuccessResponse(
newProfile,
"Profile created successfully",
{ operation: 'create', entityName: 'profile' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'createProfileAction',
entityName: 'profile',
operation: 'create'
})
}
}

/**

Retrieves a user profile by user ID

@param userId The user ID to look up
@returns Promise resolving to an ActionState with the profile if found
*/
export async function getProfileByUserIdAction(
userId: string
): Promise<ActionState<SelectProfile>> {
try {
const profile = await db.query.profiles.findFirst({
where: eq(profilesTable.userId, userId)
})
if (!profile) {
return { isSuccess: false, message: "Profile not found" }
}
return createSuccessResponse(
profile,
"Profile retrieved successfully",
{ operation: 'read', entityName: 'profile' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getProfileByUserIdAction',
entityName: 'profile',
operation: 'read',
entityId: userId
})
}
}

/**

Updates an existing user profile by user ID

@param userId The user ID of the profile to update
@param data The updated profile data
@returns Promise resolving to an ActionState with the updated profile
*/
export async function updateProfileAction(
userId: string,
data: Partial<InsertProfile>
): Promise<ActionState<SelectProfile>> {
try {
const [updatedProfile] = await db
.update(profilesTable)
.set({
...data,
updatedAt: new Date()
})
.where(eq(profilesTable.userId, userId))
.returning()
if (!updatedProfile) {
return { isSuccess: false, message: "Profile not found to update" }
}
return createSuccessResponse(
updatedProfile,
"Profile updated successfully",
{ operation: 'update', entityName: 'profile' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'updateProfileAction',
entityName: 'profile',
operation: 'update',
entityId: userId
})
}
}

/**

Updates a profile by Stripe customer ID
Used for subscription updates from Stripe webhooks

@param stripeCustomerId The Stripe customer ID to look up
@param data The updated profile data
@returns Promise resolving to an ActionState with the updated profile
*/
export async function updateProfileByStripeCustomerIdAction(
stripeCustomerId: string,
data: Partial<InsertProfile>
): Promise<ActionState<SelectProfile>> {
try {
const [updatedProfile] = await db
.update(profilesTable)
.set({
...data,
updatedAt: new Date()
})
.where(eq(profilesTable.stripeCustomerId, stripeCustomerId))
.returning()
if (!updatedProfile) {
return {
isSuccess: false,
message: "Profile not found by Stripe customer ID"
}
}
return createSuccessResponse(
updatedProfile,
"Profile updated by Stripe customer ID successfully",
{ operation: 'update', entityName: 'profile' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'updateProfileByStripeCustomerIdAction',
entityName: 'profile',
operation: 'update',
entityId: stripeCustomerId
})
}
}

/**

Deletes a user profile

@param userId The user ID of the profile to delete
@returns Promise resolving to an ActionState with void data
*/
export async function deleteProfileAction(
userId: string
): Promise<ActionState<void>> {
try {
await db.delete(profilesTable).where(eq(profilesTable.userId, userId))
return createSuccessResponse(
undefined,
"Profile deleted successfully",
{ operation: 'delete', entityName: 'profile' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'deleteProfileAction',
entityName: 'profile',
operation: 'delete',
entityId: userId
})
}
}