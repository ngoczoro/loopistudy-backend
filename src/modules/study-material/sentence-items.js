/**
 * Questions built from the note's own sentences, with no model call:
 *   cloze      "Điền vào chỗ trống: ___ cho phép lớp con…"  options = terms from the note
 *   statement  "Phát biểu nào sau đây đúng?"                 1 note sentence + 3 with a swapped term
 * Everything shown comes from the note text, so these stay correct and work when Ollama is down.
 */
import { isQuestionTerm, isStructuralTerm } from "./fact-extractor.js";

const LETTERS = ["A", "B", "C", "D"];
const MIN_SENTENCE_CHARS = 30;
const MAX_SENTENCE_CHARS = 280;
const MIN_TERMS = 4; // one answer + three distractors

const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const shuffle = (items, random) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

const isVietnameseText = (text) =>
  /[ăâêôơưđáàảãạắằấầéèẹẻẽíìịỉĩóòọỏõúùụủũýỳỵỷỹ]/i.test(text);

// "Kế thừa (Inheritance)" -> main "Kế thừa", alias "Inheritance".
const GLOSS = /^(.+?)\s*\(([^()]{2,40})\)$/u;
// A sentence that opens with a glossed term: "Kế thừa (Inheritance) cho phép…".
const LEADING_GLOSSED_TERM = /^([\p{L}\p{N}][\p{L}\p{N} -]{1,38}?)\s*\(([A-Za-z][A-Za-z0-9 .+#-]{1,38})\)/u;

const toTerm = (raw) => {
  const value = clean(raw);
  // A comma means a clause, not a term ("Trong Java, lớp (Class) là…").
  if (!value || /[.,?!;{}/]/.test(value.replace(GLOSS, "$1"))) return null;
  const gloss = value.match(GLOSS);
  const main = clean(gloss ? gloss[1] : value);
  const words = main.split(" ").length;
  if (main.length < 2 || main.length > 40 || words > 5) return null;
  if (isStructuralTerm(main) || isQuestionTerm(main)) return null;
  return { main, alias: gloss ? clean(gloss[2]) : null };
};

/** Terms the note defines: fact labels plus "Term (English)" at the start of a sentence. */
export const collectTerms = (facts) => {
  const terms = new Map();
  const add = (raw) => {
    const term = toTerm(raw);
    if (term && !terms.has(normalize(term.main))) terms.set(normalize(term.main), term);
  };
  for (const fact of facts) {
    if (fact.term) add(fact.term);
    const leading = clean(fact.sentence).match(LEADING_GLOSSED_TERM);
    if (leading) add(`${leading[1]} (${leading[2]})`);
  }
  return [...terms.values()];
};

/** Whole-word, case-insensitive match that also works for Vietnamese letters. */
const termPattern = (text, flags = "iu") =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(text)}(?![\\p{L}\\p{N}])`, flags);

const countOccurrences = (sentence, text) =>
  (sentence.match(termPattern(text, "giu")) ?? []).length;

/** Note sentences short enough to read as one option, each tied to its fact's heading. */
const collectSentences = (facts) => {
  const seen = new Set();
  const sentences = [];
  for (const fact of facts) {
    for (const piece of clean(fact.sentence).split(/(?<=[.!?])\s+/)) {
      const text = clean(piece);
      const key = normalize(text);
      if (text.length < MIN_SENTENCE_CHARS || text.length > MAX_SENTENCE_CHARS) continue;
      if (text.split(" ").length < 5 || seen.has(key)) continue;
      seen.add(key);
      sentences.push({ text, heading: fact.heading ?? null });
    }
  }
  return sentences;
};

/**
 * The single term a sentence is about, or null when it names none, several, or the same one
 * twice (a second mention would give the blank away and make the swap ambiguous).
 */
const soleTerm = (sentence, terms) => {
  const found = terms.filter((term) => termPattern(term.main).test(sentence));
  if (found.length !== 1 || countOccurrences(sentence, found[0].main) !== 1) return null;
  return found[0];
};

const startsLowerCase = (text) => {
  const first = text.charAt(0);
  return first === first.toLowerCase() && first !== first.toUpperCase();
};

/**
 * Lower-case the replacement where the replaced term sat lower-case mid-sentence ("một đối
 * tượng"), but only for terms the note itself writes lower-case: "Java" stays "Java".
 */
const matchCase = (replacement, original, lowerCaseTerms) =>
  startsLowerCase(original) && lowerCaseTerms.has(normalize(replacement))
    ? replacement.charAt(0).toLowerCase() + replacement.slice(1)
    : replacement;

/** Terms the note writes starting lower-case somewhere (common nouns, not names). */
const termsSeenLowerCase = (sentences, terms) =>
  new Set(
    terms
      .filter((term) =>
        sentences.some(({ text }) =>
          (text.match(termPattern(term.main, "giu")) ?? []).some(startsLowerCase),
        ),
      )
      .map((term) => normalize(term.main)),
  );

/**
 * Sentence with the term (and its "(English)" gloss, which would give it away) replaced.
 * Passing the term itself as replacement keeps the original wording and drops just the gloss.
 */
const replaceTerm = (sentence, term, replacement, lowerCaseTerms = new Set()) => {
  const gloss = term.alias ? `(?:\\s*\\(${escapeRegex(term.alias)}\\))?` : "";
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(${escapeRegex(term.main)})(?![\\p{L}\\p{N}])${gloss}`,
    "iu",
  );
  return clean(
    sentence.replace(pattern, (_match, original) =>
      replacement === term.main ? original : matchCase(replacement, original, lowerCaseTerms),
    ),
  );
};

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** Three other terms from the same note, in random order. */
const pickDistractors = (term, terms, random) =>
  shuffle(
    terms.filter((other) => normalize(other.main) !== normalize(term.main)),
    random,
  ).slice(0, 3);

const toOptions = (correct, wrong, random) => {
  const options = shuffle([correct, ...wrong], random);
  const correctIndex = options.indexOf(correct);
  return { options, correctIndex, correctAnswer: LETTERS[correctIndex] };
};

const buildCloze = ({ sentence, heading }, term, terms, random) => {
  const distractors = pickDistractors(term, terms, random);
  if (distractors.length < 3) return null;
  const blanked = replaceTerm(sentence, term, "_____");
  // The gloss may also appear later in the sentence ("… Inheritance giúp…"): skip, it leaks.
  if (term.alias && termPattern(term.alias).test(blanked)) return null;
  const prompt = isVietnameseText(sentence) ? "Điền vào chỗ trống" : "Fill in the blank";
  return {
    kind: "cloze",
    question: `${prompt}: "${blanked}"`,
    ...toOptions(term.main, distractors.map((other) => other.main), random),
    explanation: sentence,
    sourceTopic: (heading || term.main).slice(0, 200),
  };
};

const buildStatement = (
  { sentence, heading },
  term,
  terms,
  { knownSentences, lowerCaseTerms },
  random,
) => {
  const truth = replaceTerm(sentence, term, term.main);
  const falsehoods = [];
  for (const other of pickDistractors(term, terms, random)) {
    const swapped = replaceTerm(sentence, term, other.main, lowerCaseTerms);
    const swappedAtStart = swapped.startsWith(other.main) ? capitalize(swapped) : swapped;
    // A swap that reproduces another real sentence of the note would be a true statement.
    if (knownSentences.has(normalize(swappedAtStart))) continue;
    falsehoods.push(swappedAtStart);
  }
  if (falsehoods.length < 3) return null;
  const prompt = isVietnameseText(sentence)
    ? "Phát biểu nào sau đây đúng với ghi chú?"
    : "Which statement matches your notes?";
  return {
    kind: "statement",
    question: prompt,
    ...toOptions(truth, falsehoods, random),
    explanation: sentence,
    sourceTopic: (heading || term.main).slice(0, 200),
  };
};

/**
 * Cloze and statement questions for these facts. Each note sentence feeds at most one question
 * of each kind. Returns { cloze: [], statement: [] }, both shuffled.
 */
export const buildSentenceQuestions = (facts, { random = Math.random } = {}) => {
  const terms = collectTerms(facts);
  if (terms.length < MIN_TERMS) return { cloze: [], statement: [] };

  const sentences = collectSentences(facts);
  const knownSentences = new Set(
    sentences.flatMap(({ text }) => {
      const term = soleTerm(text, terms);
      return [normalize(text), term ? normalize(replaceTerm(text, term, term.main)) : null];
    }).filter(Boolean),
  );
  const lowerCaseTerms = termsSeenLowerCase(sentences, terms);

  const cloze = [];
  const statement = [];
  for (const item of shuffle(sentences, random)) {
    const term = soleTerm(item.text, terms);
    if (!term) continue;
    const blank = buildCloze({ sentence: item.text, heading: item.heading }, term, terms, random);
    if (blank) cloze.push(blank);
    const pick = buildStatement(
      { sentence: item.text, heading: item.heading },
      term,
      terms,
      { knownSentences, lowerCaseTerms },
      random,
    );
    if (pick) statement.push(pick);
  }
  return { cloze, statement };
};

/** Checks a cloze / statement question against the note it came from. */
export const sentenceQuestionIsGrounded = (question, facts) => {
  if (!question?.question || question.options?.length !== 4) return false;
  if (new Set(question.options.map(normalize)).size !== 4) return false;
  const sentences = collectSentences(facts).map(({ text }) => text);
  if (!sentences.includes(question.explanation)) return false;

  const terms = collectTerms(facts);
  const term = soleTerm(question.explanation, terms);
  if (!term) return false;
  const correct = question.options[question.correctIndex];

  if (question.kind === "cloze") {
    const allowed = new Set(terms.map((item) => normalize(item.main)));
    return (
      normalize(correct) === normalize(term.main) &&
      question.options.every((option) => allowed.has(normalize(option)))
    );
  }
  if (question.kind === "statement") {
    return normalize(correct) === normalize(replaceTerm(question.explanation, term, term.main));
  }
  return false;
};

/**
 * Cloze flashcards: front is the note sentence with the term blanked, back is the term.
 * Used when the note has few "term: definition" lines to turn into cards.
 */
export const buildClozeCards = (facts, { random = Math.random } = {}) =>
  buildSentenceQuestions(facts, { random }).cloze.map((question) => ({
    front: question.question,
    back: question.options[question.correctIndex],
  }));
