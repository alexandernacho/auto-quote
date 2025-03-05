/**
 * @file DOCX generation utility
 * @description 
 * Provides functionality to generate DOCX documents for invoices and quotes.
 * Uses docx library to create well-formatted Word documents.
 * 
 * Key features:
 * - Create DOCX documents for invoices and quotes
 * - Apply custom styling based on template settings
 * - Add business logo and branding
 * - Generate itemized tables with proper formatting
 * - Calculate and display totals, taxes, etc.
 * 
 * @dependencies
 * - docx: For creating Word documents
 * - SelectClient, SelectInvoice, SelectInvoiceItem, etc.: Database types
 * 
 * @notes
 * - The function accepts a unified document data structure for both invoice and quote types
 * - Various sections of the document (header, items, totals, footer) are created by separate helper functions
 * - Handles fallbacks for missing data (client, logo, etc.)
 * - Default styling is based on the template but with limited style options compared to PDF
 */

import { 
  Document, Paragraph, Table, TableRow, TableCell, 
  TextRun, BorderStyle, WidthType, AlignmentType, 
  HeadingLevel, ImageRun, Footer, Header, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, HorizontalPositionAlign, VerticalPositionAlign,
  ExternalHyperlink, PageNumber, TableOfContents, ShadingType, Packer
} from 'docx'
import { SelectClient, SelectInvoice, SelectInvoiceItem, SelectProfile, SelectQuote, SelectQuoteItem, SelectTemplate } from '@/db/schema'

// Define the document data structure (same as pdf-generator.ts)
interface DocumentData {
  type: 'invoice' | 'quote'
  document: SelectInvoice | SelectQuote
  items: SelectInvoiceItem[] | SelectQuoteItem[]
  template: SelectTemplate
  client?: SelectClient
  profile: SelectProfile
}

// Reusable currency formatter instance
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

/**
 * Format date to display in document
 */
const formatDate = (date: Date): string => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

/**
 * Format currency value for display
 */
const formatCurrency = (value: string): string => currencyFormatter.format(parseFloat(value) || 0)

/**
 * Convert hex color to RGB string for Word documents
 */
const hexToRGB = (hex: string): string => hex?.match(/^#[0-9A-Fa-f]{6}$/) ? hex.substring(1).toUpperCase() : "000000"

/**
 * Generate a DOCX document for an invoice or quote
 * 
 * @param data The document data including document details, items, template and profile
 * @returns A Buffer containing the generated DOCX
 */
export async function generateDocx(data: DocumentData): Promise<Buffer> {
  const { type, document, items, template, client, profile } = data
  
  // Determine document number based on type
  const documentNumber = type === 'invoice' 
    ? (document as SelectInvoice).invoiceNumber 
    : (document as SelectQuote).quoteNumber
  
  // Helper function to fetch logo image
  const getLogoImage = async () => {
    if (!profile.businessLogo) return undefined
    
    try {
      const logoResponse = await fetch(profile.businessLogo)
      const logoBuffer = await logoResponse.arrayBuffer()
      return { data: logoBuffer, width: 150, height: 75 }
    } catch (err) {
      console.error('Error processing logo for DOCX:', err)
      return undefined
    }
  }
  
  // Create document sections
  const headerSection = createHeader(type, documentNumber, profile, template, await getLogoImage())
  const clientSection = createClientSection(client)
  const documentInfoSection = createDocumentInfo(type, document, client)
  const itemsSection = createItemsTable(items)
  const totalsSection = createTotalsSection(document)
  const notesSection = createNotesSection(document, profile, type)
  
  // Create the document with all sections
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: template.font || "Arial",
            size: 24, // 12pt
            color: "000000"
          },
          paragraph: {
            spacing: {
              line: 276, // 1.15x line spacing
            },
          },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: template.font || "Arial",
            size: 48, // 24pt
            bold: true,
            color: hexToRGB(template.primaryColor)
          },
          paragraph: {
            spacing: {
              before: 240, // 12pt
              after: 120, // 6pt
            },
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: template.font || "Arial",
            size: 32, // 16pt
            bold: true,
            color: hexToRGB(template.primaryColor)
          },
          paragraph: {
            spacing: {
              before: 160, // 8pt
              after: 80, // 4pt
            },
          },
        },
        {
          id: "TableHeader",
          name: "Table Header",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: template.font || "Arial",
            size: 24, // 12pt
            bold: true,
            color: hexToRGB(template.secondaryColor)
          },
          paragraph: {
            spacing: {
              before: 80, // 4pt
              after: 80, // 4pt
            },
          },
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5in
              right: 720, // 0.5in
              bottom: 720, // 0.5in
              left: 720, // 0.5in
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            text: `${type === 'invoice' ? 'INVOICE' : 'QUOTE'} ${documentNumber}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
            thematicBreak: true,
          }),
          
          // Two-column layout for business info and document info
          ...headerSection,
          
          // Client Information
          new Paragraph({
            text: "Bill To:",
            heading: HeadingLevel.HEADING_2,
            spacing: {
              before: 400, // 20pt
              after: 200, // 10pt
            },
          }),
          ...clientSection,
          
          // Document Information
          ...documentInfoSection,
          
          // Items Table
          new Paragraph({
            text: "Items:",
            heading: HeadingLevel.HEADING_2,
            spacing: {
              before: 400, // 20pt
              after: 200, // 10pt
            },
          }),
          itemsSection,
          
          // Totals
          ...totalsSection,
          
          // Notes and Terms
          ...notesSection,
          
          // Footer
          new Paragraph({
            text: "",
            spacing: {
              before: 400, // 20pt
            },
          }),
        ],
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${profile.businessName} | Page `,
                    size: 16, // 8pt
                    color: "666666",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16, // 8pt
                    color: "666666",
                  }),
                  new TextRun({
                    text: " of ",
                    size: 16, // 8pt
                    color: "666666",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16, // 8pt
                    color: "666666",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: template.footerHtml ? template.footerHtml.replace(/<[^>]*>/g, ' ').trim() : "",
                    size: 16, // 8pt
                    color: "666666",
                  }),
                ],
              }),
            ],
          }),
        },
      },
    ],
  })
  
  // Generate the document as a buffer and return
  return Buffer.from(await Packer.toBuffer(doc))
}

/**
 * Create header section with business information
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param documentNumber Document number (invoice or quote number)
 * @param profile Business profile
 * @param template Document template
 * @param logoImage Logo image data (optional)
 * @returns Array of paragraphs for the header section
 */
function createHeader(
  type: 'invoice' | 'quote',
  documentNumber: string,
  profile: SelectProfile,
  template: SelectTemplate,
  logoImage?: { data: ArrayBuffer, width: number, height: number }
) {
  const headerElements: (Paragraph | Table)[] = []
  
  // Add logo if available
  if (logoImage) {
    headerElements.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoImage.data,
            transformation: {
              width: logoImage.width,
              height: logoImage.height,
            },
          }),
        ],
        spacing: { after: 200 },
      })
    )
  }
  
  // Helper functions for creating table cells
  const createLabelCell = (text: string) => new TableCell({
    width: { size: 15, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true })]
    })]
  })
  
  const createValueCell = (text: string) => new TableCell({
    width: { size: 85, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      children: [new TextRun({ text })]
    })]
  })
  
  const createTableRow = (label: string, value: string) => new TableRow({
    children: [createLabelCell(label), createValueCell(value)]
  })
  
  // Business information table rows
  const businessInfoRows = [
    createTableRow("Business:", profile.businessName)
  ]
  
  // Add conditional rows
  if (profile.businessEmail) {
    businessInfoRows.push(createTableRow("Email:", profile.businessEmail))
  }
  
  // Business phone
  if (profile.businessPhone) {
    businessInfoRows.push(createTableRow("Phone:", profile.businessPhone))
  }
  
  // Business address
  if (profile.businessAddress) {
    businessInfoRows.push(createTableRow("Address:", profile.businessAddress))
  }
  
  // VAT/Tax number
  if (profile.vatNumber) {
    businessInfoRows.push(createTableRow("Tax Number:", profile.vatNumber))
  }
  
  // Add business info table to header
  headerElements.push(
    new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: businessInfoRows,
    })
  )
  
  return headerElements
}

/**
 * Create client information section
 * 
 * @param client Client information (optional)
 * @returns Array of paragraphs for the client section
 */
function createClientSection(client?: SelectClient) {
  const clientElements: Paragraph[] = []
  
  if (client) {
    // Add client name
    clientElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: client.name,
            bold: true,
            size: 24,
          }),
        ],
      })
    )
    
    // Helper function for client detail paragraphs
    const addClientDetail = (label: string, value: string | null | undefined) => {
      if (value) {
        clientElements.push(
          new Paragraph({
            text: `${label}: ${value}`,
            spacing: { before: 80 }
          })
        )
      }
    }
    
    // Add client details
    addClientDetail('Email', client.email)
    addClientDetail('Phone', client.phone)
    addClientDetail('Address', client.address)
    addClientDetail('Tax Number', client.taxNumber)
  } else {
    // Placeholder if no client specified
    clientElements.push(
      new Paragraph({ text: "No client specified" })
    )
  }
  
  return clientElements
}

/**
 * Create document information section
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param document The invoice or quote document
 * @param client Client information (optional)
 * @returns Array of paragraphs for the document info section
 */
function createDocumentInfo(
  type: 'invoice' | 'quote',
  document: SelectInvoice | SelectQuote,
  client?: SelectClient
) {
  const infoElements: (Paragraph | Table)[] = []
  
  // Helper functions for creating table cells and rows
  const createLabelCell = (text: string) => new TableCell({
    width: { size: 30, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true })]
    })]
  })
  
  const createValueCell = (text: string) => new TableCell({
    width: { size: 70, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      children: [new TextRun({ text })]
    })]
  })
  
  const createInfoRow = (label: string, value: string) => new TableRow({
    children: [createLabelCell(label), createValueCell(value)]
  })
  
  // Create document info table rows
  const infoRows = [
    createInfoRow(
      "Document Number:", 
      type === 'invoice' 
        ? (document as SelectInvoice).invoiceNumber 
        : (document as SelectQuote).quoteNumber
    ),
    createInfoRow("Date:", formatDate(new Date(document.issueDate))),
    createInfoRow(
      type === 'invoice' ? "Due Date:" : "Valid Until:", 
      formatDate(new Date(
        type === 'invoice' 
          ? (document as SelectInvoice).dueDate 
          : (document as SelectQuote).validUntil
      ))
    ),
    createInfoRow("Client:", client?.name || "No client specified"),
    createInfoRow("Status:", document.status.toUpperCase())
  ]
  
  // Create and add the info table
  infoElements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: { top: 100, bottom: 100, left: 0, right: 0 },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: infoRows
    })
  )
  
  return infoElements
}

/**
 * Create items table for the document
 * 
 * @param items The invoice or quote items
 * @returns Table of items
 */
function createItemsTable(items: SelectInvoiceItem[] | SelectQuoteItem[]) {
  // Create header row
  const headerRow = new TableRow({
    tableHeader: true,
    height: {
      value: 400, // 20pt
      rule: "exact",
    },
    children: [
      new TableCell({
        width: {
          size: 5,
          type: WidthType.PERCENTAGE,
        },
        shading: {
          fill: "3b82f6", // Blue color
          type: ShadingType.SOLID,
        },
        margins: {
          top: 100, // 5pt
          bottom: 100, // 5pt
          left: 100, // 5pt
          right: 100, // 5pt
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "#",
                bold: true,
                color: "FFFFFF",
                size: 20, // 10pt
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: {
          size: 35,
          type: WidthType.PERCENTAGE,
        },
        shading: {
          fill: "3b82f6", // Blue color
          type: ShadingType.SOLID,
        },
        margins: {
          top: 100, // 5pt
          bottom: 100, // 5pt
          left: 100, // 5pt
          right: 100, // 5pt
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: "Description",
                bold: true,
                color: "FFFFFF",
                size: 20, // 10pt
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: {
          size: 10,
          type: WidthType.PERCENTAGE,
        },
        shading: {
          fill: "3b82f6", // Blue color
          type: ShadingType.SOLID,
        },
        margins: {
          top: 100, // 5pt
          bottom: 100, // 5pt
          left: 100, // 5pt
          right: 100, // 5pt
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Quantity",
                bold: true,
                color: "FFFFFF",
                size: 20, // 10pt
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: {
          size: 15,
          type: WidthType.PERCENTAGE,
        },
        shading: {
          fill: "3b82f6", // Blue color
          type: ShadingType.SOLID,
        },
        margins: {
          top: 100, // 5pt
          bottom: 100, // 5pt
          left: 100, // 5pt
          right: 100, // 5pt
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Unit Price",
                bold: true,
                color: "FFFFFF",
                size: 20, // 10pt
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: {
          size: 10,
          type: WidthType.PERCENTAGE,
        },
        shading: {
          fill: "3b82f6", // Blue color
          type: ShadingType.SOLID,
        },
        margins: {
          top: 100, // 5pt
          bottom: 100, // 5pt
          left: 100, // 5pt
          right: 100, // 5pt
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Tax %",
                bold: true,
                color: "FFFFFF",
                size: 20, // 10pt
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: {
          size: 10,
          type: WidthType.PERCENTAGE,
        },
        shading: {
          fill: "3b82f6", // Blue color
          type: ShadingType.SOLID,
        },
        margins: {
          top: 100, // 5pt
          bottom: 100, // 5pt
          left: 100, // 5pt
          right: 100, // 5pt
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Tax Amt",
                bold: true,
                color: "FFFFFF",
                size: 20, // 10pt
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: {
          size: 15,
          type: WidthType.PERCENTAGE,
        },
        shading: {
          fill: "3b82f6", // Blue color
          type: ShadingType.SOLID,
        },
        margins: {
          top: 100, // 5pt
          bottom: 100, // 5pt
          left: 100, // 5pt
          right: 100, // 5pt
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Total",
                bold: true,
                color: "FFFFFF",
                size: 20, // 10pt
              }),
            ],
          }),
        ],
      }),
    ],
  })
  
  // Create rows for each item
  const itemRows = items.map((item, index) => {
    return new TableRow({
      children: [
        new TableCell({
          width: {
            size: 5,
            type: WidthType.PERCENTAGE,
          },
          margins: {
            top: 100, // 5pt
            bottom: 100, // 5pt
            left: 100, // 5pt
            right: 100, // 5pt
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: (index + 1).toString(),
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 35,
            type: WidthType.PERCENTAGE,
          },
          margins: {
            top: 100, // 5pt
            bottom: 100, // 5pt
            left: 100, // 5pt
            right: 100, // 5pt
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: item.description,
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 10,
            type: WidthType.PERCENTAGE,
          },
          margins: {
            top: 100, // 5pt
            bottom: 100, // 5pt
            left: 100, // 5pt
            right: 100, // 5pt
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: item.quantity,
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          margins: {
            top: 100, // 5pt
            bottom: 100, // 5pt
            left: 100, // 5pt
            right: 100, // 5pt
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: formatCurrency(item.unitPrice),
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 10,
            type: WidthType.PERCENTAGE,
          },
          margins: {
            top: 100, // 5pt
            bottom: 100, // 5pt
            left: 100, // 5pt
            right: 100, // 5pt
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `${item.taxRate}%`,
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 10,
            type: WidthType.PERCENTAGE,
          },
          margins: {
            top: 100, // 5pt
            bottom: 100, // 5pt
            left: 100, // 5pt
            right: 100, // 5pt
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: formatCurrency(item.taxAmount || '0'),
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          margins: {
            top: 100, // 5pt
            bottom: 100, // 5pt
            left: 100, // 5pt
            right: 100, // 5pt
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: formatCurrency(item.total),
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
      ],
    })
  })
  
  // Combine header and item rows
  const tableRows = [headerRow, ...itemRows]
  
  // Create and return the table
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
    },
    rows: tableRows,
  })
}

/**
 * Create totals section for the document
 * 
 * @param document The invoice or quote document
 * @returns Array of paragraphs and tables for the totals section
 */
function createTotalsSection(document: SelectInvoice | SelectQuote) {
  const totalElements = []
  
  // Add spacing
  totalElements.push(
    new Paragraph({
      spacing: {
        before: 400, // 20pt
      },
    })
  )
  
  // Create totals table
  const totalsRows = []
  
  // Subtotal
  totalsRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: {
            size: 70,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
          children: [new Paragraph({})],
        }),
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            right: { style: BorderStyle.NONE },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Subtotal:",
                  bold: true,
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: formatCurrency(document.subtotal),
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  
  // Tax amount
  totalsRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: {
            size: 70,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
          children: [new Paragraph({})],
        }),
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            right: { style: BorderStyle.NONE },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Tax Amount:",
                  bold: true,
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: formatCurrency(document.taxAmount),
                  size: 20, // 10pt
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  
  // Discount (if applicable)
  if (parseFloat(document.discount) > 0) {
    totalsRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 70,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [new Paragraph({})],
          }),
          new TableCell({
            width: {
              size: 15,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Discount:",
                    bold: true,
                    size: 20, // 10pt
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 15,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `-${formatCurrency(document.discount)}`,
                    size: 20, // 10pt
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  }
  
  // Total
  totalsRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: {
            size: 70,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
          children: [new Paragraph({})],
        }),
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            right: { style: BorderStyle.NONE },
          },
          shading: {
            fill: "3b82f6", // Blue color
            type: ShadingType.SOLID,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "Total:",
                  bold: true,
                  color: "FFFFFF",
                  size: 22, // 11pt
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
          },
          shading: {
            fill: "3b82f6", // Blue color
            type: ShadingType.SOLID,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: formatCurrency(document.total),
                  bold: true,
                  color: "FFFFFF",
                  size: 22, // 11pt
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  
  // Add totals table
  totalElements.push(
    new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: totalsRows,
    })
  )
  
  return totalElements
}

/**
 * Create notes and terms section for the document
 * 
 * @param document The invoice or quote document
 * @param profile The business profile
 * @param type Document type ('invoice' or 'quote')
 * @returns Array of paragraphs for the notes and terms section
 */
function createNotesSection(
  document: SelectInvoice | SelectQuote,
  profile: SelectProfile,
  type: 'invoice' | 'quote'
) {
  const notesElements: Paragraph[] = []
  
  // Helper function to create a section with title and content
  const addSection = (title: string, content: string) => {
    notesElements.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: content,
        spacing: { after: 200 }
      })
    )
  }
  
  // Add sections conditionally
  if (document.notes) {
    addSection("Notes:", document.notes)
  }
  
  if (document.termsAndConditions) {
    addSection("Terms and Conditions:", document.termsAndConditions)
  }
  
  if (type === 'invoice' && profile.paymentInstructions) {
    addSection("Payment Instructions:", profile.paymentInstructions)
  }
  
  return notesElements
}