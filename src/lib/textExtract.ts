import JSZip from 'jszip'

export interface ExtractedSource {
  fileName: string
  text: string
}

/** Pulls plain study text out of whatever a student throws at it: pasted
 * text, .txt/.md notes, PDF slide decks/readings, Word documents, or
 * PowerPoint exports. */
export async function extractTextFromFile(file: File): Promise<ExtractedSource> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf')) {
    return { fileName: file.name, text: await extractPdf(file) }
  }
  if (name.endsWith('.pptx')) {
    return { fileName: file.name, text: await extractPptx(file) }
  }
  if (name.endsWith('.docx')) {
    return { fileName: file.name, text: await extractDocx(file) }
  }
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    return { fileName: file.name, text: await file.text() }
  }

  // Fall back to reading as plain text; most study notes are text-based.
  return { fileName: file.name, text: await file.text() }
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      // Insert a line break after items pdf.js marks as ending a line, so
      // sentence/paragraph structure survives instead of one run-on string.
      let pageText = ''
      for (const item of content.items) {
        if (!('str' in item)) continue
        pageText += item.str
        pageText += item.hasEOL ? '\n' : ' '
      }
      pages.push(pageText)
    } catch (pageError) {
      // One malformed/corrupt page shouldn't blank out an otherwise-readable
      // document - skip it and keep extracting the rest.
      console.warn(`Skipping unreadable PDF page ${i}:`, pageError)
    }
  }

  if (pages.length === 0) {
    throw new Error('No readable pages found in this PDF (it may be scanned/image-only).')
  }
  return pages.join('\n\n')
}

async function extractPptx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file)
  const slideFiles = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => slideNumber(a) - slideNumber(b))

  const slideTexts: string[] = []
  for (const path of slideFiles) {
    const xml = await zip.files[path].async('text')
    slideTexts.push(textFromSlideXml(xml))
  }
  return slideTexts.join('\n\n')
}

async function extractDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file)
  const documentXml = zip.file('word/document.xml')
  if (!documentXml) return ''

  const xml = await documentXml.async('text')
  const paragraphs = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
  return paragraphs
    .map((p) => textFromParagraphXml(p[0]))
    .filter(Boolean)
    .join('\n')
}

/** Pulls the text inside <w:t> runs out of one Word paragraph's XML, treating
 * <w:tab/> and <w:br/> as whitespace so runs don't get jammed together. */
function textFromParagraphXml(xml: string): string {
  const withBreaks = xml.replace(/<w:(?:tab|br|cr)\s*\/>/g, ' ')
  const matches = [...withBreaks.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
  return matches
    .map((m) => decodeXmlEntities(m[1]))
    .join('')
    .trim()
}

function slideNumber(path: string): number {
  const match = path.match(/slide(\d+)\.xml$/)
  return match ? Number(match[1]) : 0
}

/** Pulls the text inside <a:t> runs out of a slide's XML without a full XML parser. */
function textFromSlideXml(xml: string): string {
  const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
  return matches.map((m) => decodeXmlEntities(m[1])).join(' ')
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
