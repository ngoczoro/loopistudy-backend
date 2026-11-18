/**
 * Questions from "heading + items" blocks, with no model call. Slides and bullet notes are often
 * just a title with a short list ("Advantages" / "Back-up and restore data" / "Mobility" …),
 * which has no sentence to blank and no "term: definition" line, but does say which item
 * belongs to which group:
 *   list        "Which of these is listed under "Advantages"?"   (easy)
 *   list-not    "Which of these is NOT listed under "Advantages"?" (medium)
 *   list-group  "Which group lists "Mobility"?"                    (hard, needs 4+ groups)
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

const uniqueItems = (items) => [...new Map(items.map((item) => [normalize(item), item])).values()];

/** Alternate between groups so a long list (seven advantages) does not fill the whole quiz. */
const interleave = (perGroup, random) => {
  const ordered = [];
  for (let round = 0; perGroup.some((questions) => round < questions.length); round += 1) {
    for (const questions of shuffle(perGroup, random)) {
      if (round < questions.length) ordered.push(questions[round]);
    }
  }
  return ordered;
};

const withOptions = (correct, wrong, random) => {
  const options = shuffle([correct, ...wrong], random);
  const correctIndex = options.indexOf(correct);
  return { options, correctIndex, correctAnswer: LETTERS[correctIndex] };
};

/**
 * Three kinds of question from heading + item blocks, all checkable against the notes:
 *   list        easy    "Which of these is listed under X?"   1 item of X + 3 from other groups
 *   list-not    medium  "Which of these is NOT listed under X?"  3 items of X + 1 from another group
 *   list-group  hard    "Which group lists "item"?"          4 group names (needs 4+ groups)
 * "list" and "list-group" on the same item share a sourceKey, so a quiz asks it only once.
 */
export const buildListQuestions = (sources, { random = Math.random } = {}) => {
  const groups = parseListGroupsFromSources(sources);
  const members = [];
  const outsiders = [];
  const owners = [];
  // An item listed under two groups has no single right group; leave it out of "list-group".
  const groupsOf = (item) => groups.filter((group) => group.items.some((own) => normalize(own) === normalize(item)));

  for (const group of groups) {
    const own = new Set(group.items.map(normalize));
    const outside = uniqueItems(
      groups
        .filter((other) => other !== group)
        .flatMap((other) => other.items)
        .filter((item) => !own.has(normalize(item))),
    );
    const vietnamese = isVietnameseText(`${group.label} ${group.items.join(" ")}`);
    const explanation = groupExplanation(group, vietnamese);
    const sourceTopic = group.label.slice(0, 200);

    if (outside.length >= 3) {
      members.push(
        shuffle(group.items, random).map((item) => ({
          kind: "list",
          question: vietnamese
            ? `Mục nào sau đây thuộc "${group.label}"?`
            : `Which of these is listed under "${group.label}"?`,
          ...withOptions(item, shuffle(outside, random).slice(0, 3), random),
          explanation,
          sourceTopic,
          sourceKey: `${normalize(group.label)}|${normalize(item)}`,
        })),
      );
    }

    if (outside.length >= 1 && group.items.length >= 3) {
      // One question per outsider, up to the group size, each with three of the group's items.
      outsiders.push(
        shuffle(outside, random)
          .slice(0, group.items.length)
          .map((outsider) => ({
            kind: "list-not",
            question: vietnamese
              ? `Mục nào sau đây KHÔNG thuộc "${group.label}"?`
              : `Which of these is NOT listed under "${group.label}"?`,
            ...withOptions(outsider, shuffle(group.items, random).slice(0, 3), random),
            explanation,
            sourceTopic,
            sourceKey: `not|${normalize(group.label)}|${normalize(outsider)}`,
          })),
      );
    }

    if (groups.length >= 4) {
      const otherLabels = groups.filter((other) => other !== group).map((other) => other.label);
      owners.push(
        shuffle(group.items, random)
          .filter((item) => groupsOf(item).length === 1)
          .map((item) => ({
            kind: "list-group",
            question: vietnamese ? `"${item}" thuộc nhóm nào?` : `Which group lists "${item}"?`,
            ...withOptions(group.label, shuffle(otherLabels, random).slice(0, 3), random),
            explanation,
            sourceTopic,
            listItem: item,
            sourceKey: `${normalize(group.label)}|${normalize(item)}`,
          })),
      );
    }
  }

  return [...interleave(members, random), ...interleave(outsiders, random), ...interleave(owners, random)];
};

/**
 * Checks a list / list-not / list-group question against the groups in the notes.
 * `sourceTopic` is the group the question is about (the right answer's group for list-group).
 */
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
  const inOwn = (option) => own.has(normalize(option));
  const inOthersOnly = (option) => others.has(normalize(option)) && !own.has(normalize(option));
  const isRight = (index) => index === question.correctIndex;

  if (question.kind === "list-not") {
    return question.options.every((option, index) => (isRight(index) ? inOthersOnly(option) : inOwn(option)));
  }
  if (question.kind === "list-group") {
    const item = normalize(question.listItem);
    const holders = groups.filter((candidate) => candidate.items.some((own) => normalize(own) === item));
    if (holders.length !== 1 || holders[0] !== group) return false;
    const labels = new Set(groups.map((candidate) => candidate.label));
    return (
      question.options[question.correctIndex] === group.label &&
      question.options.every((option) => labels.has(option))
    );
  }
  return question.options.every((option, index) => (isRight(index) ? inOwn(option) : inOthersOnly(option)));
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
