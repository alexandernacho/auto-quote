/**
 * @file Invoices schema definition
 * @description 
 * Defines the database schema for invoices and invoice items.
 * Stores information about invoices and their line items.
 * 
 * @dependencies
 * - drizzle-orm: ORM for type-safe database interactions
 * 
 * @notes
 * - Each invoice is associated with a user through userId
 * - Uses relations to clients, templates, and products tables
 * - Includes invoice status as a PostgreSQL enum
 * - Invoice items are in a separate table with a relation to the parent invoice
 */

import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { clientsTable } from "./clients-schema"
import { productsTable } from "./products-schema"
import { templatesTable } from "./templates-schema"

// Define invoice status types as a PostgreSQL enum
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "canceled"
])

// Define the invoices table schema
export const invoicesTable = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientId: uuid("client_id").references(() => clientsTable.id),
  templateId: uuid("template_id").references(() => templatesTable.id),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
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

// Define the invoice items table schema
export const invoiceItemsTable = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoicesTable.id, { onDelete: "cascade" }),
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
export type InsertInvoice = typeof invoicesTable.$inferInsert
export type SelectInvoice = typeof invoicesTable.$inferSelect
export type InsertInvoiceItem = typeof invoiceItemsTable.$inferInsert
export type SelectInvoiceItem = typeof invoiceItemsTable.$inferSelect