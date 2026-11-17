import { describe, expect, it } from "@jest/globals";
import { extractTextFromSlideXml } from "../ai/utils/pptxTextExtractor.js";
import {
  buildListCards,
  buildListQuestions,
  listQuestionIsGrounded,
  parseListGroups,
} from "./list-items.js";
import { buildFlashcardsFromFacts, buildQuizFromFacts, questionIsGrounded } from "./study-items.js";
import { extractFacts } from "./fact-extractor.js";

// Text of the team's "Cloud computing.pptx" as the extractor now returns it.
const SLIDES = `# điện toán đám mây
Slide 1:
Cloud computing

Slide 3:
What is Cloud computing
- Store, manage, and access data online

Slide 4:
Advatanges
Back-up and restore data
Improved collaboration
Excellent accessibility
Low maintenance cost
Mobility

Slide 5:
Disadvatanges
Internet Connectivity
Vendor lock-in
Limited Control
Security

Slide 7:
What are they?
IaaS
PaaS
SaaS

Slide 9:
Platform as a Service | PaaS
Programming languages
Application frameworks
Databases`;

const sequence = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe("extractTextFromSlideXml", () => {
  it("puts each paragraph on its own line", () => {
    const xml =
      "<p:sp><a:p><a:r><a:t>Advantages</a:t></a:r></a:p>" +
      "<a:p><a:r><a:t>Back-up and </a:t></a:r><a:r><a:t>restore data</a:t></a:r></a:p>" +
      "<a:p><a:r><a:t>Mobility</a:t></a:r></a:p></p:sp>";
    expect(extractTextFromSlideXml(xml)).toBe("Advantages\nBack-up and restore data\nMobility");
  });
});

describe("parseListGroups", () => {
  it("reads slide titles with their bullet items", () => {
    expect(parseListGroups(SLIDES)).toEqual([
      {
        label: "Advatanges",
        items: [
          "Back-up and restore data",
          "Improved collaboration",
          "Excellent accessibility",
          "Low maintenance cost",
          "Mobility",
        ],
      },
      { label: "Disadvatanges", items: ["Internet Connectivity", "Vendor lock-in", "Limited Control", "Security"] },
      {
        label: "Platform as a Service | PaaS",
        items: ["Programming languages", "Application frameworks", "Databases"],
      },
    ]);
  });

  it("reads a markdown heading followed by a bullet list", () => {
    const note = "## Ưu điểm\n\n- Rẻ\n- Nhanh\n- Dễ mở rộng\n\n## Nhược điểm\n- Phụ thuộc mạng\n- Khó kiểm soát\n- Bảo mật";
    expect(parseListGroups(note).map((group) => group.label)).toEqual(["Ưu điểm", "Nhược điểm"]);
  });

  it("ignores prose paragraphs and course outlines", () => {
    expect(parseListGroups("Kế thừa (Inheritance) cho phép một lớp con dùng lại thuộc tính và phương thức của lớp cha trong chương trình lớn.\nĐây là một câu dài nữa để thử.\nVà thêm một câu dài khác nữa.")).toEqual([]);
  });
});

describe("buildListQuestions", () => {
  const questions = buildListQuestions([SLIDES], { random: sequence([0.1, 0.5, 0.8]) });

  it("asks which item belongs to a group, with items of other groups as distractors", () => {
    expect(questions).toHaveLength(12);
    const question = questions.find((item) => item.question.includes("Disadvatanges"));
    expect(question.question).toBe('Which of these is listed under "Disadvatanges"?');
    const right = question.options[question.correctIndex];
    expect(["Internet Connectivity", "Vendor lock-in", "Limited Control", "Security"]).toContain(right);
    const wrong = question.options.filter((_, index) => index !== question.correctIndex);
    expect(wrong.some((option) => ["Internet Connectivity", "Vendor lock-in", "Limited Control", "Security"].includes(option))).toBe(false);
    expect(listQuestionIsGrounded(question, [SLIDES])).toBe(true);
  });

  it("rejects a question whose answer is not in the group", () => {
    const question = { ...questions[0], correctIndex: (questions[0].correctIndex + 1) % 4 };
    expect(listQuestionIsGrounded(question, [SLIDES])).toBe(false);
  });
});

describe("quiz and flashcards from slides with only titles and bullets", () => {
  const facts = extractFacts(SLIDES);

  it("builds a full quiz although the slides have almost no facts", async () => {
    expect(facts.length).toBeLessThan(4);
    const quiz = await buildQuizFromFacts(
      facts,
      { numberOfQuestions: 8, sources: [SLIDES] },
      {
        random: sequence([0.3, 0.7]),
        rewriteQuestions: async () => new Map(),
        generateReasoning: async () => [],
      },
    );
    expect(quiz.questions).toHaveLength(8);
    expect(quiz.questions.every((question) => question.kind === "list")).toBe(true);
    expect(quiz.questions.every((question) => questionIsGrounded(question, facts, { sources: [SLIDES] }))).toBe(true);
    expect(quiz.questions.some((question) => "sourceKey" in question)).toBe(false);
  });

  it("makes one flashcard per list", async () => {
    expect(buildListCards([SLIDES])[1]).toEqual({
      front: 'What is listed under "Disadvatanges"?',
      back: "Internet Connectivity, Vendor lock-in, Limited Control, Security",
    });
    const cards = await buildFlashcardsFromFacts(
      facts,
      { numberOfCards: 5, sources: [SLIDES] },
      { rewriteFronts: async () => new Map() },
    );
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});

describe("fixes from the Pervasive Computing slides", () => {
  it("joins a word split across runs without adding a space", () => {
    const xml = "<a:p><a:r><a:t>M</a:t></a:r><a:r><a:t>ultiple computers work together</a:t></a:r></a:p>";
    expect(extractTextFromSlideXml(xml)).toBe("Multiple computers work together");
  });

  it("does not turn a question line into a fact or a term", () => {
    const facts = extractFacts("What is Pervasive Computing?\nAlias: ubiquitous computing everywhere");
    expect(facts.map((fact) => fact.term)).toEqual(["Alias"]);
    expect(facts.some((fact) => /What is/.test(fact.sentence))).toBe(false);
  });
});
