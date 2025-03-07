/**
@file Template management server actions
@description
This file contains server actions for managing invoice and quote templates.
It provides CRUD operations for templates including creating default templates
for new users, and retrieving templates by type and user ID.

Optimizations:


Improved schema imports to use centralized schema exports




Enhanced error handling with standardized patterns




Optimized database queries with more efficient patterns




Added transaction support for multi-operation actions



Key features:


Create, read, update and delete template actions




Get templates by type (invoice/quote)




Create default templates for new users




Mark templates as default



@dependencies


db: Drizzle ORM database instance




templatesTable: Database schema for templates




ActionState: Type for standardized action responses




handleActionError, createSuccessResponse: Utilities for error handling



@notes


Each template is tied to a specific user through userId




Default templates are created for new users




When a template is marked as default, other templates of the same type are updated
*/



"use server"
import { db } from "@/db/db"
import {
InsertTemplate,
SelectTemplate,
templatesTable,
templateTypeEnum
} from "@/db/schema"
import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { ActionState } from "@/types"
import { and, desc, eq } from "drizzle-orm"
/**

Creates a new template

@param data - The template data to insert
@returns Promise resolving to an ActionState with the created template
*/
export async function createTemplateAction(
data: InsertTemplate
): Promise<ActionState<SelectTemplate>> {
try {
// Use a transaction to ensure all operations succeed or fail together
return await db.transaction(async (tx) => {
// If this template is marked as default, we need to update other templates
// of the same type for this user to not be default
if (data.isDefault) {
await tx
.update(templatesTable)
.set({ isDefault: false })
.where(
and(
eq(templatesTable.userId, data.userId),
eq(templatesTable.type, data.type)
)
)
}
const [newTemplate] = await tx.insert(templatesTable).values(data).returning()
return createSuccessResponse(
newTemplate,
"Template created successfully",
{ operation: 'create', entityName: 'template' }
)
})
} catch (error) {
return handleActionError(error, {
actionName: 'createTemplateAction',
entityName: 'template',
operation: 'create'
})
}
}

/**

Creates default invoice and quote templates for a new user

@param userId - The user ID to create templates for
@returns Promise resolving to an ActionState with void data
*/
export async function createDefaultTemplatesAction(
userId: string
): Promise<ActionState<void>> {
try {
// Use a transaction to ensure both templates are created or none
await db.transaction(async (tx) => {
// Create default invoice template
await tx.insert(templatesTable).values({
userId,
name: "Default Invoice Template",
type: "invoice",
logoPosition: "top-left",
primaryColor: "#3b82f6", // blue-500
secondaryColor: "#ffffff",
font: "Inter",
paymentTerms: "Payment due within 30 days",
notes: "Thank you for your business!",
isDefault: true
})
// Create default quote template
await tx.insert(templatesTable).values({
userId,
name: "Default Quote Template",
type: "quote",
logoPosition: "top-left",
primaryColor: "#3b82f6", // blue-500
secondaryColor: "#ffffff",
font: "Inter",
paymentTerms: "This quote is valid for 30 days",
notes: "Thank you for considering our services!",
isDefault: true
})
})
return createSuccessResponse(
undefined,
"Default templates created successfully",
{ operation: 'create', entityName: 'default templates' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'createDefaultTemplatesAction',
entityName: 'default templates',
operation: 'create',
entityId: userId
})
}
}

/**

Gets all templates for a user

@param userId - The user ID to get templates for
@returns Promise resolving to an ActionState with an array of templates
*/
export async function getTemplatesByUserIdAction(
userId: string
): Promise<ActionState<SelectTemplate[]>> {
try {
const templates = await db.query.templates.findMany({
where: eq(templatesTable.userId, userId),
orderBy: [
// isDefault templates first (true before false)
desc(templatesTable.isDefault),
// Then by most recently updated
desc(templatesTable.updatedAt)
]
})
return createSuccessResponse(
templates,
"Templates retrieved successfully",
{ operation: 'read', entityName: 'templates' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getTemplatesByUserIdAction',
entityName: 'templates',
operation: 'read',
entityId: userId
})
}
}

/**

Gets templates of a specific type for a user

@param userId - The user ID to get templates for
@param type - The template type (invoice/quote)
@returns Promise resolving to an ActionState with an array of templates
*/
export async function getTemplatesByTypeAction(
userId: string,
type: typeof templateTypeEnum.enumValues[number]
): Promise<ActionState<SelectTemplate[]>> {
try {
const templates = await db.query.templates.findMany({
where: and(
eq(templatesTable.userId, userId),
eq(templatesTable.type, type)
),
orderBy: [
// isDefault templates first (true before false)
desc(templatesTable.isDefault),
// Then by most recently updated
desc(templatesTable.updatedAt)
]
})
return createSuccessResponse(
templates,
`${type} templates retrieved successfully`,
{ operation: 'read', entityName: `${type} templates` }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getTemplatesByTypeAction',
entityName: `${type} templates`,
operation: 'read',
entityId: userId
})
}
}

/**

Gets a single template by ID

@param id - The template ID to get
@returns Promise resolving to an ActionState with the template
*/
export async function getTemplateByIdAction(
id: string
): Promise<ActionState<SelectTemplate>> {
try {
const template = await db.query.templates.findFirst({
where: eq(templatesTable.id, id)
})
if (!template) {
return { isSuccess: false, message: "Template not found" }
}
return createSuccessResponse(
template,
"Template retrieved successfully",
{ operation: 'read', entityName: 'template' }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getTemplateByIdAction',
entityName: 'template',
operation: 'read',
entityId: id
})
}
}

/**

Gets the default template of a specific type for a user

@param userId - The user ID to get the template for
@param type - The template type (invoice/quote)
@returns Promise resolving to an ActionState with the template
*/
export async function getDefaultTemplateAction(
userId: string,
type: typeof templateTypeEnum.enumValues[number]
): Promise<ActionState<SelectTemplate>> {
try {
// First try to find the default template for this type
const template = await db.query.templates.findFirst({
where: and(
eq(templatesTable.userId, userId),
eq(templatesTable.type, type),
eq(templatesTable.isDefault, true)
)
})
if (template) {
return createSuccessResponse(
template,
`Default ${type} template retrieved successfully`,
{ operation: 'read', entityName: `default ${type} template` }
)
}
// If no default template found, get any template of this type
const anyTemplate = await db.query.templates.findFirst({
where: and(
eq(templatesTable.userId, userId),
eq(templatesTable.type, type)
),
orderBy: [desc(templatesTable.updatedAt)]
})
if (!anyTemplate) {
return { isSuccess: false, message: `No ${type} template found` }
}
return createSuccessResponse(
anyTemplate,
`${type} template found (not default)`,
{ operation: 'read', entityName: `${type} template` }
)
} catch (error) {
return handleActionError(error, {
actionName: 'getDefaultTemplateAction',
entityName: `default ${type} template`,
operation: 'read',
entityId: userId
})
}
}

/**

Updates a template

@param id - The template ID to update
@param data - The template data to update
@returns Promise resolving to an ActionState with the updated template
*/
export async function updateTemplateAction(
id: string,
data: Partial<InsertTemplate>
): Promise<ActionState<SelectTemplate>> {
try {
// Use a transaction to ensure all operations succeed or fail together
return await db.transaction(async (tx) => {
// Get the current template to check if we're changing the default status
const currentTemplate = await tx.query.templates.findFirst({
where: eq(templatesTable.id, id)
})
if (!currentTemplate) {
return { isSuccess: false, message: "Template not found to update" }
}
// If setting template as default, update other templates of same type
if (data.isDefault && !currentTemplate.isDefault && data.userId) {
await tx
.update(templatesTable)
.set({ isDefault: false })
.where(
and(
eq(templatesTable.userId, data.userId),
eq(templatesTable.type, currentTemplate.type),
eq(templatesTable.isDefault, true)
)
)
}
// Update the template
const [updatedTemplate] = await tx
.update(templatesTable)
.set({
...data,
updatedAt: new Date()
})
.where(eq(templatesTable.id, id))
.returning()
if (!updatedTemplate) {
return { isSuccess: false, message: "Template not found to update" }
}
return createSuccessResponse(
updatedTemplate,
"Template updated successfully",
{ operation: 'update', entityName: 'template' }
)
})
} catch (error) {
return handleActionError(error, {
actionName: 'updateTemplateAction',
entityName: 'template',
operation: 'update',
entityId: id
})
}
}

/**

Sets a template as the default for its type

@param id - The template ID to set as default
@returns Promise resolving to an ActionState with the updated template
*/
export async function setDefaultTemplateAction(
id: string
): Promise<ActionState<SelectTemplate>> {
try {
// Use a transaction to ensure all operations succeed or fail together
return await db.transaction(async (tx) => {
// Get the current template
const currentTemplate = await tx.query.templates.findFirst({
where: eq(templatesTable.id, id)
})
if (!currentTemplate) {
return { isSuccess: false, message: "Template not found" }
}
// Update all templates of the same type for this user to not be default
await tx
.update(templatesTable)
.set({ isDefault: false })
.where(
and(
eq(templatesTable.userId, currentTemplate.userId),
eq(templatesTable.type, currentTemplate.type)
)
)
// Set this template as default
const [updatedTemplate] = await tx
.update(templatesTable)
.set({
isDefault: true,
updatedAt: new Date()
})
.where(eq(templatesTable.id, id))
.returning()
return createSuccessResponse(
updatedTemplate,
"Template set as default successfully",
{ operation: 'update', entityName: 'template default status' }
)
})
} catch (error) {
return handleActionError(error, {
actionName: 'setDefaultTemplateAction',
entityName: 'template default status',
operation: 'update',
entityId: id
})
}
}

/**

Deletes a template

@param id - The template ID to delete
@returns Promise resolving to an ActionState with void data
*/
export async function deleteTemplateAction(
id: string
): Promise<ActionState<void>> {
try {
// Use a transaction to ensure all operations succeed or fail together
return await db.transaction(async (tx) => {
// Get the template before deleting to check if it's a default template
const template = await tx.query.templates.findFirst({
where: eq(templatesTable.id, id)
})
if (!template) {
return { isSuccess: false, message: "Template not found to delete" }
}
// Delete the template
await tx.delete(templatesTable).where(eq(templatesTable.id, id))
// If this was a default template, set another template of the same type as default
if (template.isDefault) {
// Find another template of the same type
const nextTemplate = await tx.query.templates.findFirst({
where: and(
eq(templatesTable.userId, template.userId),
eq(templatesTable.type, template.type)
),
orderBy: [desc(templatesTable.updatedAt)]
})
// If we found another template, make it the default
if (nextTemplate) {
  await tx
    .update(templatesTable)
    .set({ 
      isDefault: true,
      updatedAt: new Date()
    })
    .where(eq(templatesTable.id, nextTemplate.id))
}
}

return createSuccessResponse(
undefined,
"Template deleted successfully",
{ operation: 'delete', entityName: 'template' }
)
})
} catch (error) {
return handleActionError(error, {
actionName: 'deleteTemplateAction',
entityName: 'template',
operation: 'delete',
entityId: id
})
}
}