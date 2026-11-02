import { CHUNK_OVERLAP_CHARS, CHUNK_SIZE_CHARS } from "./assistant.constants.js";

/** Bump when chunk boundaries change so the indexer re-embeds existing docs. */
export const ASSISTANT_CHUNKER_VERSION = 2;

/** Resume / lecture headings we keep glued to their body. */
const KNOWN_SECTION_HEADERS = new Set(
  [
    "about me",
    "summary",
    "profile",
    "objective",
    "education",
    "experience",
    "work experience",
    "professional experience",
    "technical skills",
    "skills",
    "core skills",
    "projects",
    "personal projects",
    "honors and certifications",
    "certifications",
    "honors",
    "awards",
    "publications",
    "interests",
    "references",
    "activities",
    "volunteer",
    "volunteer experience",
  ].map((s) => s.toLowerCase()),
);

export const isSectionHeader = (line) => {
  const trimmed = String(line ?? "").trim();
  if (trimmed.length < 3 || trimmed.length > 48) return false;
  if (/[.:;]$/.test(trimmed)) return false;
  if (/^\d+(\s|\/|of)/i.test(trimmed)) return false;
  return KNOWN_SECTION_HEADERS.has(trimmed.toLowerCase());
};

/**
 * Split into sections so headings like "Technical Skills" stay with their body
 * instead of being glued to the previous Experience bullets.
 */
export const splitBySectionHeaders = (text) => {
  const normalized = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const sections = [];
  let currentHeader = null;
  let buffer = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (!currentHeader && !body) return;
    const chunkText = currentHeader
      ? body
        ? `${currentHeader}\n${body}`
        : currentHeader
      : body;
    if (chunkText) {
      sections.push({
        header: currentHeader,
        text: chunkText,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    if (isSectionHeader(line)) {
      flush();
      currentHeader = line.trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  return sections.length > 1 ? sections : null;
};

/**
 * Split plain text into overlapping chunks (~500 tokens / ~2000 chars).
 * @returns {{ chunkIndex: number, chunkText: string, location: string|null }[]}
 */
export const splitIntoChunks = (text, { locationPrefix = "Đoạn", header = null } = {}) => {
  const normalized = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return [];

  const size = Math.max(400, CHUNK_SIZE_CHARS);
  const overlap = Math.min(Math.max(0, CHUNK_OVERLAP_CHARS), Math.floor(size / 2));
  const prefix = header ? `${header}\n` : "";
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);

    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf("\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
      );
      if (breakAt > size * 0.4) {
        end = start + breakAt + (window[breakAt] === "." ? 1 : 0);
      }
    }

    let chunkText = normalized.slice(start, end).trim();
    // Keep section title on continuation chunks so keyword retrieve still finds them.
    if (prefix && header && !chunkText.startsWith(header)) {
      chunkText = `${prefix}${chunkText}`.trim();
    }
    if (chunkText.length > 0) {
      chunks.push({
        chunkIndex: index,
        chunkText,
        location: `${locationPrefix} ${index + 1}`,
      });
      index += 1;
    }

    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
};

/**
 * Prefer section boundaries (resume/lecture headings), then size-based splits.
 */
export const splitForRag = (text) => {
  const sections = splitBySectionHeaders(text);
  if (!sections) return splitIntoChunks(text);

  const chunks = [];
  let index = 0;
  for (const section of sections) {
    const label = section.header || "Đoạn";
    const parts = splitIntoChunks(section.text, {
      locationPrefix: label,
      header: section.header,
    });
    for (const part of parts) {
      chunks.push({
        ...part,
        chunkIndex: index,
        location: parts.length === 1 ? label : `${label} · phần ${part.chunkIndex + 1}`,
      });
      index += 1;
    }
  }
  return chunks;
};

/** Prefer page breaks (form feed) from PDF extractors when present. */
export const splitPdfByPages = (text) => {
  const pages = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\f")
    .map((page) => page.trim())
    .filter(Boolean);

  if (pages.length <= 1) return null;

  const chunks = [];
  let index = 0;
  pages.forEach((page, pageIndex) => {
    const pageChunks = splitForRag(page).map((chunk) => ({
      ...chunk,
      location: `Trang ${pageIndex + 1} · ${chunk.location}`,
    }));
    pageChunks.forEach((chunk) => {
      chunks.push({ ...chunk, chunkIndex: index });
      index += 1;
    });
  });
  return chunks;
};
