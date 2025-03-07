/**
@file Quote management server actions
@description
Provides server actions for managing quotes and quote items.
Implements CRUD operations and specialized functions for quotes management.

Optimizations:


Improved schema imports to use centralized schema exports




Enhanced error handling with standardized patterns




Used proper transaction handling for multi-table operations




Optimized database queries with more efficient patterns



Key features:


Quote creation with line items




Quote retrieval by various criteria (user, client, ID)




Quote updates including status changes




Quote deletion with cascading item deletion




Quote number generation with sequential numbering



@dependencies


db: Database connection




schema: Database schema definitions for quotes and quote items




drizzle-orm: ORM for database operations




server-action-types: Type definitions for action responses




handleActionError, createSuccessResponse: For standardized error handling



@notes


Uses transactions for operations that modify multiple tables




Implements proper error handling for all database operations




Validates ownership before performing sensitive operations




Uses string for monetary values to avoid floating point issues
*/



"use server"
import { db } from "@/db/db"
import {
InsertQuote,
InsertQuoteItem,
quoteItemsTable,
quotesTable,
SelectQuote,
SelectQuoteItem
} from "@/db/schema"
import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { ActionState } from "@/types"
import { and, desc, eq } from "drizzle-orm"
/**

Generates a sequential quote number for a new quote
Format: Q-XXXXX where XXXXX is a zero-padded sequential number
If no quotes exist, starts with Q-00001

@param userId - The user ID to generate the quote number for
@returns A promise resolving to a string with the new quote number
*/
async function generateQuoteNumber(userId: string): Promise<string> {
try {
// Get the latest quote for this user
const quotes = await db.query.quotes.findMany({
where: eq(quotesTable.userId, userId),
orderBy: [desc(quotesTable.createdAt)],
limit: 1
})
// If no quotes exist, start with Q-00001
if (!quotes.length) {
  return `Q-00001`
}
const latestQuote = quotes[0]
const latestNumber = latestQuote.quoteNumber
// Extract the number part and increment
const numberPart = latestNumber.split("-")[1]
const nextNumber = parseInt(numberPart, 10) + 1
// Format with leading zeros (5 digits)
return `Q-${nextNumber.toString().padStart(5, "0")}`
} catch (error) {
console.error("Error generating quote number:", error)
// Fallback to timestamp if there's an error
const timestamp = new Date().getTime()
return `Q-${timestamp}`
}
}

/**

Calculates totals for a quote based on its items
Computes subtotal, tax amount, and total with discount

@param items - Array of quote items to calculate totals from
@param discount - Optional discount amount (defaults to "0")
@returns Object with calculated subtotal, taxAmount, and total
*/
function calculateQuoteTotals(
items: (InsertQuoteItem | SelectQuoteItem)[],
discount: string = "0"
) {
// Calculate subtotal (sum of all items' subtotals)
const subtotal = items.reduce(
(sum, item) => sum + parseFloat(item.subtotal), 0
).toFixed(2)

// Calculate tax amount (sum of all items' tax amounts)
const taxAmount = items.reduce(
(sum, item) => sum + parseFloat(item.taxAmount ?? "0"), 0
).toFixed(2)
// Calculate total (subtotal + taxAmount - discount)
const total = (
parseFloat(subtotal) +
parseFloat(taxAmount) -
parseFloat(discount || "0")
).toFixed(2)
return { subtotal, taxAmount, total }
}
/**

Creates a new quote with associated items

@param data - Quote data to insert
@param items - Quote line items to associate with the quote
@returns Promise resolving to an ActionState with the created quote and items
*/
export async function createQuoteAction(
data: InsertQuote,
items: InsertQuoteItem[]
): Promise<ActionState<{
quote: SelectQuote
items: SelectQuoteItem[]
}>> {
try {
// Generate quote number if not provided
if (!data.quoteNumber) {
data.quoteNumber = await generateQuoteNumber(data.userId)
}
// Calculate totals from items
const { subtotal, taxAmount, total } = calculateQuoteTotals(
items,
data.discount
)
// Prepare quote data with calculated values
const quoteData = {
...data,
subtotal,
taxAmount,
total
}
// Use transaction to ensure all operations succeed or fail together
return await db.transaction(async (tx) => {
// Insert quote
const [quote] = await tx
.insert(quotesTable)
.values(quoteData)
.returning()
// Associate items with the new quote
const itemsWithQuoteId = items.map(item => ({
...item,
quoteId: quote.id
}))
// Insert all quote items
const insertedItems = await tx
.insert(quoteItemsTable)
.values(itemsWithQuoteId)
.returning()
return createSuccessResponse(
{
quote,
items: insertedItems
},
"Quote created successfully",
{ operation: 'create', entityName: 'quote' }
)
})
} catch (error) {
return handleActionError(error, {
actionName: 'createQuoteAction',
entityName: 'quote',
operation: 'create'
})
}
}

/**

Retrieves all quotes for a specific user

@param userId - User ID to retrieve quotes for
@returns Promise resolving to an ActionState with an array of quotes
*/
export async function getQuotesByUserIdAction(
userId: string
): Promise<ActionState<SelectQuote[]>> {
try {
const quotes = await db.query.quotes.findMany({
where: eq(quotesTable.userId, userId),
orderBy: [desc(quotesTable.createdAt)]
})
return createSuccessResponse(
quotes,
"Quotes retrieved successfully",
{ operation: 'read', entityName: 'quotes' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getQuotesByUserIdAction',
entityName: 'quotes',
operation: 'read',
entityId: userId
})
}
}

/**

Retrieves all quotes for a specific client

@param clientId - Client ID to retrieve quotes for
@returns Promise resolving to an ActionState with an array of quotes
*/
export async function getQuotesByClientIdAction(
clientId: string
): Promise<ActionState<SelectQuote[]>> {
try {
const quotes = await db.query.quotes.findMany({
where: eq(quotesTable.clientId, clientId),
orderBy: [desc(quotesTable.createdAt)]
})
return createSuccessResponse(
quotes,
"Quotes retrieved successfully",
{ operation: 'read', entityName: 'quotes' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getQuotesByClientIdAction',
entityName: 'quotes',
operation: 'read',
entityId: clientId
})
}
}

/**

Retrieves a specific quote by ID

@param id - Quote ID to retrieve
@returns Promise resolving to an ActionState with the quote if found
*/
export async function getQuoteByIdAction(
id: string
): Promise<ActionState<SelectQuote>> {
try {
const quote = await db.query.quotes.findFirst({
where: eq(quotesTable.id, id)
})
if (!quote) {
return { isSuccess: false, message: "Quote not found" }
}
return createSuccessResponse(
quote,
"Quote retrieved successfully",
{ operation: 'read', entityName: 'quote' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getQuoteByIdAction',
entityName: 'quote',
operation: 'read',
entityId: id
})
}
}

/**

Retrieves all quote items for a specific quote

@param quoteId - Quote ID to retrieve items for
@returns Promise resolving to an ActionState with an array of quote items
*/
export async function getQuoteItemsByQuoteIdAction(
quoteId: string
): Promise<ActionState<SelectQuoteItem[]>> {
try {
const items = await db.query.quoteItems.findMany({
where: eq(quoteItemsTable.quoteId, quoteId)
})
return createSuccessResponse(
items,
"Quote items retrieved successfully",
{ operation: 'read', entityName: 'quote items' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getQuoteItemsByQuoteIdAction',
entityName: 'quote items',
operation: 'read',
entityId: quoteId
})
}
}

/**

Updates an existing quote and its items
Replaces all existing items with the provided ones

@param id - Quote ID to update
@param data - Partial quote data to update
@param items - Complete set of items to replace existing ones
@returns Promise resolving to an ActionState with the updated quote and items
*/
export async function updateQuoteAction(
id: string,
data: Partial<InsertQuote>,
items: SelectQuoteItem[]
): Promise<ActionState<{
quote: SelectQuote
items: SelectQuoteItem[]
}>> {
try {
// Calculate totals if items are provided
let subtotal = data.subtotal
let taxAmount = data.taxAmount
let total = data.total
if (items.length > 0) {
const totals = calculateQuoteTotals(items, data.discount || "0")
subtotal = totals.subtotal
taxAmount = totals.taxAmount
total = totals.total
}
// Prepare updated data
const updateData = {
...data,
subtotal,
taxAmount,
total,
updatedAt: new Date()
}
// Use transaction to ensure all operations succeed or fail together
return await db.transaction(async (tx) => {
// Update quote
const [updatedQuote] = await tx
.update(quotesTable)
.set(updateData)
.where(eq(quotesTable.id, id))
.returning()
if (!updatedQuote) {
throw new Error("Quote not found")
}
// Delete existing items and replace with new ones
await tx
.delete(quoteItemsTable)
.where(eq(quoteItemsTable.quoteId, id))
// Prepare items with the quote ID
const itemsWithQuoteId = items.map(item => ({
...item,
quoteId: id,
id: undefined // Remove ids to generate new ones
}))
// Insert updated items
const updatedItems = await tx
.insert(quoteItemsTable)
.values(itemsWithQuoteId)
.returning()
return createSuccessResponse(
{
quote: updatedQuote,
items: updatedItems
},
"Quote updated successfully",
{ operation: 'update', entityName: 'quote' }
)
})
} catch (error) {
return handleActionError(error, {
actionName: 'updateQuoteAction',
entityName: 'quote',
operation: 'update',
entityId: id
})
}
}

/**

Updates the status of a quote

@param id - Quote ID to update
@param status - New status to set
@returns Promise resolving to an ActionState with the updated quote
*/
export async function updateQuoteStatusAction(
id: string,
status: SelectQuote["status"]
): Promise<ActionState<SelectQuote>> {
try {
const [updatedQuote] = await db
.update(quotesTable)
.set({
status,
updatedAt: new Date()
})
.where(eq(quotesTable.id, id))
.returning()
if (!updatedQuote) {
return { isSuccess: false, message: "Quote not found" }
}
return createSuccessResponse(
updatedQuote,
"Quote status updated successfully",
{ operation: 'update', entityName: 'quote status' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'updateQuoteStatusAction',
entityName: 'quote status',
operation: 'update',
entityId: id
})
}
}

/**

Deletes a quote and all associated items

@param id - Quote ID to delete
@returns Promise resolving to an ActionState indicating success/failure
*/
export async function deleteQuoteAction(
id: string
): Promise<ActionState<void>> {
try {
// Quote items will be automatically deleted due to ON DELETE CASCADE
// in the database schema
await db
.delete(quotesTable)
.where(eq(quotesTable.id, id))
return createSuccessResponse(
undefined,
"Quote deleted successfully",
{ operation: 'delete', entityName: 'quote' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'deleteQuoteAction',
entityName: 'quote',
operation: 'delete',
entityId: id
})
}
}

/**

Verifies if a quote belongs to a specific user
Used for authorization checks before performing sensitive operations

@param quoteId - Quote ID to check
@param userId - User ID to verify ownership against
@returns Promise resolving to an ActionState with boolean indicating ownership
*/
export async function verifyQuoteOwnerAction(
quoteId: string,
userId: string
): Promise<ActionState<boolean>> {
try {
const quote = await db.query.quotes.findFirst({
where: and(
eq(quotesTable.id, quoteId),
eq(quotesTable.userId, userId)
)
})
return createSuccessResponse(
!!quote,
quote ? "User is the owner of this quote" : "User is not the owner of this quote",
{ operation: 'read', entityName: 'quote ownership' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'verifyQuoteOwnerAction',
entityName: 'quote ownership',
operation: 'read',
entityId: quoteId
})
}
}