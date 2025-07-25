/**
@file Invoice management server actions
@description
Provides server actions for managing invoices and invoice items.
Handles CRUD operations for invoices and their line items with proper
transaction handling for data consistency.

Optimizations:


Improved schema imports to use centralized schema exports




Enhanced error handling with standardized patterns




Used proper transaction handling for multi-table operations




Optimized database queries with more efficient patterns



Key features:


Create, read, update and delete operations for invoices




Management of invoice items within transactions




Invoice number generation




Total calculations




Invoice status management



@dependencies


db: Drizzle ORM database instance




ActionState: Type for standardized action responses




handleActionError, createSuccessResponse: Utilities for error handling



@notes


All monetary values are stored as strings to prevent floating point issues




Transactions are used for operations affecting multiple tables




Generated invoice numbers follow a pattern like "INV-001", "INV-002", etc.
*/



"use server"
import { db } from "@/db/db"
import {
InsertInvoice,
InsertInvoiceItem,
SelectInvoice,
SelectInvoiceItem,
invoiceItemsTable,
invoicesTable
} from "@/db/schema"
import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { ActionState } from "@/types"
import { and, desc, eq } from "drizzle-orm"
/**

Generate a unique invoice number
Uses the format INV-XXXX where XXXX is a sequential number

@param userId - The ID of the user creating the invoice
@returns A Promise resolving to a unique invoice number string
*/
async function generateInvoiceNumber(userId: string): Promise<string> {
try {
// Get the latest invoice number for this user
const invoices = await db.query.invoices.findMany({
where: eq(invoicesTable.userId, userId),
orderBy: [desc(invoicesTable.invoiceNumber)],
limit: 1
})
if (invoices.length === 0) {
// First invoice for this user
return "INV-0001"
}
// Extract the number part and increment it
const latestInvoice = invoices[0]
const latestNumber = latestInvoice.invoiceNumber
const numberPart = latestNumber.split("-")[1]
const nextNumber = parseInt(numberPart, 10) + 1
// Format with leading zeros
return `INV-${nextNumber.toString().padStart(4, "0")}`
} catch (error) {
console.error("Error generating invoice number:", error)
// Fallback to timestamp-based number if we can't generate a sequential one
const timestamp = new Date().getTime()
return `INV-${timestamp}`
}
}

/**

Calculate invoice totals based on its items

@param items - Array of invoice items
@param discount - Optional discount amount as string
@returns Object containing subtotal, taxAmount, and total as strings
*/
function calculateInvoiceTotals(
items: (InsertInvoiceItem | SelectInvoiceItem)[],
discount: string = "0"
) {
// Calculate subtotal (sum of all item subtotals)
const subtotal = items.reduce(
(sum, item) => sum + parseFloat(item.subtotal),
0
).toFixed(2)

// Calculate total tax amount (sum of all item tax amounts)
const taxAmount = items.reduce(
(sum, item) => sum + parseFloat(item.taxAmount ?? "0"),
0
).toFixed(2)
// Calculate final total (subtotal + tax - discount)
const total = (
parseFloat(subtotal) +
parseFloat(taxAmount) -
parseFloat(discount || "0")
).toFixed(2)
return { subtotal, taxAmount, total }
}
/**

Create a new invoice with its items

@param data - Invoice data to be inserted
@param items - Array of invoice items to be inserted
@returns Promise resolving to an ActionState with the created invoice and items
*/
export async function createInvoiceAction(
data: InsertInvoice,
items: InsertInvoiceItem[]
): Promise<ActionState<{ invoice: SelectInvoice, items: SelectInvoiceItem[] }>> {
try {
// Generate invoice number if not provided
if (!data.invoiceNumber) {
data.invoiceNumber = await generateInvoiceNumber(data.userId)
}
// Calculate totals if not provided
if (!data.subtotal || !data.taxAmount || !data.total) {
const { subtotal, taxAmount, total } = calculateInvoiceTotals(
items,
data.discount
)
data.subtotal = subtotal
data.taxAmount = taxAmount
data.total = total
}
// Use a transaction to ensure all operations succeed or fail together
return await db.transaction(async (tx) => {
// Insert invoice
const [invoice] = await tx
.insert(invoicesTable)
.values(data)
.returning()
// Add invoice ID to each item
const itemsWithInvoiceId = items.map(item => ({
...item,
invoiceId: invoice.id
}))
// Insert all invoice items
const insertedItems = await tx
.insert(invoiceItemsTable)
.values(itemsWithInvoiceId)
.returning()
return createSuccessResponse(
{
invoice,
items: insertedItems
},
"Invoice created successfully",
{ operation: 'create', entityName: 'invoice' }
)
})
} catch (error) {
return handleActionError(error, {
actionName: 'createInvoiceAction',
entityName: 'invoice',
operation: 'create'
})
}
}

/**

Get all invoices for a user

@param userId - The ID of the user whose invoices to retrieve
@returns Promise resolving to an ActionState with an array of invoices
*/
export async function getInvoicesByUserIdAction(
userId: string
): Promise<ActionState<SelectInvoice[]>> {
try {
const invoices = await db.query.invoices.findMany({
where: eq(invoicesTable.userId, userId),
orderBy: [desc(invoicesTable.updatedAt)]
})
return createSuccessResponse(
invoices,
"Invoices retrieved successfully",
{ operation: 'read', entityName: 'invoices' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getInvoicesByUserIdAction',
entityName: 'invoices',
operation: 'read',
entityId: userId
})
}
}

/**

Get invoices for a specific client

@param clientId - The ID of the client whose invoices to retrieve
@returns Promise resolving to an ActionState with an array of invoices
*/
export async function getInvoicesByClientIdAction(
clientId: string
): Promise<ActionState<SelectInvoice[]>> {
try {
const invoices = await db.query.invoices.findMany({
where: eq(invoicesTable.clientId, clientId),
orderBy: [desc(invoicesTable.updatedAt)]
})
return createSuccessResponse(
invoices,
"Invoices retrieved successfully",
{ operation: 'read', entityName: 'invoices' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getInvoicesByClientIdAction',
entityName: 'invoices',
operation: 'read',
entityId: clientId
})
}
}

/**

Get a specific invoice by ID

@param id - The ID of the invoice to retrieve
@returns Promise resolving to an ActionState with the invoice
*/
export async function getInvoiceByIdAction(
id: string
): Promise<ActionState<SelectInvoice>> {
try {
const invoice = await db.query.invoices.findFirst({
where: eq(invoicesTable.id, id)
})
if (!invoice) {
return { isSuccess: false, message: "Invoice not found" }
}
return createSuccessResponse(
invoice,
"Invoice retrieved successfully",
{ operation: 'read', entityName: 'invoice' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getInvoiceByIdAction',
entityName: 'invoice',
operation: 'read',
entityId: id
})
}
}

/**

Get all items for a specific invoice

@param invoiceId - The ID of the invoice whose items to retrieve
@returns Promise resolving to an ActionState with an array of invoice items
*/
export async function getInvoiceItemsByInvoiceIdAction(
invoiceId: string
): Promise<ActionState<SelectInvoiceItem[]>> {
try {
const items = await db.query.invoiceItems.findMany({
where: eq(invoiceItemsTable.invoiceId, invoiceId),
})
return createSuccessResponse(
items,
"Invoice items retrieved successfully",
{ operation: 'read', entityName: 'invoice items' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getInvoiceItemsByInvoiceIdAction',
entityName: 'invoice items',
operation: 'read',
entityId: invoiceId
})
}
}

/**

Update an existing invoice and its items

@param id - The ID of the invoice to update
@param data - The updated invoice data
@param items - The updated array of invoice items
@returns Promise resolving to an ActionState with the updated invoice and items
*/
export async function updateInvoiceAction(
id: string,
data: Partial<InsertInvoice>,
items: SelectInvoiceItem[]
): Promise<ActionState<{ invoice: SelectInvoice, items: SelectInvoiceItem[] }>> {
try {
// Calculate new totals if items are provided and totals are not
if (items.length > 0 && (!data.subtotal || !data.taxAmount || !data.total)) {
const { subtotal, taxAmount, total } = calculateInvoiceTotals(
items,
data.discount
)
data.subtotal = subtotal
data.taxAmount = taxAmount
data.total = total
}
// Use a transaction for data consistency
return await db.transaction(async (tx) => {
// Update the invoice
const [updatedInvoice] = await tx
.update(invoicesTable)
.set(data)
.where(eq(invoicesTable.id, id))
.returning()
if (!updatedInvoice) {
throw new Error("Invoice not found")
}
// Handle invoice items - first delete existing ones
await tx
.delete(invoiceItemsTable)
.where(eq(invoiceItemsTable.invoiceId, id))
// Then insert the updated items
const itemsWithInvoiceId = items.map(item => ({
...item,
invoiceId: id
}))
const updatedItems = await tx
.insert(invoiceItemsTable)
.values(itemsWithInvoiceId)
.returning()
return createSuccessResponse(
{
invoice: updatedInvoice,
items: updatedItems
},
"Invoice updated successfully",
{ operation: 'update', entityName: 'invoice' }
)
})
} catch (error) {
return handleActionError(error, {
actionName: 'updateInvoiceAction',
entityName: 'invoice',
operation: 'update',
entityId: id
})
}
}

/**

Update the status of an invoice

@param id - The ID of the invoice to update
@param status - The new status value
@returns Promise resolving to an ActionState with the updated invoice
*/
export async function updateInvoiceStatusAction(
id: string,
status: SelectInvoice["status"]
): Promise<ActionState<SelectInvoice>> {
try {
const [updatedInvoice] = await db
.update(invoicesTable)
.set({ status })
.where(eq(invoicesTable.id, id))
.returning()
if (!updatedInvoice) {
return { isSuccess: false, message: "Invoice not found" }
}
return createSuccessResponse(
updatedInvoice,
"Invoice status updated successfully",
{ operation: 'update', entityName: 'invoice status' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'updateInvoiceStatusAction',
entityName: 'invoice status',
operation: 'update',
entityId: id
})
}
}

/**

Delete an invoice and all its items

@param id - The ID of the invoice to delete
@returns Promise resolving to an ActionState with no data
*/
export async function deleteInvoiceAction(
id: string
): Promise<ActionState<void>> {
try {
// Use cascade delete defined in the schema to automatically delete items
await db
.delete(invoicesTable)
.where(eq(invoicesTable.id, id))
return createSuccessResponse(
undefined,
"Invoice deleted successfully",
{ operation: 'delete', entityName: 'invoice' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'deleteInvoiceAction',
entityName: 'invoice',
operation: 'delete',
entityId: id
})
}
}

/**

Verify that an invoice belongs to a specific user
Used for authorization checks

@param invoiceId - The ID of the invoice to check
@param userId - The ID of the user to verify against
@returns Promise resolving to an ActionState boolean indicating ownership
*/
export async function verifyInvoiceOwnerAction(
invoiceId: string,
userId: string
): Promise<ActionState<boolean>> {
try {
const invoice = await db.query.invoices.findFirst({
where: and(
eq(invoicesTable.id, invoiceId),
eq(invoicesTable.userId, userId)
)
})
return createSuccessResponse(
!!invoice,
invoice ? "Invoice belongs to user" : "Invoice does not belong to user",
{ operation: 'read', entityName: 'invoice ownership' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'verifyInvoiceOwnerAction',
entityName: 'invoice ownership',
operation: 'read',
entityId: invoiceId
})
}
}