/**
 * @file Quotes schema definition
 * @description 
 * Defines the database schema for quotes and quote items.
 * Stores information about quotes and their line items.
 * 
 * @dependencies
 * - drizzle-orm: ORM for type-safe database interactions
 * 
 * @notes
 * - Each quote is associated with a user through userId
 * - Uses relations to clients, templates, and products tables
 * - Includes quote status as a PostgreSQL enum
 * - Quote items are in a separate table with a relation to the parent quote
 * - Very similar structure to invoices but with quote-specific fields
 */

import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { clientsTable } from "./clients-schema"
import { productsTable } from "./products-schema"
import { templatesTable } from "./templates-schema"

// Define quote status types as a PostgreSQL enum
export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired"
])

// Define the quotes table schema
export const quotesTable = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  quoteNumber: text("quote_number").notNull(),
  clientId: uuid("client_id").references(() => clientsTable.id),
  templateId: uuid("template_id").references(() => templatesTable.id),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  validUntil: timestamp("valid_until").notNull(),
  status: quoteStatusEnum("status").notNull().default("draft"),
  subtotal: text("subtotal").notNull().default("0"),
  taxAmount: text("tax_amount").notNull().default("0"),
  discount: text("discount").notNull().default("0"),
  total: text("total").notNull().default("0"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

// Define the quote items table schema
export const quoteItemsTable = pgTable("quote_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotesTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => productsTable.id),
  description: text("description").notNull(),
  quantity: text("quantity").notNull().default("1"),
  unitPrice: text("unit_price").notNull(),
  taxRate: text("tax_rate").notNull().default("0"),
  taxAmount: text("tax_amount").notNull().default("0"),
  subtotal: text("subtotal").notNull(),
  total: text("total").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

// Export types for use in application code
export type InsertQuote = typeof quotesTable.$inferInsert
export type SelectQuote = typeof quotesTable.$inferSelect
export type InsertQuoteItem = typeof quoteItemsTable.$inferInsert
export type SelectQuoteItem = typeof quoteItemsTable.$inferSelect