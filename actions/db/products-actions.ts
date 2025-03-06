/**
 * @file products-actions.ts
 * @description
 * This server actions file handles CRUD operations for the `products` table.
 * It is part of Step 6 in the implementation plan: "Implement product management server actions."
 *
 * Responsibilities:
 * - Provide create, read, update, and delete functionality for Products
 * - Return ActionState<T> responses indicating success/failure
 * - Handle error logging and reporting with standardized patterns
 *
 * Exports:
 * - createProductAction
 * - getProductsByUserIdAction
 * - getProductByIdAction
 * - updateProductAction
 * - deleteProductAction
 *
 * Dependencies:
 * - Drizzle ORM for database interactions
 * - eq, desc from "drizzle-orm"
 * - InsertProduct, SelectProduct from "@/db/schema/products-schema"
 * - db from "@/db/db"
 * - ActionState from "@/types"
 * - handleActionError, createSuccessResponse for standardized error handling
 *
 * Edge cases & error handling:
 * - If userId is invalid or not found, we return isSuccess=false
 * - If product not found on update or delete, return isSuccess=false
 * - All database errors are caught and handled consistently
 * - Standardized error reporting with context information
 *
 * @notes
 * - Additional filtering methods can be added if needed (e.g. search by name).
 * - Potential expansions: pagination, sorting by name or price, etc.
 */

"use server"

import { db } from "@/db/db"
import { productsTable, InsertProduct, SelectProduct } from "@/db/schema/products-schema"
import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"

/**
 * Creates a new product record in the database.
 *
 * @async
 * @function createProductAction
 * @param {InsertProduct} data - The product data to insert.
 * @returns {Promise<ActionState<SelectProduct>>}
 *
 * @example
 * const newProduct = {
 *   userId: "user_12345",
 *   name: "Web Development Service",
 *   unitPrice: "120",
 *   taxRate: "10",
 *   isRecurring: false
 * }
 * const result = await createProductAction(newProduct)
 * if (result.isSuccess) console.log("Product created:", result.data)
 */
export async function createProductAction(
  data: InsertProduct
): Promise<ActionState<SelectProduct>> {
  try {
    const [newProduct] = await db.insert(productsTable).values(data).returning()
    
    return createSuccessResponse(
      newProduct,
      "Product created successfully",
      { operation: 'create', entityName: 'product' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'createProductAction',
      entityName: 'product',
      operation: 'create'
    })
  }
}

/**
 * Retrieves all products belonging to a given user.
 *
 * @async
 * @function getProductsByUserIdAction
 * @param {string} userId - The ID of the user whose products to retrieve.
 * @returns {Promise<ActionState<SelectProduct[]>>}
 *
 * @example
 * const userId = "user_12345"
 * const result = await getProductsByUserIdAction(userId)
 * if (result.isSuccess) console.log("Products:", result.data)
 */
export async function getProductsByUserIdAction(
  userId: string
): Promise<ActionState<SelectProduct[]>> {
  try {
    const products = await db.query.products.findMany({
      where: eq(productsTable.userId, userId),
      orderBy: [desc(productsTable.updatedAt)]
    })

    return createSuccessResponse(
      products,
      "Products retrieved successfully",
      { operation: 'read', entityName: 'products' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'getProductsByUserIdAction',
      entityName: 'products',
      operation: 'read',
      entityId: userId
    })
  }
}

/**
 * Retrieves a single product by its ID.
 *
 * @async
 * @function getProductByIdAction
 * @param {string} id - The ID of the product to retrieve.
 * @returns {Promise<ActionState<SelectProduct>>}
 *
 * @example
 * const productId = "3f3ccb87-2966-44c9-a37d-68b711986451"
 * const result = await getProductByIdAction(productId)
 * if (result.isSuccess) console.log("Product:", result.data)
 */
export async function getProductByIdAction(
  id: string
): Promise<ActionState<SelectProduct>> {
  try {
    const product = await db.query.products.findFirst({
      where: eq(productsTable.id, id)
    })

    if (!product) {
      return { isSuccess: false, message: "Product not found" }
    }

    return createSuccessResponse(
      product,
      "Product retrieved successfully",
      { operation: 'read', entityName: 'product' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'getProductByIdAction',
      entityName: 'product',
      operation: 'read',
      entityId: id
    })
  }
}

/**
 * Updates an existing product record.
 *
 * @async
 * @function updateProductAction
 * @param {string} id - The ID of the product to update.
 * @param {Partial<InsertProduct>} data - The product data to update.
 * @returns {Promise<ActionState<SelectProduct>>}
 *
 * @example
 * const productId = "3f3ccb87-2966-44c9-a37d-68b711986451"
 * const updatedData = {
 *   name: "Updated Service Name",
 *   description: "Updated service description"
 * }
 * const result = await updateProductAction(productId, updatedData)
 * if (result.isSuccess) console.log("Updated product:", result.data)
 */
export async function updateProductAction(
  id: string,
  data: Partial<InsertProduct>
): Promise<ActionState<SelectProduct>> {
  try {
    const [updatedProduct] = await db
      .update(productsTable)
      .set(data)
      .where(eq(productsTable.id, id))
      .returning()

    if (!updatedProduct) {
      return { isSuccess: false, message: "Product not found or not updated" }
    }

    return createSuccessResponse(
      updatedProduct,
      "Product updated successfully",
      { operation: 'update', entityName: 'product' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'updateProductAction',
      entityName: 'product',
      operation: 'update',
      entityId: id
    })
  }
}

/**
 * Deletes a product record from the database.
 *
 * @async
 * @function deleteProductAction
 * @param {string} id - The ID of the product to delete.
 * @returns {Promise<ActionState<void>>}
 *
 * @example
 * const productId = "3f3ccb87-2966-44c9-a37d-68b711986451"
 * const result = await deleteProductAction(productId)
 * if (result.isSuccess) console.log("Product deleted successfully")
 */
export async function deleteProductAction(
  id: string
): Promise<ActionState<void>> {
  try {
    const result = await db.delete(productsTable).where(eq(productsTable.id, id))

    if (result.length === 0) {
      return { isSuccess: false, message: "Product not found or already deleted" }
    }

    return createSuccessResponse(
      undefined,
      "Product deleted successfully",
      { operation: 'delete', entityName: 'product' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'deleteProductAction',
      entityName: 'product',
      operation: 'delete',
      entityId: id
    })
  }
}