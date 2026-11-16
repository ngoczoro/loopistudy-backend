const PAIR_PATTERN = /^[-*•]?\s*(.{2,80}?)\s*(?::|—|–)\s+(.{8,})$/;
const DEFINITION_PATTERN =
  /^[-*•]?\s*(.{2,80}?)\s+(?:là|is|are|means|refers to)\s+(.{8,})$/i;

const toPlainText = (value) =>
  String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\r/g, "")
    .trim();

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const stripMarker = (line) => line.replace(/^[-*•]\s*/, "").replace(/^\d+[\).]\s*/, "").trim();

/**
 * Pull term/definition facts out of a student's note or file.
 * Every fact keeps the source sentence the checker can require later.
 */
export const extractFacts = (raw, { limit = 30 } = {}) => {
  const text = toPlainText(raw);
  if (!text) return [];

  const facts = [];
  const seen = new Set();
  let heading = null;

  const push = ({ term, definition, sentence }) => {
    const nextSentence = clean(sentence);
    const nextDefinition = clean(definition);
    const nextTerm = clean(term) || null;
    if (nextSentence.length < 12 || nextDefinition.length < 8) return;
    if (nextTerm && nextTerm.toLowerCase() === nextDefinition.toLowerCase()) return;
    const key = nextSentence.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    facts.push({
      term: nextTerm && nextTerm.length <= 80 ? nextTerm : null,
      definition: nextDefinition.slice(0, 400),
      sentence: nextSentence.slice(0, 500),
      heading,
    });
  };

  for (const block of text.split(/\n{2,}/)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (
      lines.length === 1 &&
      lines[0].length <= 80 &&
      !/[.?!]$/.test(lines[0]) &&
      !PAIR_PATTERN.test(lines[0]) &&
      !DEFINITION_PATTERN.test(lines[0])
    ) {
      heading = lines[0].replace(/^#+\s*/, "").slice(0, 120);
      continue;
    }

    for (const line of lines) {
      if (/^#{1,6}\s+/.test(line)) {
        heading = line.replace(/^#{1,6}\s+/, "").slice(0, 120);
        continue;
      }

      const source = stripMarker(line);
      const pair = source.match(PAIR_PATTERN);
      if (pair && !/^https?:/i.test(pair[1])) {
        push({ term: pair[1], definition: pair[2], sentence: source });
        continue;
      }

      const defined = source.match(DEFINITION_PATTERN);
      if (defined && !/^https?:/i.test(defined[1])) {
        push({ term: defined[1], definition: defined[2], sentence: source });
        continue;
      }

      if (source.length >= 40) {
        push({ term: null, definition: source, sentence: source });
      }
    }
  }

  return facts.slice(0, limit).map((fact, index) => ({
    ...fact,
    id: `f${index + 1}`,
  }));
};
