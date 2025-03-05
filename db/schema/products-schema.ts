/**
 * @file Products schema definition
 * @description 
 * Defines the database schema for products and services.
 * Stores information about items that can be included in invoices and quotes.
 * 
 * @dependencies
 * - drizzle-orm: ORM for type-safe database interactions
 * 
 * @notes
 * - Each product is associated with a user through userId
 * - Uses UUID for primary key
 * - Includes fields for recurring services (subscription-based products)
 * - Stores tax rate at the product level for flexible tax handling
 */

import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Define the products table schema
export const productsTable = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  unitPrice: text("unit_price").notNull(),
  taxRate: text("tax_rate").notNull().default("0"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrenceUnit: text("recurrence_unit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

// Export types for use in application code
export type InsertProduct = typeof productsTable.$inferInsert
export type SelectProduct = typeof productsTable.$inferSelect