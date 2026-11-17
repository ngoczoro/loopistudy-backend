/**
 * pdf-parse returns one line per printed line, so a sentence that wraps on the page is split:
 *   "Kế thừa cho phép một lớp con dùng lại các thuộc tính và"
 *   "phương thức của lớp cha."
 * Quiz and flashcard building work on whole lines/sentences, so rejoin wrapped lines.
 *
 * A line continues the previous one only when all hold:
 *   - the previous line is long (a wrapped line fills the width; headings and list items do not)
 *   - the previous line does not end a sentence or clause (. ! ? : ;)
 *   - this line starts with a lower-case letter and is not a bullet
 *   - no blank line in between (paragraph or page boundary)
 */

const MIN_WRAPPED_CHARS = 40;
const ENDS_CLAUSE = /[.!?:;。…]["')\]]?$/u;
const BULLET = /^(?:[-*•▪◦]|\d+[.)])\s+/;
const STARTS_LOWER = /^\p{Ll}/u;

const continues = (previous, line) =>
  previous.length >= MIN_WRAPPED_CHARS &&
  !ENDS_CLAUSE.test(previous) &&
  !BULLET.test(line) &&
  STARTS_LOWER.test(line);

export const joinWrappedPdfLines = (text = "") => {
  const lines = [];
  for (const raw of String(text).replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    const previous = lines[lines.length - 1];
    if (line && previous && continues(previous, line)) {
      // "lock-" + "in" -> "lock-in": keep the hyphen, drop the space.
      lines[lines.length - 1] = previous.endsWith("-") ? `${previous}${line}` : `${previous} ${line}`;
    } else {
      lines.push(line);
    }
  }
  return lines.join("\n");
};
