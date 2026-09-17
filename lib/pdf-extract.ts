import { PDFParse } from 'pdf-parse'

export interface PDFPage {
  pageNumber: number
  text: string
}

export interface PDFExtraction {
  filename: string
  totalPages: number
  pages: PDFPage[]
}

export async function extractPDF(buffer: Buffer, filename: string): Promise<PDFExtraction> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    await parser.destroy()

    const pages: PDFPage[] = result.pages.map(p => ({
      pageNumber: p.num,
      text: p.text.trim(),
    }))

    return {
      filename,
      totalPages: result.total,
      pages,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`PDF extraction failed for ${filename}: ${message}`)
    return {
      filename,
      totalPages: 0,
      pages: [],
    }
  }
}

export function extractionToText(extraction: PDFExtraction): string {
  return extraction.pages
    .map(p => `--- Page ${p.pageNumber} ---\n${p.text}`)
    .join('\n\n')
}
