import { describe, expect, it } from "@jest/globals";
import { extractFacts } from "./fact-extractor.js";
import { buildQuizFromFacts } from "./study-items.js";

// Prose terms (cloze = medium, statement = hard) plus two bullet lists (list = easy).
const NOTE = `# Lập trình hướng đối tượng

Kế thừa (Inheritance) cho phép một lớp con dùng lại thuộc tính và phương thức của lớp cha.

Đóng gói (Encapsulation) che giấu dữ liệu bên trong đối tượng và chỉ mở các phương thức công khai.

Đa hình (Polymorphism) giúp một phương thức hoạt động theo nhiều cách tùy đối tượng gọi nó.

Trừu tượng (Abstraction) ẩn chi tiết cài đặt và chỉ đưa ra chức năng cần thiết.

Ưu điểm
- Dễ bảo trì
- Tái sử dụng mã
- Dễ mở rộng

Nhược điểm
- Khó học lúc đầu
- Chương trình lớn hơn
- Chạy chậm hơn đôi chút`;

const facts = extractFacts(NOTE);
const sequence = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};
const build = (difficulty, numberOfQuestions, extra = {}) =>
  buildQuizFromFacts(
    facts,
    { numberOfQuestions, difficulty, sources: extra.sources ?? [NOTE] },
    {
      random: sequence([0.2, 0.6, 0.9]),
      rewriteQuestions: async () => new Map(),
      generateReasoning: extra.generateReasoning ?? (async () => []),
    },
  );

describe("quiz difficulty", () => {
  it("easy: list questions first, and no model call for 'why' questions", async () => {
    let asked = false;
    const quiz = await build("easy", 4, {
      generateReasoning: async () => {
        asked = true;
        return [];
      },
    });
    expect(asked).toBe(false);
    expect(quiz.questions.map((question) => question.difficulty)).toEqual(["easy", "easy", "easy", "easy"]);
    expect(quiz.questions.every((question) => question.kind === "list")).toBe(true);
  });

  it("hard: statement questions first", async () => {
    const quiz = await build("hard", 3);
    expect(quiz.questions.every((question) => question.difficulty === "hard")).toBe(true);
    expect(quiz.questions.every((question) => question.kind === "statement")).toBe(true);
  });

  it("mixed: alternates easy, medium and hard", async () => {
    const quiz = await build("mixed", 6);
    expect(quiz.questions.map((question) => question.difficulty)).toEqual([
      "easy",
      "medium",
      "hard",
      "easy",
      "medium",
      "hard",
    ]);
  });

  it("tops up from the nearest level and keeps the real label", async () => {
    // Without the bullet lists there is no easy question: an easy quiz falls back to cloze.
    const quiz = await build("easy", 2, { sources: [] });
    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions.every((question) => question.kind === "cloze")).toBe(true);
    expect(quiz.questions.every((question) => question.difficulty === "medium")).toBe(true);
  });

  it("medium skips 'why' questions when its own and easy questions are enough", async () => {
    let asked = false;
    const quiz = await build("medium", 3, {
      generateReasoning: async () => {
        asked = true;
        return [];
      },
    });
    expect(asked).toBe(false);
    expect(quiz.questions).toHaveLength(3);
  });

  it("medium asks for 'why' questions when easier ones run short", async () => {
    let asked = false;
    // Without the bullet lists: 4 cloze (medium) only, fewer than the 8 asked for.
    await build("medium", 8, {
      sources: [],
      generateReasoning: async () => {
        asked = true;
        return [];
      },
    });
    expect(asked).toBe(true);
  });

  it("asks for 'why' questions on hard and mixed quizzes", async () => {
    for (const difficulty of ["hard", "mixed"]) {
      let asked = false;
      await build(difficulty, 3, {
        generateReasoning: async () => {
          asked = true;
          return [];
        },
      });
      expect(asked).toBe(true);
    }
  });
});

describe("generation progress", () => {
  it("reports prepared questions, then each model attempt", async () => {
    const events = [];
    await buildQuizFromFacts(
      facts,
      { numberOfQuestions: 5, difficulty: "hard", sources: [NOTE] },
      {
        random: sequence([0.2, 0.6, 0.9]),
        rewriteQuestions: async () => new Map(),
        onProgress: (event) => events.push(event),
        generateReasoning: async ({ onAttempt }) => {
          onAttempt({ made: 0, limit: 2 });
          onAttempt({ made: 0, limit: 2 });
          return [];
        },
      },
    );
    // Two of the five slots wait for the model, so code reports 3/5 and the count rises from there.
    expect(events[0]).toEqual({ stage: "prepared", ready: 3, total: 5 });
    expect(events.slice(1)).toEqual([
      { stage: "ai", current: 1, limit: 2, ready: 3, total: 5 },
      { stage: "ai", current: 1, limit: 2, ready: 3, total: 5 },
    ]);
  });
});
