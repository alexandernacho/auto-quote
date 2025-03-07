/**
 * @file Stripe API client configuration
 * @description
 * Initializes and configures the Stripe API client for payment processing.
 * Provides a consistent interface for interacting with Stripe services.
 * 
 * Key features:
 * - Configures Stripe API with secret key
 * - Sets API version and application info
 * - Centralizes Stripe configuration in one file
 * 
 * @dependencies
 * - stripe: Official Stripe Node.js library
 * 
 * @notes
 * - Uses environment variable STRIPE_SECRET_KEY for authentication
 * - Sets app name and version for Stripe tracking
 * - Requires proper setup of Stripe account and webhooks
 */

import Stripe from "stripe"

// Initialize Stripe with API key from environment variables
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  appInfo: {
    name: "Smart Invoice WebApp",
    version: "0.1.0"
  }
})