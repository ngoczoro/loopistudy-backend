/**
 * Questions from "heading + items" blocks, with no model call. Slides and bullet notes are often
 * just a title with a short list ("Advantages" / "Back-up and restore data" / "Mobility" …),
 * which has no sentence to blank and no "term: definition" line, but does say which item
 * belongs to which group:
 *   list  "Which of these is listed under "Advantages"?"  1 item of that group + 3 of others
 */
import { isOutlineText } from "./fact-extractor.js";

const LETTERS = ["A", "B", "C", "D"];
const MIN_ITEMS = 3;
const MAX_LABEL_WORDS = 8;
const MAX_ITEM_WORDS = 10;
const MAX_ITEM_CHARS = 80;

const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const wordCount = (text) => text.split(" ").filter(Boolean).length;

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

const BULLET = /^(?:[-*•▪◦]|\d+[.)])\s+/;
// Lines added by extractors, not by the author: "Slide 4:" and the "# Title" we prepend.
const isMarkerLine = (line) => /^slide\s+\d+\s*:?$/i.test(line) || /^#\s/.test(line);

const asLabel = (line) => {
  // "- Rẻ" is an item, never a group name ("1. Tổng quan" can still head a section).
  if (/^[-*•▪◦]\s+/.test(line)) return null;
  const label = clean(line.replace(/^#+\s*/, "").replace(/:\s*$/, ""));
  if (!label || label.length > 60 || wordCount(label) > MAX_LABEL_WORDS) return null;
  // A question ("What are they?"), a sentence, or "Chương 1: …" is not a group name.
  if (/[?.!]$/.test(label) || label.includes(":")) return null;
  return label;
};

const asItem = (line) => {
  const item = clean(line.replace(BULLET, ""));
  if (!item || item.length > MAX_ITEM_CHARS || wordCount(item) > MAX_ITEM_WORDS) return null;
  if (/:$/.test(item)) return null;
  return item;
};

/**
 * Groups of `{ label, items }` found in a document: a short heading line followed by at least
 * three short item lines (in the same block, or as a bullet list right after a lone heading).
 * Course outlines are skipped; their "items" are lesson titles, not content.
 */
export const parseListGroups = (text) => {
  if (!text || isOutlineText(text)) return [];
  const groups = [];
  let pendingLabel = null;

  for (const block of String(text).replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !isMarkerLine(line));
    if (!lines.length) continue;

    const allBullets = lines.every((line) => BULLET.test(line));
    const label = allBullets ? pendingLabel : asLabel(lines[0]);
    const itemLines = allBullets ? lines : lines.slice(1);
    pendingLabel = lines.length === 1 ? asLabel(lines[0]) : null;
    if (!label) continue;

    const items = [];
    const seen = new Set();
    for (const line of itemLines) {
      const item = asItem(line);
      if (!item) {
        items.length = 0; // a long line means this block is prose, not a list
        break;
      }
      if (!seen.has(normalize(item))) {
        seen.add(normalize(item));
        items.push(item);
      }
    }
    if (items.length >= MIN_ITEMS) groups.push({ label, items });
  }
  return groups;
};

export const parseListGroupsFromSources = (sources = []) => sources.flatMap(parseListGroups);

const groupExplanation = ({ label, items }, vietnamese) =>
  vietnamese
    ? `Theo tài liệu, "${label}" gồm: ${items.join(", ")}.`
    : `In your notes, "${label}" lists: ${items.join(", ")}.`;

/** "Which is listed under X" for every item of every group that has three outside items. */
export const buildListQuestions = (sources, { random = Math.random } = {}) => {
  const groups = parseListGroupsFromSources(sources);
  const perGroup = [];

  for (const group of groups) {
    const own = new Set(group.items.map(normalize));
    const outside = [
      ...new Map(
        groups
          .filter((other) => other !== group)
          .flatMap((other) => other.items)
          .filter((item) => !own.has(normalize(item)))
          .map((item) => [normalize(item), item]),
      ).values(),
    ];
    if (outside.length < 3) continue;

    const vietnamese = isVietnameseText(`${group.label} ${group.items.join(" ")}`);
    const questions = [];
    for (const item of shuffle(group.items, random)) {
      const options = shuffle([item, ...shuffle(outside, random).slice(0, 3)], random);
      const correctIndex = options.indexOf(item);
      questions.push({
        kind: "list",
        question: vietnamese
          ? `Mục nào sau đây thuộc "${group.label}"?`
          : `Which of these is listed under "${group.label}"?`,
        options,
        correctIndex,
        correctAnswer: LETTERS[correctIndex],
        explanation: groupExplanation(group, vietnamese),
        sourceTopic: group.label.slice(0, 200),
        // One question per item: the group explanation is shared, so dedupe on this instead.
        sourceKey: `${normalize(group.label)}|${normalize(item)}`,
      });
    }
    perGroup.push(questions);
  }

  // Alternate between groups so a long list (seven advantages) does not fill the whole quiz.
  const ordered = [];
  for (let round = 0; perGroup.some((questions) => round < questions.length); round += 1) {
    for (const questions of shuffle(perGroup, random)) {
      if (round < questions.length) ordered.push(questions[round]);
    }
  }
  return ordered;
};

/** The right option is in the named group; every other option is in some other group. */
export const listQuestionIsGrounded = (question, sources) => {
  if (!question?.question || question.options?.length !== 4) return false;
  if (new Set(question.options.map(normalize)).size !== 4) return false;
  const groups = parseListGroupsFromSources(sources);
  const group = groups.find((item) => item.label === question.sourceTopic);
  if (!group) return false;

  const own = new Set(group.items.map(normalize));
  const others = new Set(
    groups.filter((item) => item !== group).flatMap((item) => item.items.map(normalize)),
  );
  return question.options.every((option, index) =>
    index === question.correctIndex
      ? own.has(normalize(option))
      : others.has(normalize(option)) && !own.has(normalize(option)),
  );
};

/** One card per group: front asks what the group lists, back is the list. */
export const buildListCards = (sources) =>
  parseListGroupsFromSources(sources).map((group) => {
    const vietnamese = isVietnameseText(`${group.label} ${group.items.join(" ")}`);
    return {
      front: vietnamese ? `"${group.label}" gồm những gì?` : `What is listed under "${group.label}"?`,
      back: group.items.join(", "),
    };
  });
