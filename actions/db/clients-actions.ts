/**
 * @file clients-actions.ts
 * @description
 * Provides server actions for managing clients in the database. 
 * Follows the CRUD (Create, Read, Update, Delete) pattern for the "clients" table 
 * and returns ActionState results to maintain consistency across the application.
 *
 * Key features:
 * - Create a new client record
 * - Fetch a client's data by its ID
 * - Fetch all client records belonging to a user
 * - Update a client's data
 * - Delete a client record
 *
 * @dependencies
 * - db (from "@/db/db"): Drizzle ORM instance
 * - clientsTable (from "@/db/schema/clients-schema"): Drizzle schema for "clients" table
 * - ActionState<T>: Type representing the result (success/failure) of a server action
 * - handleActionError, createSuccessResponse: Standardized error and success handling utilities
 *
 * @notes
 * - Each action is declared with `"use server"` to enable server actions in Next.js
 * - We rely on eq from drizzle-orm for equality checks in queries
 * - We rely on the userId to ensure we only fetch or mutate data belonging to the correct user
 * - Uses standardized error handling for consistent error reporting
 */

"use server"

import { db } from "@/db/db"
import {
  clientsTable,
  InsertClient,
  SelectClient
} from "@/db/schema/clients-schema"
import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"

/**
 * @function createClientAction
 * @description Creates a new client record in the database
 * @param {InsertClient} data - The client data to insert
 * @returns {Promise<ActionState<SelectClient>>} The action result with the new client record, or an error
 *
 * @example
 * const newClient: InsertClient = {
 *   userId: "user_123",
 *   name: "Client Name",
 *   email: "client@example.com",
 *   ...
 * }
 * const result = await createClientAction(newClient)
 */
export async function createClientAction(
  data: InsertClient
): Promise<ActionState<SelectClient>> {
  try {
    const [newClient] = await db.insert(clientsTable).values(data).returning()
    
    return createSuccessResponse(
      newClient,
      "Client created successfully",
      { operation: 'create', entityName: 'client' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'createClientAction',
      entityName: 'client',
      operation: 'create'
    })
  }
}

/**
 * @function getClientsByUserIdAction
 * @description Retrieves all clients belonging to a specific user
 * @param {string} userId - The ID of the user whose clients to fetch
 * @returns {Promise<ActionState<SelectClient[]>>} The action result containing the user's clients, or an error
 *
 * @example
 * const userId = "user_123"
 * const result = await getClientsByUserIdAction(userId)
 */
export async function getClientsByUserIdAction(
  userId: string
): Promise<ActionState<SelectClient[]>> {
  try {
    const clients = await db.query.clients.findMany({
      where: eq(clientsTable.userId, userId),
      orderBy: [desc(clientsTable.updatedAt)]
    })

    return createSuccessResponse(
      clients,
      "Clients retrieved successfully",
      { operation: 'read', entityName: 'clients' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'getClientsByUserIdAction',
      entityName: 'clients',
      operation: 'read',
      entityId: userId
    })
  }
}

/**
 * @function getClientByIdAction
 * @description Fetches a single client record by its ID
 * @param {string} id - The client's primary key (UUID)
 * @returns {Promise<ActionState<SelectClient>>} The action result containing the client data, or an error
 *
 * @example
 * const clientId = "some-uuid"
 * const result = await getClientByIdAction(clientId)
 */
export async function getClientByIdAction(
  id: string
): Promise<ActionState<SelectClient>> {
  try {
    const client = await db.query.clients.findFirst({
      where: eq(clientsTable.id, id)
    })

    if (!client) {
      return {
        isSuccess: false,
        message: "Client not found"
      }
    }

    return createSuccessResponse(
      client,
      "Client retrieved successfully",
      { operation: 'read', entityName: 'client' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'getClientByIdAction',
      entityName: 'client',
      operation: 'read',
      entityId: id
    })
  }
}

/**
 * @function updateClientAction
 * @description Updates an existing client record
 * @param {string} id - The client's primary key (UUID)
 * @param {Partial<InsertClient>} data - The fields to update
 * @returns {Promise<ActionState<SelectClient>>} The action result with the updated client data, or an error
 *
 * @example
 * const clientId = "some-uuid"
 * const updateData = { name: "Updated Client Name" }
 * const result = await updateClientAction(clientId, updateData)
 */
export async function updateClientAction(
  id: string,
  data: Partial<InsertClient>
): Promise<ActionState<SelectClient>> {
  try {
    const [updatedClient] = await db
      .update(clientsTable)
      .set(data)
      .where(eq(clientsTable.id, id))
      .returning()

    if (!updatedClient) {
      return {
        isSuccess: false,
        message: "Client not found to update"
      }
    }

    return createSuccessResponse(
      updatedClient,
      "Client updated successfully",
      { operation: 'update', entityName: 'client' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'updateClientAction',
      entityName: 'client',
      operation: 'update',
      entityId: id
    })
  }
}

/**
 * @function deleteClientAction
 * @description Deletes a client record from the database
 * @param {string} id - The client's primary key (UUID)
 * @returns {Promise<ActionState<void>>} The action result indicating success or failure
 *
 * @example
 * const clientId = "some-uuid"
 * const result = await deleteClientAction(clientId)
 */
export async function deleteClientAction(id: string): Promise<ActionState<void>> {
  try {
    await db.delete(clientsTable).where(eq(clientsTable.id, id))
    
    return createSuccessResponse(
      undefined,
      "Client deleted successfully",
      { operation: 'delete', entityName: 'client' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'deleteClientAction',
      entityName: 'client',
      operation: 'delete',
      entityId: id
    })
  }
}