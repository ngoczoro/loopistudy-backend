import { describe, expect, it } from "@jest/globals";
import { extractFacts } from "./fact-extractor.js";
import {
  buildFlashcardsFromFacts,
  buildQuizFromFacts,
  labelForFact,
  questionsFromModelJson,
  questionIsGrounded,
  wordingFromModels,
} from "./study-items.js";

const NOTE = `# Databases

Foreign key: a key that points at a row in another table.
Primary key: a key that identifies one row in a table.
Index: a structure that speeds up lookups.
Transaction: a group of changes that commit or roll back together.

Normalization is the process of structuring a database to reduce redundancy.
`;

describe("extractFacts", () => {
  it("reads terms, definitions, and a later sentence", () => {
    const facts = extractFacts(NOTE);
    expect(facts.map((fact) => fact.term)).toEqual([
      "Foreign key",
      "Primary key",
      "Index",
      "Transaction",
      "Normalization",
    ]);
    expect(facts[0].definition).toBe("a key that points at a row in another table.");
    expect(facts[0].heading).toBe("Databases");
    expect(facts[0].sentence).toContain("Foreign key:");
  });
});

describe("buildQuizFromFacts", () => {
  it("keeps only questions whose answers are other facts from the note", async () => {
    const facts = extractFacts(NOTE);
    // Hard puts these definition questions (related distractors) first; on "mixed" a cloze on
    // the same note line can take the line first, since each line is asked about once.
    const quiz = await buildQuizFromFacts(
      facts,
      { numberOfQuestions: 4, difficulty: "hard", title: "Databases" },
      {
        random: () => 0,
        rewriteQuestions: async (targets) =>
          new Map(
            targets.map((item) => [
              item.fact.id,
              `Why does a schema need ${item.fact.term || "this idea"}?`,
            ]),
          ),
      },
    );

    expect(quiz.questions).toHaveLength(4);
    expect(quiz.questions.every((question) => questionIsGrounded(question, facts))).toBe(true);
    expect(quiz.questions[0].kind).toBe("definition");
    expect(quiz.questions[0].question).toContain("Why does a schema need");
    expect(quiz.model).toContain("ollama:");
  });

  it("uses a template stem when local wording is unavailable", async () => {
    const facts = extractFacts(NOTE);
    // All facts share one section, so definition distractors are related: a hard question.
    const quiz = await buildQuizFromFacts(
      facts,
      { numberOfQuestions: 2, difficulty: "hard", title: "Databases" },
      {
        random: () => 0,
        rewriteQuestions: async () => {
          throw new Error("down");
        },
      },
    );

    expect(quiz.model).toBe("study-facts");
    expect(quiz.questions[0].kind).toBe("definition");
    expect(quiz.questions[0].difficulty).toBe("hard");
    expect(quiz.questions[0].question).toMatch(/Which statement is the right account of/);
    expect(quiz.questions.every((question) => questionIsGrounded(question, facts))).toBe(true);
  });

  it("records OpenAI when that model wrote a kept question", async () => {
    const facts = extractFacts(NOTE);
    const rewritten = new Map(facts.map((fact) => [fact.id, `What is ${fact.term}?`]));
    rewritten.wordingProvider = "openai";
    rewritten.wordingModel = "gpt-4.1-mini";

    const quiz = await buildQuizFromFacts(
      facts,
      { numberOfQuestions: 2, difficulty: "hard", title: "Databases" },
      { random: () => 0, rewriteQuestions: async () => rewritten },
    );

    expect(quiz.model).toBe("openai:gpt-4.1-mini");
  });
});

describe("buildFlashcardsFromFacts", () => {
  it("lets the model write the front and keeps the back on the fact", async () => {
    const facts = extractFacts(NOTE);
    const cards = await buildFlashcardsFromFacts(
      facts,
      { numberOfCards: 2 },
      {
        rewriteFronts: async () =>
          new Map([
            ["f1", "When would you use a foreign key?"],
            ["f2", "What identifies one row?"],
          ]),
      },
    );

    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("When would you use a foreign key?");
    expect(cards[0].back).toBe(facts[0].definition);
  });

  it("drops a front that already contains the answer", async () => {
    const facts = extractFacts(NOTE);
    const cards = await buildFlashcardsFromFacts(
      facts,
      { numberOfCards: 1 },
      {
        rewriteFronts: async () =>
          new Map([["f1", `Explain: ${facts[0].definition}`]]),
      },
    );

    expect(cards[0].front).toBe("What is Foreign key?");
    expect(cards[0].back).toBe(facts[0].definition);
  });
});

describe("wordingFromModels", () => {
  const targetsFor = (facts) =>
    facts.slice(0, 1).map((fact) => ({ fact, label: fact.term }));

  it("keeps Ollama wording when the local model answers", async () => {
    const facts = extractFacts(NOTE);
    let openaiCalled = false;
    const map = await wordingFromModels({
      targets: targetsFor(facts),
      askOllama: async () => ({ questions: [`What is ${facts[0].term}?`] }),
      askOpenAI: async () => {
        openaiCalled = true;
        return { questions: ["unused"] };
      },
    });

    expect(openaiCalled).toBe(false);
    expect(map.wordingProvider).toBe("ollama");
    expect(map.get(facts[0].id)).toBe(`What is ${facts[0].term}?`);
  });

  it("asks OpenAI when Ollama throws", async () => {
    const facts = extractFacts(NOTE);
    const map = await wordingFromModels({
      targets: targetsFor(facts),
      askOllama: async () => {
        throw new Error("down");
      },
      askOpenAI: async () => ({ questions: [`What is ${facts[0].term}?`] }),
    });

    expect(map.wordingProvider).toBe("openai");
    expect(map.get(facts[0].id)).toBe(`What is ${facts[0].term}?`);
  });
});

describe("questionsFromModelJson", () => {
  it("keeps questions that arrive in order without a fact id", () => {
    const facts = extractFacts(NOTE);
    const targets = facts.slice(0, 2).map((fact) => ({ fact }));
    const map = questionsFromModelJson(
      { questions: ["When would you use a foreign key?", "What makes a primary key unique?"] },
      targets,
    );

    expect(map.get("f1")).toBe("When would you use a foreign key?");
    expect(map.get("f2")).toBe("What makes a primary key unique?");
  });

  it("matches a question to the fact it names even when the model reorders them", () => {
    const facts = extractFacts(NOTE);
    const targets = facts.slice(0, 2).map((fact) => ({ fact }));
    const map = questionsFromModelJson(
      { questions: ["What makes a primary key unique?", "When would you use a foreign key?"] },
      targets,
    );

    expect(map.get("f1")).toBe("When would you use a foreign key?");
    expect(map.get("f2")).toBe("What makes a primary key unique?");
  });

  it("drops a list number the model copied onto the question", () => {
    const facts = extractFacts(NOTE);
    const map = questionsFromModelJson(
      { questions: ["2. When would you use a foreign key?"] },
      [{ fact: facts[0] }],
    );

    expect(map.get("f1")).toBe("When would you use a foreign key?");
  });
});

describe("repeated Vietnamese labels", () => {
  it("adds the section name when the same term appears twice", async () => {
    const facts = extractFacts(`# Đóng gói
Lợi ích: Bảo vệ dữ liệu không bị sửa từ bên ngoài.
# Kế thừa
Lợi ích: Tránh viết lại code đã có ở lớp cha.
Cách triển khai: Dùng từ khóa extends cho lớp con.
Nhược điểm: Cây kế thừa quá sâu sẽ khó đọc.`);
    const counts = new Map([["lợi ích", 2]]);
    expect(labelForFact(facts[0], counts)).toBe("Lợi ích — Đóng gói");

    const quiz = await buildQuizFromFacts(
      facts,
      { numberOfQuestions: 4, difficulty: "easy", title: "OOP" },
      { rewriteQuestions: async () => new Map(), random: () => 0 },
    );

    expect(quiz.questions.some((question) => /Lợi ích của Đóng gói/.test(question.question))).toBe(true);
    expect(quiz.questions.every((question) => questionIsGrounded(question, facts))).toBe(true);
  });
});
