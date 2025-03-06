/**
 * @file Stripe actions for payment processing
 * @description
 * Contains server actions related to Stripe payment processing.
 * Handles customer creation, subscription management, and payment status updates.
 * 
 * Key features:
 * - Update user profile with Stripe customer information
 * - Manage subscription status changes from webhooks
 * - Handle membership status updates based on subscription state
 * - Error handling for Stripe operations
 * 
 * @dependencies
 * - updateProfileAction, updateProfileByStripeCustomerIdAction: For updating user profiles
 * - SelectProfile: Type for user profile data
 * - stripe: Configured Stripe client
 * - handleActionError: For standardized error handling
 * 
 * @notes
 * - Called by Stripe webhook handlers to update subscription status
 * - Uses membership status to control access to features
 * - Includes proper error handling and logging
 */

"use server"

import {
  updateProfileAction,
  updateProfileByStripeCustomerIdAction
} from "@/actions/db/profiles-actions"
import { SelectProfile } from "@/db/schema"
import { handleActionError } from "@/lib/error-handling"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

/**
 * Determines membership status based on Stripe subscription status
 * 
 * @param status Stripe subscription status
 * @param membership Current membership tier
 * @returns Updated membership status based on subscription status
 */
const getMembershipStatus = (
  status: Stripe.Subscription.Status,
  membership: MembershipStatus
): MembershipStatus => {
  switch (status) {
    case "active":
    case "trialing":
      return membership
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "paused":
    case "unpaid":
      return "free"
    default:
      return "free"
  }
}

type MembershipStatus = SelectProfile["membership"]

/**
 * Retrieves subscription details from Stripe
 * 
 * @param subscriptionId Stripe subscription ID
 * @returns Promise resolving to subscription details
 */
const getSubscription = async (subscriptionId: string) => {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"]
  })
}

/**
 * Updates user profile with Stripe customer information
 * 
 * @param userId User ID to update
 * @param subscriptionId Stripe subscription ID
 * @param customerId Stripe customer ID
 * @returns Updated user profile
 */
export const updateStripeCustomer = async (
  userId: string,
  subscriptionId: string,
  customerId: string
) => {
  try {
    if (!userId || !subscriptionId || !customerId) {
      throw new Error("Missing required parameters for updateStripeCustomer")
    }

    const subscription = await getSubscription(subscriptionId)

    const result = await updateProfileAction(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id
    })

    if (!result.isSuccess) {
      throw new Error("Failed to update customer profile")
    }

    return result.data
  } catch (error) {
    const formattedError = handleActionError(error, {
      actionName: 'updateStripeCustomer',
      entityName: 'stripe customer',
      operation: 'update',
      entityId: userId
    })
    
    console.error("Stripe customer update error details:", formattedError.message)
    
    throw error instanceof Error
      ? error
      : new Error("Failed to update Stripe customer")
  }
}

/**
 * Handles subscription status changes from Stripe webhooks
 * Updates user membership based on subscription status
 * 
 * @param subscriptionId Stripe subscription ID
 * @param customerId Stripe customer ID
 * @param productId Stripe product ID
 * @returns Updated membership status
 */
export const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  productId: string
): Promise<MembershipStatus> => {
  try {
    if (!subscriptionId || !customerId || !productId) {
      throw new Error(
        "Missing required parameters for manageSubscriptionStatusChange"
      )
    }

    const subscription = await getSubscription(subscriptionId)
    const product = await stripe.products.retrieve(productId)
    const membership = product.metadata.membership as MembershipStatus

    if (!["free", "pro"].includes(membership)) {
      throw new Error(
        `Invalid membership type in product metadata: ${membership}`
      )
    }

    const membershipStatus = getMembershipStatus(
      subscription.status,
      membership
    )

    const updateResult = await updateProfileByStripeCustomerIdAction(
      customerId,
      {
        stripeSubscriptionId: subscription.id,
        membership: membershipStatus
      }
    )

    if (!updateResult.isSuccess) {
      throw new Error("Failed to update subscription status")
    }

    return membershipStatus
  } catch (error) {
    const formattedError = handleActionError(error, {
      actionName: 'manageSubscriptionStatusChange',
      entityName: 'subscription status',
      operation: 'update',
      entityId: `subscription:${subscriptionId}`
    })
    
    console.error("Subscription status change error details:", formattedError.message)
    
    throw error instanceof Error
      ? error
      : new Error("Failed to update subscription status")
  }
}