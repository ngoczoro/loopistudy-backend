import { describe, expect, it } from "@jest/globals";
import { extractFacts } from "./fact-extractor.js";
import {
  buildClozeCards,
  buildSentenceQuestions,
  collectTerms,
  sentenceQuestionIsGrounded,
} from "./sentence-items.js";
import { buildFlashcardsFromFacts, buildQuizFromFacts, questionIsGrounded } from "./study-items.js";

// Prose notes like the team's Java file: no "term: definition" lines, terms glossed in English.
const OOP_NOTE = `# Lập trình hướng đối tượng

Kế thừa (Inheritance) cho phép một lớp con dùng lại thuộc tính và phương thức của lớp cha.

Đóng gói (Encapsulation) che giấu dữ liệu bên trong đối tượng và chỉ mở các phương thức công khai.

Đa hình (Polymorphism) giúp một phương thức hoạt động theo nhiều cách tùy đối tượng gọi nó.

Trừu tượng (Abstraction) ẩn chi tiết cài đặt và chỉ đưa ra chức năng cần thiết.

Kế thừa và Đa hình thường được dùng cùng nhau trong các hệ thống lớn.
`;

const facts = extractFacts(OOP_NOTE);
const sequence = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe("collectTerms", () => {
  it("reads 'Term (English)' at the start of prose sentences", () => {
    expect(collectTerms(facts).map((term) => term.main)).toEqual([
      "Kế thừa",
      "Đóng gói",
      "Đa hình",
      "Trừu tượng",
    ]);
    expect(collectTerms(facts)[0].alias).toBe("Inheritance");
  });
});

describe("buildSentenceQuestions", () => {
  const { cloze, statement } = buildSentenceQuestions(facts, { random: sequence([0.3, 0.7, 0.1]) });

  it("blanks the term and its English gloss, with other note terms as options", () => {
    const question = cloze.find((item) => item.explanation.startsWith("Kế thừa"));
    expect(question.question).toBe(
      'Điền vào chỗ trống: "_____ cho phép một lớp con dùng lại thuộc tính và phương thức của lớp cha."',
    );
    expect(question.question).not.toContain("Inheritance");
    expect(question.options[question.correctIndex]).toBe("Kế thừa");
    expect(new Set(question.options).size).toBe(4);
    expect(sentenceQuestionIsGrounded(question, facts)).toBe(true);
  });

  it("offers one true note sentence and three with a swapped term", () => {
    const question = statement.find((item) => item.explanation.startsWith("Đóng gói"));
    expect(question.question).toBe("Phát biểu nào sau đây đúng với ghi chú?");
    expect(question.options[question.correctIndex]).toBe(
      "Đóng gói che giấu dữ liệu bên trong đối tượng và chỉ mở các phương thức công khai.",
    );
    const wrong = question.options.filter((_, index) => index !== question.correctIndex);
    expect(wrong.every((option) => option.endsWith("che giấu dữ liệu bên trong đối tượng và chỉ mở các phương thức công khai."))).toBe(true);
    expect(wrong.some((option) => option.startsWith("Đóng gói"))).toBe(false);
    expect(sentenceQuestionIsGrounded(question, facts)).toBe(true);
  });

  it("skips a sentence that names two terms", () => {
    const all = [...cloze, ...statement];
    expect(all.some((item) => item.explanation.startsWith("Kế thừa và Đa hình"))).toBe(false);
  });

  it("rejects a tampered question", () => {
    const question = { ...cloze[0], correctIndex: (cloze[0].correctIndex + 1) % 4 };
    expect(sentenceQuestionIsGrounded(question, facts)).toBe(false);
  });

  it("builds nothing when the note defines fewer than four terms", () => {
    const short = extractFacts("Kế thừa (Inheritance) cho phép lớp con dùng lại mã của lớp cha.");
    expect(buildSentenceQuestions(short)).toEqual({ cloze: [], statement: [] });
  });
});

describe("real-note edge cases", () => {
  const note = `Kế thừa (Inheritance) cho phép lớp con dùng lại thuộc tính của lớp cha.

Đóng gói (Encapsulation) che giấu dữ liệu bên trong mỗi lớp.

Đa hình (Polymorphism) cho một phương thức nhiều cách hoạt động.

Trừu tượng (Abstraction) ẩn chi tiết cài đặt khỏi người dùng.

Trong Java, lớp (Class) là bản thiết kế dùng để tạo ra các đối tượng.

Khi tạo một kế thừa mới, lớp con nhận toàn bộ thuộc tính được phép.

Đóng gói giữ dữ liệu an toàn, vì vậy đóng gói là nguyên tắc quan trọng.`;
  const noteFacts = extractFacts(note);
  const { cloze, statement } = buildSentenceQuestions(noteFacts, { random: sequence([0.5]) });

  it("does not take a clause with a comma as a term", () => {
    expect(collectTerms(noteFacts).map((term) => term.main)).not.toContain("Trong Java, lớp");
  });

  it("lower-cases a swapped term mid-sentence only if the note writes it that way", () => {
    const question = statement.find((item) => item.explanation.startsWith("Khi tạo một"));
    const swappedIn = (term) =>
      question.options.find((option) => option.toLowerCase().startsWith(`khi tạo một ${term}`));
    expect(question.options[question.correctIndex]).toMatch(/^Khi tạo một kế thừa mới/);
    // "đóng gói" appears lower-case in the note; "Đa hình" / "Trừu tượng" never do (kept as written).
    if (swappedIn("đóng gói")) expect(swappedIn("đóng gói")).toMatch(/^Khi tạo một đóng gói/);
    if (swappedIn("đa hình")) expect(swappedIn("đa hình")).toMatch(/^Khi tạo một Đa hình/);
    if (swappedIn("trừu tượng")) expect(swappedIn("trừu tượng")).toMatch(/^Khi tạo một Trừu tượng/);
  });

  it("skips a sentence that repeats its term", () => {
    const all = [...cloze, ...statement];
    expect(all.some((item) => item.explanation.includes("vì vậy đóng gói"))).toBe(false);
  });
});

describe("quiz and flashcards from prose notes", () => {
  it("mixes cloze and statement questions instead of 'which line is from your notes?'", async () => {
    const quiz = await buildQuizFromFacts(
      facts,
      { numberOfQuestions: 6, difficulty: "mixed", title: "OOP" },
      { random: sequence([0.2, 0.6, 0.9]), rewriteQuestions: async () => new Map() },
    );
    const kinds = new Set(quiz.questions.map((question) => question.kind));
    expect(kinds).toEqual(new Set(["cloze", "statement"]));
    expect(quiz.questions.some((question) => /Câu nào dưới đây đúng với ghi chú/.test(question.question))).toBe(false);
    expect(quiz.questions.every((question) => questionIsGrounded(question, facts))).toBe(true);
    expect(new Set(quiz.questions.map((question) => question.explanation)).size).toBe(quiz.questions.length);
  });

  it("makes cloze flashcards when there are no 'term: definition' lines", async () => {
    const cards = await buildFlashcardsFromFacts(
      facts,
      { numberOfCards: 3 },
      { random: sequence([0.4]), rewriteFronts: async () => new Map() },
    );
    expect(cards).toHaveLength(3);
    expect(cards.every((card) => card.front.startsWith("Điền vào chỗ trống"))).toBe(true);
    expect(cards.map((card) => card.back).every((back) => collectTerms(facts).some((term) => term.main === back))).toBe(true);
    expect(buildClozeCards(facts).length).toBeGreaterThanOrEqual(3);
  });
});
