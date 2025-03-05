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
  
  // Prepare logo image if available
  let logoImage
  if (profile.businessLogo) {
    try {
      // Fetch logo image
      const logoResponse = await fetch(profile.businessLogo)
      const logoBuffer = await logoResponse.arrayBuffer()
      
      // Create logo image for document
      logoImage = {
        data: logoBuffer,
        width: 150,
        height: 75
      }
    } catch (err) {
      console.error('Error processing logo for DOCX:', err)
      // Continue without logo if there's an error
    }
  }
  
  // Create document sections
  const headerSection = createHeader(type, documentNumber, profile, template, logoImage)
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
  const headerElements = []
  
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
        spacing: {
          after: 200, // 10pt
        },
      })
    )
  }
  
  // Business information table (2 columns)
  const businessInfoRows = []
  
  // Business name
  businessInfoRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: {
            size: 15,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Business:",
                  bold: true,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 85,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: profile.businessName,
                  bold: true,
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  
  // Business email
  if (profile.businessEmail) {
    businessInfoRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 15,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Email:",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 85,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: profile.businessEmail,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  }
  
  // Business phone
  if (profile.businessPhone) {
    businessInfoRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 15,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Phone:",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 85,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: profile.businessPhone,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  }
  
  // Business address
  if (profile.businessAddress) {
    businessInfoRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 15,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Address:",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 85,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: profile.businessAddress,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  }
  
  // VAT/Tax number
  if (profile.vatNumber) {
    businessInfoRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: {
              size: 15,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Tax Number:",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: 85,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: profile.vatNumber,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
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
  const clientElements = []
  
  if (client) {
    // Client name
    clientElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: client.name,
            bold: true,
            size: 24, // 12pt
          }),
        ],
      })
    )
    
    // Client email
    if (client.email) {
      clientElements.push(
        new Paragraph({
          text: `Email: ${client.email}`,
          spacing: {
            before: 80, // 4pt
          },
        })
      )
    }
    
    // Client phone
    if (client.phone) {
      clientElements.push(
        new Paragraph({
          text: `Phone: ${client.phone}`,
          spacing: {
            before: 80, // 4pt
          },
        })
      )
    }
    
    // Client address
    if (client.address) {
      clientElements.push(
        new Paragraph({
          text: `Address: ${client.address}`,
          spacing: {
            before: 80, // 4pt
          },
        })
      )
    }
    
    // Client tax number
    if (client.taxNumber) {
      clientElements.push(
        new Paragraph({
          text: `Tax Number: ${client.taxNumber}`,
          spacing: {
            before: 80, // 4pt
          },
        })
      )
    }
  } else {
    // Placeholder if no client specified
    clientElements.push(
      new Paragraph({
        text: "No client specified",
      })
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
  const infoElements = []
  
  // Create document info table
  const infoRows = []
  
  // Document number
  infoRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: {
            size: 30,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Document Number:",
                  bold: true,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 70,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: type === 'invoice' 
                    ? (document as SelectInvoice).invoiceNumber 
                    : (document as SelectQuote).quoteNumber,
                  bold: true,
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  
  // Issue date
  infoRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: {
            size: 30,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Date:",
                  bold: true,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 70,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: formatDate(new Date(document.issueDate)),
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  
  // Due date or valid until
  infoRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: {
            size: 30,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Client:",
                  bold: true,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 70,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: client?.name || "No client specified",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  
  // Status
  infoRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: {
            size: 30,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Status:",
                  bold: true,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: {
            size: 70,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: document.status.toUpperCase(),
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  
  // Add document info table
  infoElements.push(
    new Table({
      width: {
        size: 50,
        type: WidthType.PERCENTAGE,
      },
      margins: {
        top: 100, // 5pt
        bottom: 100, // 5pt
      },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: infoRows,
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
  const notesElements = []
  
  // Add notes if available
  if (document.notes) {
    notesElements.push(
      new Paragraph({
        text: "Notes:",
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: 400, // 20pt
          after: 200, // 10pt
        },
      }),
      new Paragraph({
        text: document.notes,
        spacing: {
          after: 200, // 10pt
        },
      })
    )
  }
  
  // Add terms and conditions if available
  if (document.termsAndConditions) {
    notesElements.push(
      new Paragraph({
        text: "Terms and Conditions:",
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: 400, // 20pt
          after: 200, // 10pt
        },
      }),
      new Paragraph({
        text: document.termsAndConditions,
        spacing: {
          after: 200, // 10pt
        },
      })
    )
  }
  
  // Add payment instructions for invoices
  if (type === 'invoice' && profile.paymentInstructions) {
    notesElements.push(
      new Paragraph({
        text: "Payment Instructions:",
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: 400, // 20pt
          after: 200, // 10pt
        },
      }),
      new Paragraph({
        text: profile.paymentInstructions,
        spacing: {
          after: 200, // 10pt
        },
      })
    )
  }
  
  return notesElements
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
 * Convert hex color to RGB string for Word documents
 * 
 * @param hex Hex color string (e.g., "#ff0000")
 * @returns RGB color string (e.g., "FF0000")
 */
function hexToRGB(hex: string): string {
  // Default to black if invalid hex
  if (!hex || !hex.match(/^#[0-9A-Fa-f]{6}$/)) {
    return "000000"
  }
  
  // Extract RGB components and return as string
  return hex.substring(1).toUpperCase()
}