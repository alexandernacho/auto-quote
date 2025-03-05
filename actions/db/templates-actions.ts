/**
 * @file Template management server actions
 * @description 
 * This file contains server actions for managing invoice and quote templates.
 * It provides CRUD operations for templates including creating default templates
 * for new users, and retrieving templates by type and user ID.
 * 
 * Key features:
 * - Create, read, update and delete template actions
 * - Get templates by type (invoice/quote)
 * - Create default templates for new users
 * - Mark templates as default
 * 
 * @dependencies
 * - Drizzle ORM: For database operations
 * - Database schema: For type definitions and table references
 * - ActionState type: For consistent return values
 * 
 * @notes
 * - Each template is tied to a specific user through userId
 * - Default templates are created for new users
 * - When a template is marked as default, other templates of the same type are updated
 */

"use server"

import { db } from "@/db/db"
import {
  InsertTemplate,
  SelectTemplate,
  templatesTable,
  templateTypeEnum
} from "@/db/schema/templates-schema"
import { ActionState } from "@/types"
import { and, eq } from "drizzle-orm"

/**
 * Creates a new template
 * 
 * @param data - The template data to insert
 * @returns Promise resolving to an ActionState with the created template
 */
export async function createTemplateAction(
  data: InsertTemplate
): Promise<ActionState<SelectTemplate>> {
  try {
    // If this template is marked as default, we need to update other templates
    // of the same type for this user to not be default
    if (data.isDefault) {
      await db
        .update(templatesTable)
        .set({ isDefault: false })
        .where(
          and(
            eq(templatesTable.userId, data.userId),
            eq(templatesTable.type, data.type)
          )
        )
    }

    const [newTemplate] = await db.insert(templatesTable).values(data).returning()

    return {
      isSuccess: true,
      message: "Template created successfully",
      data: newTemplate
    }
  } catch (error) {
    console.error("Error creating template:", error)
    return { isSuccess: false, message: "Failed to create template" }
  }
}

/**
 * Creates default invoice and quote templates for a new user
 * 
 * @param userId - The user ID to create templates for
 * @returns Promise resolving to an ActionState with void data
 */
export async function createDefaultTemplatesAction(
  userId: string
): Promise<ActionState<void>> {
  try {
    // Create default invoice template
    await db.insert(templatesTable).values({
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
    await db.insert(templatesTable).values({
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

    return {
      isSuccess: true,
      message: "Default templates created successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error creating default templates:", error)
    return { isSuccess: false, message: "Failed to create default templates" }
  }
}

/**
 * Gets all templates for a user
 * 
 * @param userId - The user ID to get templates for
 * @returns Promise resolving to an ActionState with an array of templates
 */
export async function getTemplatesByUserIdAction(
  userId: string
): Promise<ActionState<SelectTemplate[]>> {
  try {
    const templates = await db.query.templates.findMany({
      where: eq(templatesTable.userId, userId),
      orderBy: [templatesTable.isDefault, templatesTable.updatedAt]
    })

    return {
      isSuccess: true,
      message: "Templates retrieved successfully",
      data: templates
    }
  } catch (error) {
    console.error("Error getting templates:", error)
    return { isSuccess: false, message: "Failed to get templates" }
  }
}

/**
 * Gets templates of a specific type for a user
 * 
 * @param userId - The user ID to get templates for
 * @param type - The template type (invoice/quote)
 * @returns Promise resolving to an ActionState with an array of templates
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
      orderBy: [templatesTable.isDefault, templatesTable.updatedAt]
    })

    return {
      isSuccess: true,
      message: `${type} templates retrieved successfully`,
      data: templates
    }
  } catch (error) {
    console.error(`Error getting ${type} templates:`, error)
    return { isSuccess: false, message: `Failed to get ${type} templates` }
  }
}

/**
 * Gets a single template by ID
 * 
 * @param id - The template ID to get
 * @returns Promise resolving to an ActionState with the template
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

    return {
      isSuccess: true,
      message: "Template retrieved successfully",
      data: template
    }
  } catch (error) {
    console.error("Error getting template:", error)
    return { isSuccess: false, message: "Failed to get template" }
  }
}

/**
 * Gets the default template of a specific type for a user
 * 
 * @param userId - The user ID to get the template for
 * @param type - The template type (invoice/quote)
 * @returns Promise resolving to an ActionState with the template
 */
export async function getDefaultTemplateAction(
  userId: string,
  type: typeof templateTypeEnum.enumValues[number]
): Promise<ActionState<SelectTemplate>> {
  try {
    const template = await db.query.templates.findFirst({
      where: and(
        eq(templatesTable.userId, userId),
        eq(templatesTable.type, type),
        eq(templatesTable.isDefault, true)
      )
    })

    if (!template) {
      // If no default template found, get any template of this type
      const anyTemplate = await db.query.templates.findFirst({
        where: and(
          eq(templatesTable.userId, userId),
          eq(templatesTable.type, type)
        )
      })

      if (!anyTemplate) {
        return { isSuccess: false, message: `No ${type} template found` }
      }

      return {
        isSuccess: true,
        message: `${type} template found (not default)`,
        data: anyTemplate
      }
    }

    return {
      isSuccess: true,
      message: `Default ${type} template retrieved successfully`,
      data: template
    }
  } catch (error) {
    console.error(`Error getting default ${type} template:`, error)
    return { isSuccess: false, message: `Failed to get default ${type} template` }
  }
}

/**
 * Updates a template
 * 
 * @param id - The template ID to update
 * @param data - The template data to update
 * @returns Promise resolving to an ActionState with the updated template
 */
export async function updateTemplateAction(
  id: string,
  data: Partial<InsertTemplate>
): Promise<ActionState<SelectTemplate>> {
  try {
    // Get the current template to check if we're changing the default status
    const currentTemplateResult = await getTemplateByIdAction(id)
    
    if (!currentTemplateResult.isSuccess) {
      return { isSuccess: false, message: "Template not found to update" }
    }
    
    const currentTemplate = currentTemplateResult.data
    
    // If setting template as default, update other templates of same type
    if (data.isDefault && !currentTemplate.isDefault && data.userId) {
      await db
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

    const [updatedTemplate] = await db
      .update(templatesTable)
      .set(data)
      .where(eq(templatesTable.id, id))
      .returning()

    if (!updatedTemplate) {
      return { isSuccess: false, message: "Template not found to update" }
    }

    return {
      isSuccess: true,
      message: "Template updated successfully",
      data: updatedTemplate
    }
  } catch (error) {
    console.error("Error updating template:", error)
    return { isSuccess: false, message: "Failed to update template" }
  }
}

/**
 * Sets a template as the default for its type
 * 
 * @param id - The template ID to set as default
 * @returns Promise resolving to an ActionState with the updated template
 */
export async function setDefaultTemplateAction(
  id: string
): Promise<ActionState<SelectTemplate>> {
  try {
    // Get the current template
    const currentTemplateResult = await getTemplateByIdAction(id)
    
    if (!currentTemplateResult.isSuccess) {
      return { isSuccess: false, message: "Template not found" }
    }
    
    const currentTemplate = currentTemplateResult.data
    
    // Update all templates of the same type for this user to not be default
    await db
      .update(templatesTable)
      .set({ isDefault: false })
      .where(
        and(
          eq(templatesTable.userId, currentTemplate.userId),
          eq(templatesTable.type, currentTemplate.type)
        )
      )
    
    // Set this template as default
    const [updatedTemplate] = await db
      .update(templatesTable)
      .set({ isDefault: true })
      .where(eq(templatesTable.id, id))
      .returning()

    return {
      isSuccess: true,
      message: "Template set as default successfully",
      data: updatedTemplate
    }
  } catch (error) {
    console.error("Error setting template as default:", error)
    return { isSuccess: false, message: "Failed to set template as default" }
  }
}

/**
 * Deletes a template
 * 
 * @param id - The template ID to delete
 * @returns Promise resolving to an ActionState with void data
 */
export async function deleteTemplateAction(
  id: string
): Promise<ActionState<void>> {
  try {
    // Get the template before deleting to check if it's a default template
    const templateResult = await getTemplateByIdAction(id)
    
    if (!templateResult.isSuccess) {
      return { isSuccess: false, message: "Template not found to delete" }
    }
    
    const template = templateResult.data
    
    // Delete the template
    await db.delete(templatesTable).where(eq(templatesTable.id, id))
    
    // If this was a default template, set another template of the same type as default
    if (template.isDefault) {
      const templatesResult = await getTemplatesByTypeAction(
        template.userId,
        template.type
      )
      
      if (templatesResult.isSuccess && templatesResult.data.length > 0) {
        await setDefaultTemplateAction(templatesResult.data[0].id)
      }
    }

    return {
      isSuccess: true,
      message: "Template deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting template:", error)
    return { isSuccess: false, message: "Failed to delete template" }
  }
}