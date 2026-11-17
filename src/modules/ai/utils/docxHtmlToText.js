/**
 * Plain text from mammoth's DOCX HTML, keeping the structure quiz and flashcard building need.
 * mammoth.extractRawText separates every paragraph with a blank line and drops bullet markers,
 * so a heading and its list items look like unrelated paragraphs. Here:
 *   headings / paragraphs  one block each (blank line between)
 *   list items             "- item" lines grouped in one block
 *   table rows             "cell | cell" lines
 */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const decodeEntities = (text) =>
  text
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_match, name) => ENTITIES[name]);

export const docxHtmlToText = (html = "") =>
  decodeEntities(
    String(html)
      // <li><p>item</p></li> must stay one line, not a paragraph per item.
      .replace(/(<li\b[^>]*>)\s*<p\b[^>]*>/gi, "$1")
      .replace(/<\/p>\s*(<\/li>)/gi, "$1")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|h[1-6])>/gi, "\n\n")
      .replace(/<(?:ul|ol)\b[^>]*>|<\/(?:ul|ol)>/gi, "\n\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/?table\b[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").replace(/\s*\|\s*$/, "").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
