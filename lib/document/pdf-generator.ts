/**
 * @file PDF generation utility
 * @description 
 * Provides functionality to generate PDF documents for invoices and quotes.
 * Uses jsPDF and jspdf-autotable to create well-formatted PDF documents.
 * 
 * Key features:
 * - Create PDF documents for invoices and quotes
 * - Apply custom styling based on template settings
 * - Add business logo and branding
 * - Generate itemized tables with proper formatting
 * - Calculate and display totals, taxes, etc.
 * 
 * @dependencies
 * - jsPDF: For creating PDF documents
 * - jspdf-autotable: For creating tables in PDF documents
 * - SelectClient, SelectInvoice, SelectInvoiceItem, etc.: Database types
 * 
 * @notes
 * - Font loading is handled via standard fonts or base64 encoded custom fonts
 * - The function accepts a unified document data structure for both invoice and quote types
 * - Various sections of the PDF (header, items, totals, footer) are created by separate helper functions
 * - Handles fallbacks for missing data (client, logo, etc.)
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SelectClient, SelectInvoice, SelectInvoiceItem, SelectProfile, SelectQuote, SelectQuoteItem, SelectTemplate } from '@/db/schema'

// Extend jsPDF type to include lastAutoTable property
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number
    }
  }
}

// Define the document data structure
interface DocumentData {
  type: 'invoice' | 'quote'
  document: SelectInvoice | SelectQuote
  items: SelectInvoiceItem[] | SelectQuoteItem[]
  template: SelectTemplate
  client?: SelectClient
  profile: SelectProfile
}

/**
 * Generate a PDF document for an invoice or quote
 * 
 * @param data The document data including document details, items, template and profile
 * @returns A Buffer containing the generated PDF
 */
export async function generatePdf(data: DocumentData): Promise<Buffer> {
  try {
    const { type, document, items, template, client, profile } = data
    
    // Create a new PDF document (A4 size)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    // Set document properties
    doc.setProperties({
      title: `${type === 'invoice' ? 'Invoice' : 'Quote'} ${type === 'invoice' 
        ? (document as SelectInvoice).invoiceNumber 
        : (document as SelectQuote).quoteNumber}`,
      subject: `${profile.businessName} ${type === 'invoice' ? 'Invoice' : 'Quote'}`,
      author: profile.businessName,
      creator: 'Smart Invoice WebApp'
    })
    
    // Apply branding colors from template
    const primaryColor = hexToRgb(template.primaryColor)
    const secondaryColor = hexToRgb(template.secondaryColor)
    
    // Add header with logo and business information
    await addHeader(doc, profile, template, type, document, primaryColor)
    
    // Add client information section
    addClientSection(doc, client, primaryColor)
    
    // Add document information section
    addDocumentInfo(doc, type, document, primaryColor)
    
    // Add items table
    addItemsTable(doc, items, primaryColor, secondaryColor)
    
    // Add totals section
    addTotalsSection(doc, document, primaryColor, type)
    
    // Add notes section
    if (document.notes) {
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('Notes:', 15, doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 180)
      doc.setFontSize(9)
      doc.text(document.notes, 15, doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 185, {
        maxWidth: 180
      })
    }
    
    // Add terms and conditions
    if (document.termsAndConditions) {
      const yPos = doc.lastAutoTable?.finalY 
        ? doc.lastAutoTable.finalY + (document.notes ? 25 : 10) 
        : document.notes ? 195 : 180
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('Terms and Conditions:', 15, yPos)
      doc.setFontSize(9)
      doc.text(document.termsAndConditions, 15, yPos + 5, {
        maxWidth: 180
      })
    }
    
    // Add payment instructions (for invoices)
    if (type === 'invoice' && profile.paymentInstructions) {
      const yPos = doc.lastAutoTable?.finalY 
        ? doc.lastAutoTable.finalY + 
          (document.notes ? 25 : 10) + 
          (document.termsAndConditions ? 20 : 0)
        : 210
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('Payment Instructions:', 15, yPos)
      doc.setFontSize(9)
      doc.text(profile.paymentInstructions, 15, yPos + 5, {
        maxWidth: 180
      })
    }
    
    // Add footer
    addFooter(doc, profile, template)
    
    // Convert the PDF to a buffer and return
    return Buffer.from(doc.output('arraybuffer'))
  } catch (error) {
    console.error('Error in PDF generation:', error)
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Add header section to the PDF document
 * 
 * @param doc The jsPDF document instance
 * @param profile The business profile
 * @param template The document template
 * @param type Document type ('invoice' or 'quote')
 * @param document The invoice or quote document
 * @param primaryColor RGB color array for primary color
 */
async function addHeader(
  doc: jsPDF, 
  profile: SelectProfile, 
  template: SelectTemplate,
  type: 'invoice' | 'quote',
  document: SelectInvoice | SelectQuote,
  primaryColor: [number, number, number]
) {
  // Set initial y position
  let yPos = 15
  
  // Add logo if available
  if (profile.businessLogo) {
    try {
      // Determine logo position based on template
      const logoX = template.logoPosition === 'top-left' || template.logoPosition === 'left' 
        ? 15 
        : template.logoPosition === 'top-center' || template.logoPosition === 'center' 
          ? 105 - 25 
          : 195 - 50
      
      // Add logo image (fetched asynchronously)
      const logoResponse = await fetch(profile.businessLogo)
      const logoBuffer = await logoResponse.arrayBuffer()
      const logoBase64 = Buffer.from(logoBuffer).toString('base64')
      
      // Add logo to document
      doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', logoX, yPos, 50, 25, undefined, 'FAST')
      
      yPos += 30 // Move down for rest of header
    } catch (err) {
      console.error('Error adding logo to PDF:', err)
      // Continue without logo if there's an error
    }
  }
  
  // Add document title based on type and styling
  doc.setFontSize(22)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setFont('helvetica', 'bold')
  
  // Document title (Invoice or Quote)
  const title = type === 'invoice' ? 'INVOICE' : 'QUOTE'
  const number = type === 'invoice' 
    ? (document as SelectInvoice).invoiceNumber 
    : (document as SelectQuote).quoteNumber
  
  doc.text(`${title} ${number}`, 15, yPos)
  
  // Add business information
  yPos += 10
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  // Business name
  doc.setFont('helvetica', 'bold')
  doc.text(profile.businessName, 15, yPos)
  doc.setFont('helvetica', 'normal')
  
  // Business contact info
  yPos += 5
  if (profile.businessEmail) {
    doc.text(`Email: ${profile.businessEmail}`, 15, yPos)
    yPos += 5
  }
  
  if (profile.businessPhone) {
    doc.text(`Phone: ${profile.businessPhone}`, 15, yPos)
    yPos += 5
  }
  
  if (profile.businessAddress) {
    doc.text(`Address: ${profile.businessAddress}`, 15, yPos)
    yPos += 5
  }
  
  if (profile.vatNumber) {
    doc.text(`VAT/Tax Number: ${profile.vatNumber}`, 15, yPos)
    yPos += 5
  }
  
  // Add separator line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setLineWidth(0.5)
  doc.line(15, yPos + 5, 195, yPos + 5)
}

/**
 * Add client information section to the PDF document
 * 
 * @param doc The jsPDF document instance
 * @param client The client information (optional)
 * @param primaryColor RGB color array for primary color
 */
function addClientSection(
  doc: jsPDF, 
  client: SelectClient | undefined,
  primaryColor: [number, number, number]
) {
  // Start position after header (with margin)
  const yPos = 70
  
  // Add 'Bill To' section
  doc.setFontSize(12)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 15, yPos)
  
  // Add client details or placeholder
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  if (client) {
    // Client name
    doc.setFont('helvetica', 'bold')
    doc.text(client.name, 15, yPos + 6)
    doc.setFont('helvetica', 'normal')
    
    let clientYPos = yPos + 12
    
    // Client contact information
    if (client.email) {
      doc.text(`Email: ${client.email}`, 15, clientYPos)
      clientYPos += 5
    }
    
    if (client.phone) {
      doc.text(`Phone: ${client.phone}`, 15, clientYPos)
      clientYPos += 5
    }
    
    if (client.address) {
      doc.text(`Address: ${client.address}`, 15, clientYPos)
      clientYPos += 5
    }
    
    if (client.taxNumber) {
      doc.text(`Tax Number: ${client.taxNumber}`, 15, clientYPos)
    }
  } else {
    // Placeholder if no client specified
    doc.text('No client specified', 15, yPos + 6)
  }
}

/**
 * Add document information section to the PDF document
 * 
 * @param doc The jsPDF document instance
 * @param type Document type ('invoice' or 'quote')
 * @param document The invoice or quote document
 * @param primaryColor RGB color array for primary color
 */
function addDocumentInfo(
  doc: jsPDF, 
  type: 'invoice' | 'quote',
  document: SelectInvoice | SelectQuote,
  primaryColor: [number, number, number]
) {
  // Start position to the right side of the document
  const yPos = 70
  
  // Add document details section
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  // Table for document details - positioned on the right side
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['Document Number', type === 'invoice' 
        ? (document as SelectInvoice).invoiceNumber 
        : (document as SelectQuote).quoteNumber],
      ['Issue Date', formatDate(new Date(document.issueDate))],
      [type === 'invoice' ? 'Due Date' : 'Valid Until', formatDate(
        new Date(type === 'invoice' 
          ? (document as SelectInvoice).dueDate 
          : (document as SelectQuote).validUntil)
      )],
      ['Status', document.status.toUpperCase()]
    ],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        cellWidth: 40
      }
    },
    margin: { left: 125 },
    tableWidth: 70
  })
}

/**
 * Add items table to the PDF document
 * 
 * @param doc The jsPDF document instance
 * @param items The invoice or quote items
 * @param primaryColor RGB color array for primary color
 * @param secondaryColor RGB color array for secondary color
 */
function addItemsTable(
  doc: jsPDF, 
  items: SelectInvoiceItem[] | SelectQuoteItem[],
  primaryColor: [number, number, number],
  secondaryColor: [number, number, number]
) {
  // Table columns
  const columns = [
    'Item', 
    'Description', 
    'Quantity', 
    'Unit Price', 
    'Tax Rate', 
    'Tax Amount',
    'Total'
  ]
  
  // Convert items to table data
  const data = items.map((item, index) => [
    (index + 1).toString(), 
    item.description, 
    item.quantity, 
    formatCurrency(item.unitPrice), 
    `${item.taxRate}%`, 
    formatCurrency(item.taxAmount || '0'),
    formatCurrency(item.total)
  ])
  
  // Generate items table
  autoTable(doc, {
    startY: 110, // Position after client and document info
    head: [columns],
    body: data,
    headStyles: {
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: [secondaryColor[0], secondaryColor[1], secondaryColor[2]],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 10 }, // Item #
      1: { cellWidth: 60 }, // Description
      2: { cellWidth: 15, halign: 'right' }, // Quantity
      3: { cellWidth: 25, halign: 'right' }, // Unit Price
      4: { cellWidth: 15, halign: 'right' }, // Tax Rate
      5: { cellWidth: 25, halign: 'right' }, // Tax Amount
      6: { cellWidth: 25, halign: 'right' }  // Total
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Add header on each page
      if (data.pageNumber > 1) {
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text('Items (continued)', 15, 15)
        
        // Add header for subsequent pages
        autoTable(doc, {
          startY: 20,
          head: [columns],
          body: [],
          headStyles: {
            fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
            textColor: [secondaryColor[0], secondaryColor[1], secondaryColor[2]],
            fontStyle: 'bold',
            fontSize: 9
          },
          margin: { left: 15, right: 15 }
        })
      }
    }
  })
}

/**
 * Add totals section to the PDF document
 * 
 * @param doc The jsPDF document instance
 * @param document The invoice or quote document
 * @param primaryColor RGB color array for primary color
 * @param type Document type ('invoice' or 'quote')
 */
function addTotalsSection(
  doc: jsPDF, 
  document: SelectInvoice | SelectQuote,
  primaryColor: [number, number, number],
  type: 'invoice' | 'quote'
) {
  // Determine position after items table
  const startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 5 : 150
  
  // Prepare totals data
  const totalsData = [
    ['Subtotal', formatCurrency(document.subtotal)],
    ['Tax Amount', formatCurrency(document.taxAmount)]
  ]
  
  // Add discount row if there is a discount
  if (parseFloat(document.discount) > 0) {
    totalsData.push(['Discount', `-${formatCurrency(document.discount)}`])
  }
  
  // Add total row
  totalsData.push(['Total', formatCurrency(document.total)])
  
  // Generate totals table on the right side
  autoTable(doc, {
    startY,
    body: totalsData,
    theme: 'plain',
    styles: {
      fontSize: 10
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        cellWidth: 40
      },
      1: {
        halign: 'right',
        cellWidth: 35
      }
    },
    margin: { left: 120 },
    tableWidth: 75
  })
  
  // Add total due highlight for invoices
  if (document.total && type === 'invoice') {
    const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 5 : startY + 30
    
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(0.5)
    doc.roundedRect(120, finalY, 75, 15, 2, 2, 'FD')
    
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.text('Total Due:', 125, finalY + 10)
    doc.text(formatCurrency(document.total), 190, finalY + 10, { align: 'right' })
  }
}

/**
 * Add footer section to the PDF document
 * 
 * @param doc The jsPDF document instance
 * @param profile The business profile
 * @param template The document template
 */
function addFooter(
  doc: jsPDF, 
  profile: SelectProfile, 
  template: SelectTemplate
) {
  // Add footer on each page
  const totalPages = doc.getNumberOfPages()
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    
    // Footer line
    const footerY = 280
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    doc.line(15, footerY, 195, footerY)
    
    // Footer text
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    
    // Company name + page number
    doc.text(
      `${profile.businessName} | Page ${i} of ${totalPages}`,
      doc.internal.pageSize.width / 2,
      footerY + 5,
      { align: 'center' }
    )
    
    // Add custom footer text if specified in template
    if (template.footerHtml) {
      // Extract text content from HTML for simple display
      const footerText = template.footerHtml.replace(/<[^>]*>/g, ' ').trim()
      if (footerText) {
        doc.text(
          footerText,
          doc.internal.pageSize.width / 2,
          footerY + 10,
          { align: 'center', maxWidth: 180 }
        )
      }
    }
  }
}

/**
 * Format date to display in document
 * 
 * @param date Date to format
 * @returns Formatted date string (e.g., "Jan 31, 2023")
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format currency value for display
 * 
 * @param value Currency value as string
 * @returns Formatted currency string (e.g., "$123.45")
 */
function formatCurrency(value: string): string {
  // Parse value to float and format with 2 decimal places
  const numValue = parseFloat(value) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(numValue)
}

/**
 * Convert hex color to RGB array
 * 
 * @param hex Hex color string (e.g., "#ff0000")
 * @returns RGB color as [r, g, b] array
 */
function hexToRgb(hex: string): [number, number, number] {
  // Default to black if invalid hex
  if (!hex || !hex.match(/^#[0-9A-Fa-f]{6}$/)) {
    return [0, 0, 0]
  }
  
  // Extract RGB components
  const r = parseInt(hex.substring(1, 3), 16)
  const g = parseInt(hex.substring(3, 5), 16)
  const b = parseInt(hex.substring(5, 7), 16)
  
  return [r, g, b]
}