/**
 * @file Stripe webhook handler
 * @description
 * This API route handles Stripe webhook events to manage subscription status changes 
 * and updates user profiles accordingly. It processes events like checkout completion
 * and subscription updates.
 *
 * Key features:
 * - Webhook signature verification
 * - Event type filtering for relevant events
 * - Subscription status change handling
 * - Customer information updates from checkout sessions
 * - Standardized error handling
 *
 * @dependencies
 * - stripe: Configured Stripe client
 * - manageSubscriptionStatusChange: For updating subscription status
 * - updateStripeCustomer: For updating customer information
 * - handleActionError: For standardized error handling
 *
 * @notes
 * - Requires STRIPE_WEBHOOK_SECRET environment variable
 * - Only processes specific event types defined in relevantEvents
 * - Verifies webhook signature for security
 * - Handles error cases with appropriate status codes
 */

import {
  manageSubscriptionStatusChange,
  updateStripeCustomer
} from "@/actions/stripe-actions"
import { handleActionError } from "@/lib/error-handling"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import Stripe from "stripe"

// Define the set of events we care about
const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted"
])

/**
 * Handles incoming Stripe webhook requests
 * 
 * @param req The request object containing the webhook payload
 * @returns Response indicating success or failure
 */
export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get("Stripe-Signature") as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  let event: Stripe.Event

  try {
    // Verify webhook signature and construct event
    if (!sig || !webhookSecret) {
      throw new Error("Webhook secret or signature missing")
    }

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Process only relevant events
  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await handleSubscriptionChange(event)
          break

        case "checkout.session.completed":
          await handleCheckoutSession(event)
          break

        default:
          throw new Error("Unhandled relevant event!")
      }
    } catch (error) {
      // Use standardized error handling but return appropriate response
      handleActionError(error, {
        actionName: 'stripeWebhookHandler',
        operation: 'process',
        entityName: 'webhook event',
        entityId: event.id
      })
      
      return new Response(
        "Webhook handler failed. View your server logs for details.",
        {
          status: 400
        }
      )
    }
  }

  // Return success response
  return new Response(JSON.stringify({ received: true }))
}

/**
 * Handle subscription changes (updates or deletions)
 * 
 * @param event The Stripe event containing subscription data
 */
async function handleSubscriptionChange(event: Stripe.Event) {
  try {
    const subscription = event.data.object as Stripe.Subscription
    const productId = subscription.items.data[0].price.product as string
    
    await manageSubscriptionStatusChange(
      subscription.id,
      subscription.customer as string,
      productId
    )
  } catch (error) {
    console.error("Error handling subscription change:", error)
    throw error
  }
}

/**
 * Handle checkout session completion
 * 
 * @param event The Stripe event containing checkout session data
 */
async function handleCheckoutSession(event: Stripe.Event) {
  try {
    const checkoutSession = event.data.object as Stripe.Checkout.Session
    
    // Only process subscription checkouts
    if (checkoutSession.mode === "subscription") {
      const subscriptionId = checkoutSession.subscription as string
      
      // Update customer information in our database
      await updateStripeCustomer(
        checkoutSession.client_reference_id as string,
        subscriptionId,
        checkoutSession.customer as string
      )

      // Retrieve subscription details and update membership status
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["default_payment_method"]
      })

      const productId = subscription.items.data[0].price.product as string
      await manageSubscriptionStatusChange(
        subscription.id,
        subscription.customer as string,
        productId
      )
    }
  } catch (error) {
    console.error("Error handling checkout session:", error)
    throw error
  }
}