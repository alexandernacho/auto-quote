/**
 * @file Document generation server actions
 * @description 
 * Provides server actions for generating and managing document files (PDF/DOCX).
 * Handles generation, storage, and retrieval of invoice and quote documents.
 * 
 * Key features:
 * - Generate PDF documents for invoices and quotes
 * - Generate DOCX documents for invoices and quotes
 * - Upload generated documents to Supabase Storage
 * - Get URLs for document download
 * 
 * @dependencies
 * - generatePdf: PDF generation utility
 * - generateDocx: DOCX generation utility
 * - Supabase: For document storage
 * - Database actions: For retrieving data to generate documents
 * 
 * @notes
 * - Documents are stored in Supabase Storage with a path structure based on userId, documentType, and documentId
 * - Uses a consistent naming pattern for files: {invoice|quote}-{number}-{timestamp}.{pdf|docx}
 * - Handles both PDF and DOCX formats with separate generators
 */

"use server"

import {
  getClientByIdAction,
  getProfileByUserIdAction,
  getTemplateByIdAction,
  getInvoiceByIdAction,
  getInvoiceItemsByInvoiceIdAction,
  getQuoteByIdAction,
  getQuoteItemsByQuoteIdAction,
  getDefaultTemplateAction
} from "@/actions/db"
import { generatePdf } from "@/lib/document/pdf-generator"
import { generateDocx } from "@/lib/document/docx-generator"
import { createClient } from "@supabase/supabase-js"
import { auth } from "@clerk/nextjs/server"
import { ActionState } from "@/types"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a document (PDF or DOCX) for an invoice or quote
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param id Document ID
 * @param format Output format ('pdf' or 'docx')
 * @returns Promise resolving to an ActionState with the document URL
 */
export async function generateDocumentAction(
  type: 'invoice' | 'quote',
  id: string,
  format: 'pdf' | 'docx' = 'pdf'
): Promise<ActionState<{ url: string }>> {
  const { userId } = await auth()
  
  if (!userId) {
    return { isSuccess: false, message: "Unauthorized" }
  }
  
  try {
    // Get document data
    let document;
    let items;
    let template;
    let client;
    let documentNumber;
    
    // Fetch the appropriate document and items based on type
    if (type === 'invoice') {
      const invoiceResult = await getInvoiceByIdAction(id)
      if (!invoiceResult.isSuccess) {
        return { isSuccess: false, message: "Invoice not found" }
      }
      document = invoiceResult.data
      documentNumber = document.invoiceNumber
      
      const itemsResult = await getInvoiceItemsByInvoiceIdAction(id)
      items = itemsResult.isSuccess ? itemsResult.data : []
    } else {
      const quoteResult = await getQuoteByIdAction(id)
      if (!quoteResult.isSuccess) {
        return { isSuccess: false, message: "Quote not found" }
      }
      document = quoteResult.data
      documentNumber = document.quoteNumber
      
      const itemsResult = await getQuoteItemsByQuoteIdAction(id)
      items = itemsResult.isSuccess ? itemsResult.data : []
    }
    
    // Verify the document belongs to the authenticated user
    if (document.userId !== userId) {
      return { isSuccess: false, message: "Unauthorized access to document" }
    }
    
    // Get template
    if (document.templateId) {
      const templateResult = await getTemplateByIdAction(document.templateId)
      if (templateResult.isSuccess) {
        template = templateResult.data
      }
    }
    
    // Fallback to default template if no template is found
    if (!template) {
      const defaultTemplateResult = await getDefaultTemplateAction(userId, type)
      if (!defaultTemplateResult.isSuccess) {
        return { isSuccess: false, message: "No template found for document" }
      }
      template = defaultTemplateResult.data
    }
    
    // Get client if exists
    if (document.clientId) {
      const clientResult = await getClientByIdAction(document.clientId)
      if (clientResult.isSuccess) {
        client = clientResult.data
      }
    }
    
    // Get user profile
    const profileResult = await getProfileByUserIdAction(userId)
    if (!profileResult.isSuccess) {
      return { isSuccess: false, message: "User profile not found" }
    }
    const profile = profileResult.data
    
    // Prepare document data for generation
    const documentData = {
      type,
      document,
      items,
      template,
      client,
      profile
    }
    
    // Generate document based on requested format
    let fileBuffer: Buffer;
    if (format === 'pdf') {
      fileBuffer = await generatePdf(documentData)
    } else {
      fileBuffer = await generateDocx(documentData)
    }
    
    // Create filename with timestamp to prevent collisions
    const timestamp = new Date().getTime()
    const filename = `${type}-${documentNumber.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.${format}`
    const path = `${userId}/${type}s/${id}/${filename}`
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .upload(path, fileBuffer, {
        contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      })
    
    if (error) {
      throw error
    }
    
    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .getPublicUrl(path)
    
    return {
      isSuccess: true,
      message: `${type} ${format.toUpperCase()} generated successfully`,
      data: { url: urlData.publicUrl }
    }
  } catch (error) {
    console.error(`Error generating ${type} ${format}:`, error)
    return { 
      isSuccess: false, 
      message: `Failed to generate ${type} ${format}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get a list of all generated documents for a specific invoice or quote
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param id Document ID
 * @returns Promise resolving to an ActionState with an array of document URLs and metadata
 */
export async function getDocumentFilesAction(
  type: 'invoice' | 'quote',
  id: string
): Promise<ActionState<{ name: string, format: string, url: string, createdAt: string }[]>> {
  const { userId } = await auth()
  
  if (!userId) {
    return { isSuccess: false, message: "Unauthorized" }
  }
  
  try {
    // List files in the document directory
    const path = `${userId}/${type}s/${id}`
    
    const { data, error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .list(path)
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      return {
        isSuccess: true,
        message: "No document files found",
        data: []
      }
    }
    
    // Process file information
    const files = await Promise.all(data.map(async (file) => {
      // Get file format from filename extension
      const format = file.name.split('.').pop() || ''
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
        .getPublicUrl(`${path}/${file.name}`)
      
      return {
        name: file.name,
        format: format.toUpperCase(),
        url: urlData.publicUrl,
        createdAt: new Date(file.created_at || '').toISOString()
      }
    }))
    
    // Sort files by creation date (most recent first)
    files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return {
      isSuccess: true,
      message: "Document files retrieved successfully",
      data: files
    }
  } catch (error) {
    console.error(`Error getting ${type} document files:`, error)
    return { 
      isSuccess: false, 
      message: `Failed to get ${type} document files`
    }
  }
}

/**
 * Delete a document file
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param id Document ID
 * @param filename Name of the file to delete
 * @returns Promise resolving to an ActionState indicating success or failure
 */
export async function deleteDocumentFileAction(
  type: 'invoice' | 'quote',
  id: string,
  filename: string
): Promise<ActionState<void>> {
  const { userId } = await auth()
  
  if (!userId) {
    return { isSuccess: false, message: "Unauthorized" }
  }
  
  try {
    // Construct the full path
    const path = `${userId}/${type}s/${id}/${filename}`
    
    // Delete the file
    const { error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .remove([path])
    
    if (error) {
      throw error
    }
    
    return {
      isSuccess: true,
      message: "Document file deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error(`Error deleting ${type} document file:`, error)
    return { 
      isSuccess: false, 
      message: `Failed to delete ${type} document file`
    }
  }
}

/**
 * Generate a document for email attachment
 * This is similar to generateDocumentAction but returns the file buffer instead of URL
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param id Document ID
 * @param format Output format ('pdf' or 'docx')
 * @returns Promise resolving to an ActionState with the document buffer and name
 */
export async function generateDocumentForEmailAction(
  type: 'invoice' | 'quote',
  id: string,
  format: 'pdf' | 'docx' = 'pdf'
): Promise<ActionState<{ buffer: Buffer, filename: string }>> {
  const { userId } = await auth()
  
  if (!userId) {
    return { isSuccess: false, message: "Unauthorized" }
  }
  
  try {
    // Get document data (same as in generateDocumentAction)
    let document;
    let items;
    let template;
    let client;
    let documentNumber;
    
    if (type === 'invoice') {
      const invoiceResult = await getInvoiceByIdAction(id)
      if (!invoiceResult.isSuccess) {
        return { isSuccess: false, message: "Invoice not found" }
      }
      document = invoiceResult.data
      documentNumber = document.invoiceNumber
      
      const itemsResult = await getInvoiceItemsByInvoiceIdAction(id)
      items = itemsResult.isSuccess ? itemsResult.data : []
    } else {
      const quoteResult = await getQuoteByIdAction(id)
      if (!quoteResult.isSuccess) {
        return { isSuccess: false, message: "Quote not found" }
      }
      document = quoteResult.data
      documentNumber = document.quoteNumber
      
      const itemsResult = await getQuoteItemsByQuoteIdAction(id)
      items = itemsResult.isSuccess ? itemsResult.data : []
    }
    
    // Verify the document belongs to the authenticated user
    if (document.userId !== userId) {
      return { isSuccess: false, message: "Unauthorized access to document" }
    }
    
    // Get template
    if (document.templateId) {
      const templateResult = await getTemplateByIdAction(document.templateId)
      if (templateResult.isSuccess) {
        template = templateResult.data
      }
    }
    
    // Fallback to default template
    if (!template) {
      const defaultTemplateResult = await getDefaultTemplateAction(userId, type)
      if (!defaultTemplateResult.isSuccess) {
        return { isSuccess: false, message: "No template found for document" }
      }
      template = defaultTemplateResult.data
    }
    
    // Get client if exists
    if (document.clientId) {
      const clientResult = await getClientByIdAction(document.clientId)
      if (clientResult.isSuccess) {
        client = clientResult.data
      }
    }
    
    // Get user profile
    const profileResult = await getProfileByUserIdAction(userId)
    if (!profileResult.isSuccess) {
      return { isSuccess: false, message: "User profile not found" }
    }
    const profile = profileResult.data
    
    // Prepare document data
    const documentData = {
      type,
      document,
      items,
      template,
      client,
      profile
    }
    
    // Generate document
    let fileBuffer: Buffer;
    if (format === 'pdf') {
      fileBuffer = await generatePdf(documentData)
    } else {
      fileBuffer = await generateDocx(documentData)
    }
    
    // Create filename
    const filename = `${type}-${documentNumber.replace(/[^a-zA-Z0-9]/g, '-')}.${format}`
    
    return {
      isSuccess: true,
      message: `${type} ${format.toUpperCase()} generated successfully for email`,
      data: {
        buffer: fileBuffer,
        filename
      }
    }
  } catch (error) {
    console.error(`Error generating ${type} ${format} for email:`, error)
    return { 
      isSuccess: false, 
      message: `Failed to generate ${type} ${format} for email`
    }
  }
}