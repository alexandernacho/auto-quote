/**
 * @file DOCX generation utility
 * @description 
 * Provides functionality to generate DOCX documents for invoices and quotes.
 * Uses docx library to create well-formatted Word documents.
 */

import { 
  Document, Paragraph, Table, TableRow, TableCell, 
  TextRun, BorderStyle, WidthType, AlignmentType, 
  HeadingLevel, ImageRun, Footer, PageNumber, ShadingType, Packer,
  ITableCellBorders
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

// Define reusable styles
const STYLES = {
  colors: {
    primary: "3b82f6",
    text: "000000",
    lightGray: "666666",
    border: "AAAAAA",
    white: "FFFFFF"
  },
  spacing: {
    tiny: 80,    // 4pt
    small: 100,  // 5pt
    medium: 200, // 10pt
    large: 400   // 20pt
  },
  borders: {
    none: { style: BorderStyle.NONE },
    single: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" }
  },
  fonts: {
    tiny: 16,   // 8pt
    small: 20,  // 10pt
    medium: 22, // 11pt
    regular: 24, // 12pt
    large: 32,  // 16pt
    xlarge: 48  // 24pt
  }
}

// Cache for reused elements
const EMPTY_PARAGRAPH = new Paragraph({})
const SPACER = new Paragraph({ spacing: { before: STYLES.spacing.large } })
const colorCache = new Map<string, string>()

/**
 * Generate a DOCX document for an invoice or quote
 */
export async function generateDocx(data: DocumentData): Promise<Buffer> {
  const { type, document, items, template, client, profile } = data
  
  // Determine document number based on type
  const documentNumber = type === 'invoice' 
    ? (document as SelectInvoice).invoiceNumber 
    : (document as SelectQuote).quoteNumber
  
  // Prepare logo image if available
  const logoImage = await getLogoImage(profile.businessLogo || undefined)
  
  // Create document sections
  const headerSection = createHeader({ type, documentNumber, profile, template, logoImage })
  const clientSection = createClientSection(client)
  const documentInfoSection = createDocumentInfo({ type, document, client })
  const itemsSection = createItemsTable(items)
  const totalsSection = createTotalsSection(document)
  const notesSection = createNotesSection({ document, profile, type })
  
  // Create the document
  const doc = new Document({
    styles: createDocumentStyles(template),
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
          createSectionHeading("Bill To:"),
          ...clientSection,
          
          // Document Information
          ...documentInfoSection,
          
          // Items Table
          createSectionHeading("Items:"),
          itemsSection,
          
          // Totals
          ...totalsSection,
          
          // Notes and Terms
          ...notesSection,
          
          // Footer spacing
          SPACER,
        ],
        footers: {
          default: createFooter(profile, template),
        },
      },
    ],
  })
  
  // Generate the document as a buffer and return
  return Buffer.from(await Packer.toBuffer(doc))
}

/**
 * Creates a section heading paragraph
 */
function createSectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: STYLES.spacing.large,
      after: STYLES.spacing.medium,
    },
  })
}

/**
 * Creates document styles configuration
 */
function createDocumentStyles(template: SelectTemplate) {
  return {
    paragraphStyles: [
      {
        id: "Normal",
        name: "Normal",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: template.font || "Arial",
          size: STYLES.fonts.regular,
          color: STYLES.colors.text
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
          size: STYLES.fonts.xlarge,
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
          size: STYLES.fonts.large,
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
          size: STYLES.fonts.regular,
          bold: true,
          color: hexToRGB(template.secondaryColor)
        },
        paragraph: {
          spacing: {
            before: STYLES.spacing.tiny,
            after: STYLES.spacing.tiny,
          },
        },
      }
    ]
  }
}

/**
 * Creates the document footer
 */
function createFooter(profile: SelectProfile, template: SelectTemplate) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `${profile.businessName} | Page `,
            size: STYLES.fonts.tiny,
            color: STYLES.colors.lightGray,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: STYLES.fonts.tiny,
            color: STYLES.colors.lightGray,
          }),
          new TextRun({
            text: " of ",
            size: STYLES.fonts.tiny,
            color: STYLES.colors.lightGray,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: STYLES.fonts.tiny,
            color: STYLES.colors.lightGray,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: template.footerHtml ? template.footerHtml.replace(/<[^>]*>/g, ' ').trim() : "",
            size: STYLES.fonts.tiny,
            color: STYLES.colors.lightGray,
          }),
        ],
      }),
    ],
  })
}

/**
 * Helper to fetch and process logo image
 */
async function getLogoImage(logoUrl?: string) {
  if (!logoUrl) return undefined
  
  try {
    const logoResponse = await fetch(logoUrl)
    const logoBuffer = await logoResponse.arrayBuffer()
    return { 
      data: logoBuffer, 
      width: 150, 
      height: 75 
    }
  } catch (err) {
    console.error('Error processing logo for DOCX:', err)
    return undefined
  }
}

/**
 * Create a text cell with standard options
 */
function createTextCell({
  text,
  width = 15,
  bold = false,
  color = STYLES.colors.text,
  alignment = AlignmentType.LEFT,
  size = STYLES.fonts.small,
  borders = undefined,
  shading = undefined,
  margins = {
    top: STYLES.spacing.small,
    bottom: STYLES.spacing.small,
    left: STYLES.spacing.small,
    right: STYLES.spacing.small,
  }
}: {
  text: string;
  width?: number;
  bold?: boolean;
  color?: string;
  alignment?: typeof AlignmentType[keyof typeof AlignmentType];
  size?: number;
  borders?: ITableCellBorders;
  shading?: any;
  margins?: any;
}) {
  return new TableCell({
    width: {
      size: width,
      type: WidthType.PERCENTAGE,
    },
    borders,
    shading,
    margins,
    children: [
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text,
            bold,
            color,
            size,
          }),
        ],
      }),
    ],
  })
}

/**
 * Create a table row with label and value cells
 */
function createLabelValueRow(label: string, value: string, labelWidth = 15, valueWidth = 85) {
  return new TableRow({
    children: [
      createTextCell({ text: label, width: labelWidth, bold: true }),
      createTextCell({ text: value, width: valueWidth })
    ]
  })
}

/**
 * Create a borderless table with standard configuration
 */
function createBorderlessTable(rows: TableRow[], width = 100) {
  return new Table({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: {
      top: STYLES.borders.none,
      bottom: STYLES.borders.none,
      left: STYLES.borders.none,
      right: STYLES.borders.none,
      insideHorizontal: STYLES.borders.none,
      insideVertical: STYLES.borders.none,
    },
    rows
  })
}

/**
 * Create header section with business information
 */
function createHeader({
  type,
  documentNumber,
  profile,
  template,
  logoImage
}: {
  type: 'invoice' | 'quote';
  documentNumber: string;
  profile: SelectProfile;
  template: SelectTemplate;
  logoImage?: { data: ArrayBuffer; width: number; height: number };
}) {
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
        spacing: { after: STYLES.spacing.medium },
      })
    )
  }
  
  // Prepare business info rows
  const businessFields = [
    { label: "Business:", value: profile.businessName },
    { label: "Email:", value: profile.businessEmail },
    { label: "Phone:", value: profile.businessPhone },
    { label: "Address:", value: profile.businessAddress },
    { label: "Tax Number:", value: profile.vatNumber }
  ].filter(field => field.value)
  
  const businessInfoRows = businessFields.map(field => 
    createLabelValueRow(field.label, field.value || "")
  )
  
  // Add business info table
  headerElements.push(createBorderlessTable(businessInfoRows))
  
  return headerElements
}

/**
 * Create client information section
 */
function createClientSection(client?: SelectClient) {
  const clientElements = []
  
  if (client) {
    // Add client name
    clientElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: client.name,
            bold: true,
            size: STYLES.fonts.regular,
          }),
        ],
      })
    )
    
    // Add client details
    const clientDetails = [
      { label: 'Email', value: client.email },
      { label: 'Phone', value: client.phone },
      { label: 'Address', value: client.address },
      { label: 'Tax Number', value: client.taxNumber }
    ].filter(detail => detail.value)
    
    clientDetails.forEach(detail => {
      clientElements.push(
        new Paragraph({
          text: `${detail.label}: ${detail.value}`,
          spacing: { before: STYLES.spacing.tiny }
        })
      )
    })
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
 */
function createDocumentInfo({
  type,
  document,
  client
}: {
  type: 'invoice' | 'quote';
  document: SelectInvoice | SelectQuote;
  client?: SelectClient;
}) {
  // Define the document info rows
  const infoData = [
    {
      label: "Document Number:",
      value: type === 'invoice' 
        ? (document as SelectInvoice).invoiceNumber 
        : (document as SelectQuote).quoteNumber
    },
    {
      label: "Date:",
      value: formatDate(new Date(document.issueDate))
    },
    {
      label: type === 'invoice' ? "Due Date:" : "Valid Until:",
      value: formatDate(new Date(
        type === 'invoice' 
          ? (document as SelectInvoice).dueDate 
          : (document as SelectQuote).validUntil
      ))
    },
    {
      label: "Client:",
      value: client?.name || "No client specified"
    },
    {
      label: "Status:",
      value: document.status.toUpperCase()
    }
  ]
  
  // Create rows
  const infoRows = infoData.map(row => 
    createLabelValueRow(row.label, row.value, 30, 70)
  )
  
  // Create and return the info table
  return [createBorderlessTable(infoRows)]
}

/**
 * Create items table for the document
 */
function createItemsTable(items: SelectInvoiceItem[] | SelectQuoteItem[]) {
  // Helper function to create header cell
  function createHeaderCell(text: string, width: number, alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT) {
    return createTextCell({
      text,
      width,
      bold: true,
      color: STYLES.colors.white,
      alignment,
      shading: {
        fill: STYLES.colors.primary,
        type: ShadingType.SOLID,
      }
    })
  }
  
  // Create header row
  const headerRow = new TableRow({
    tableHeader: true,
    height: { value: STYLES.spacing.large, rule: "exact" },
    children: [
      createHeaderCell("#", 5, AlignmentType.CENTER),
      createHeaderCell("Description", 35),
      createHeaderCell("Quantity", 10, AlignmentType.RIGHT),
      createHeaderCell("Unit Price", 15, AlignmentType.RIGHT),
      createHeaderCell("Tax %", 10, AlignmentType.RIGHT),
      createHeaderCell("Tax Amt", 10, AlignmentType.RIGHT),
      createHeaderCell("Total", 15, AlignmentType.RIGHT)
    ],
  })
  
  // Create rows for each item
  const itemRows = items.map((item, index) => {
    return new TableRow({
      children: [
        createTextCell({ text: (index + 1).toString(), width: 5, alignment: AlignmentType.CENTER }),
        createTextCell({ text: item.description, width: 35 }),
        createTextCell({ text: item.quantity, width: 10, alignment: AlignmentType.RIGHT }),
        createTextCell({ text: formatCurrency(item.unitPrice), width: 15, alignment: AlignmentType.RIGHT }),
        createTextCell({ text: `${item.taxRate}%`, width: 10, alignment: AlignmentType.RIGHT }),
        createTextCell({ text: formatCurrency(item.taxAmount || '0'), width: 10, alignment: AlignmentType.RIGHT }),
        createTextCell({ text: formatCurrency(item.total), width: 15, alignment: AlignmentType.RIGHT })
      ],
    })
  })
  
  // Create and return the table
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: STYLES.borders.single,
      bottom: STYLES.borders.single,
      left: STYLES.borders.single,
      right: STYLES.borders.single,
      insideHorizontal: STYLES.borders.single,
      insideVertical: STYLES.borders.single
    },
    rows: [headerRow, ...itemRows],
  })
}

/**
 * Create totals section for the document
 */
function createTotalsSection(document: SelectInvoice | SelectQuote) {
  const totalElements: (Paragraph | Table)[] = [SPACER]
  
  // Helper for creating total rows
  function createTotalRow(label: string, amount: string, highlight = false) {
    const cellOptions = highlight ? {
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        left: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        right: { style: BorderStyle.NONE },
      } as ITableCellBorders,
      shading: {
        fill: STYLES.colors.primary,
        type: ShadingType.SOLID,
      }
    } : {
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        left: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        right: { style: BorderStyle.NONE },
      } as ITableCellBorders
    }
    
    const valueCellOptions = highlight ? {
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
      } as ITableCellBorders,
      shading: {
        fill: STYLES.colors.primary,
        type: ShadingType.SOLID,
      }
    } : {
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.SINGLE, size: 1, color: STYLES.colors.border },
      } as ITableCellBorders
    }
    
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          } as ITableCellBorders,
          children: [EMPTY_PARAGRAPH],
        }),
        createTextCell({ 
          text: label, 
          width: 15, 
          bold: true, 
          alignment: AlignmentType.RIGHT,
          color: highlight ? STYLES.colors.white : STYLES.colors.text,
          size: highlight ? STYLES.fonts.medium : STYLES.fonts.small,
          ...cellOptions
        }),
        createTextCell({ 
          text: amount, 
          width: 15, 
          alignment: AlignmentType.RIGHT,
          bold: highlight,
          color: highlight ? STYLES.colors.white : STYLES.colors.text,
          size: highlight ? STYLES.fonts.medium : STYLES.fonts.small,
          ...valueCellOptions
        }),
      ],
    })
  }
  
  // Create totals rows
  const totalsRows = [
    createTotalRow("Subtotal:", formatCurrency(document.subtotal)),
    createTotalRow("Tax Amount:", formatCurrency(document.taxAmount))
  ]
  
  // Add discount if applicable
  if (parseFloat(document.discount) > 0) {
    totalsRows.push(
      createTotalRow("Discount:", `-${formatCurrency(document.discount)}`)
    )
  }
  
  // Add total (highlighted)
  totalsRows.push(
    createTotalRow("Total:", formatCurrency(document.total), true)
  )
  
  // Add totals table
  totalElements.push(
    createBorderlessTable(totalsRows)
  )
  
  return totalElements
}

/**
 * Create notes and terms section for the document
 */
function createNotesSection({
  document,
  profile,
  type
}: {
  document: SelectInvoice | SelectQuote;
  profile: SelectProfile;
  type: 'invoice' | 'quote';
}) {
  const notesElements: Paragraph[] = []
  
  // Helper function to add a section if content exists
  const addSection = (title: string, content?: string) => {
    if (!content) return
    
    notesElements.push(
      createSectionHeading(title),
      new Paragraph({
        text: content,
        spacing: { after: STYLES.spacing.medium }
      })
    )
  }
  
  // Add sections conditionally
  addSection("Notes:", document.notes || undefined)
  addSection("Terms and Conditions:", document.termsAndConditions || undefined)
  
  if (type === 'invoice') {
    addSection("Payment Instructions:", profile.paymentInstructions || undefined)
  }
  
  return notesElements
}

/**
 * Format date to display in document
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
 */
function formatCurrency(value: string): string {
  const numValue = parseFloat(value) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(numValue)
}

/**
 * Convert hex color to RGB string for Word documents
 * with memoization for performance
 */
function hexToRGB(hex: string): string {
  if (!hex || !hex.match(/^#[0-9A-Fa-f]{6}$/)) {
    return "000000"
  }
  
  if (colorCache.has(hex)) {
    return colorCache.get(hex)!
  }
  
  const result = hex.substring(1).toUpperCase()
  colorCache.set(hex, result)
  return result
}