/**
 * @file User profiles schema definition
 * @description 
 * Defines the database schema for user profiles.
 * Stores basic user information and subscription details.
 * 
 * @dependencies
 * - drizzle-orm: ORM for type-safe database interactions
 * 
 * @notes
 * - Primary key is userId from Clerk authentication
 * - Includes subscription data for Stripe integration
 * - Uses pgEnum for membership status (free/pro)
 */

import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"

// Define membership types as a PostgreSQL enum
export const membershipEnum = pgEnum("membership", ["free", "pro"])

// Define the profiles table schema
export const profilesTable = pgTable("profiles", {
  userId: text("user_id").primaryKey().notNull(),
  membership: membershipEnum("membership").notNull().default("free"),
  businessName: text("business_name").notNull(),
  businessEmail: text("business_email").notNull(),
  businessPhone: text("business_phone"),
  businessAddress: text("business_address"),
  businessLogo: text("business_logo"),
  vatNumber: text("vat_number"),
  defaultTaxRate: text("default_tax_rate").default("0"),
  paymentInstructions: text("payment_instructions"),
  termsAndConditions: text("terms_and_conditions"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

// Export types for use in application code
export type InsertProfile = typeof profilesTable.$inferInsert
export type SelectProfile = typeof profilesTable.$inferSelect