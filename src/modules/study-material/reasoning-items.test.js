import { describe, expect, it } from "@jest/globals";
import {
  buildReasoningPrompt,
  buildReasoningQuestions,
  checkReasoningAnswer,
  paragraphUnits,
  quoteFromPassage,
  reasoningQuestionIsGrounded,
  reasoningTypeFor,
} from "./reasoning-items.js";
import {
  buildFlashcardDeck,
  buildFlashcardsFromFacts,
  buildQuizFromFacts,
  questionIsGrounded,
} from "./study-items.js";
import { extractFacts } from "./fact-extractor.js";

const NOTE = `# Lập trình hướng đối tượng

Đóng gói (Encapsulation) là cơ chế che giấu dữ liệu bên trong đối tượng và chỉ cho phép truy cập thông qua các phương thức công khai. Nhờ đó dữ liệu không bị thay đổi ngoài ý muốn và chương trình an toàn hơn.

Nếu một lớp con ghi đè phương thức của lớp cha, lời gọi phương thức sẽ chạy phiên bản của lớp con. Đây là cách Java hỗ trợ đa hình khi chương trình chạy.

Slide 4:
Ngắn quá`;

const PARAGRAPH =
  "Đóng gói (Encapsulation) là cơ chế che giấu dữ liệu bên trong đối tượng và chỉ cho phép truy cập thông qua các phương thức công khai. Nhờ đó dữ liệu không bị thay đổi ngoài ý muốn và chương trình an toàn hơn.";

const goodAnswer = {
  question: "Vì sao đóng gói giúp chương trình an toàn hơn?",
  options: [
    "Vì dữ liệu không bị thay đổi ngoài ý muốn",
    "Vì mọi lớp đều sửa trực tiếp dữ liệu",
    "Vì chương trình chạy nhanh hơn",
    "Vì lớp con thay thế lớp cha",
  ],
  correctIndex: 0,
  evidence: "Nhờ đó dữ liệu không bị thay đổi ngoài ý muốn và chương trình an toàn hơn.",
};

describe("paragraphUnits", () => {
  it("keeps prose paragraphs and drops short lines and slide markers", () => {
    const units = paragraphUnits([NOTE]);
    expect(units).toHaveLength(2);
    expect(units[0]).toBe(PARAGRAPH);
  });
});

describe("reasoningTypeFor", () => {
  it("reads the cue words of the paragraph", () => {
    expect(reasoningTypeFor(PARAGRAPH)).toBe("why"); // "Nhờ đó"
    expect(reasoningTypeFor("Nếu mất mạng, người dùng không mở được dữ liệu.")).toBe("condition");
    expect(reasoningTypeFor("IaaS cung cấp hạ tầng, trong khi PaaS cung cấp nền tảng.")).toBe("compare");
    expect(reasoningTypeFor("Ví dụ, lớp Person có tên và tuổi.")).toBe(null);
  });

  it("does not read 'khác nhau' (various) as a comparison", () => {
    expect(
      reasoningTypeFor("Đa hình là khả năng một phương thức hoạt động theo nhiều cách khác nhau tùy đối tượng."),
    ).toBe(null);
  });

  it("puts the matching example in the prompt", () => {
    expect(buildReasoningPrompt("compare", "x")).toContain("IaaS khác PaaS");
  });
});

describe("checkReasoningAnswer", () => {
  it("accepts an answer backed by a sentence quoted from the paragraph", () => {
    expect(checkReasoningAnswer(goodAnswer, PARAGRAPH)).toEqual({
      question: goodAnswer.question,
      options: goodAnswer.options,
      correctIndex: 0,
      evidence: goodAnswer.evidence,
    });
  });

  it("swaps a lightly reworded quote for the paragraph's own sentence", () => {
    const passage =
      "Ví dụ, lớp Student có thể bao gồm mã sinh viên, họ tên và tuổi. Từ lớp Student, chúng ta có thể tạo ra nhiều đối tượng sinh viên khác nhau.";
    expect(quoteFromPassage("Lớp Student có thể tạo ra nhiều đối tượng sinh viên khác nhau.", passage)).toBe(
      "Từ lớp Student, chúng ta có thể tạo ra nhiều đối tượng sinh viên khác nhau.",
    );
  });

  it("backs a partial quote with the whole paragraph sentence", () => {
    const passage =
      'Java được thiết kế với mục tiêu "Write Once, Run Anywhere", cho phép chương trình chạy trên nhiều nền tảng thông qua JVM.';
    expect(quoteFromPassage("Java được thiết kế với mục tiêu 'Write Once, Run Anywhere'", passage)).toBe(passage);
  });

  it("does not let a negated wrong option outscore the right one", () => {
    const passage =
      "Kế thừa (Inheritance) cho phép một lớp con kế thừa các thuộc tính và phương thức từ lớp cha. Điều này giúp giảm việc lặp lại mã nguồn.";
    const answer = {
      question: "Vì sao kế thừa giúp giảm việc lặp lại mã nguồn?",
      options: [
        "Vì lớp con dùng lại các thuộc tính và phương thức từ lớp cha",
        "Vì lớp con không thể dùng các thuộc tính và phương thức từ lớp cha",
        "Vì lớp con chỉ kế thừa từ một lớp cha duy nhất",
        "Vì chương trình chạy nhanh hơn",
      ],
      correctIndex: 0,
      evidence: "Kế thừa (Inheritance) cho phép một lớp con kế thừa các thuộc tính và phương thức từ lớp cha.",
    };
    expect(checkReasoningAnswer(answer, passage)).not.toBeNull();
  });

  it("rejects a question about something the paragraph never mentions", () => {
    const passage =
      "Lập trình hướng đối tượng là phương pháp tổ chức chương trình dựa trên các đối tượng (Object). Mỗi đối tượng bao gồm dữ liệu và các phương thức xử lý dữ liệu đó.";
    const answer = {
      question: "Lập trình hướng đối tượng khác lập trình thủ tục ở điểm nào?",
      options: [
        "Lập trình hướng đối tượng dựa trên các đối tượng, còn lập trình thủ tục dựa trên các hàm",
        "Lập trình hướng đối tượng không dùng dữ liệu",
        "Lập trình thủ tục dựa trên các đối tượng",
        "Hai cách giống hệt nhau",
      ],
      correctIndex: 0,
      evidence: "Lập trình hướng đối tượng là phương pháp tổ chức chương trình dựa trên các đối tượng (Object).",
    };
    expect(checkReasoningAnswer(answer, passage)).toBeNull();
  });

  it("rejects evidence the paragraph does not contain", () => {
    expect(
      checkReasoningAnswer({ ...goodAnswer, evidence: "Đóng gói giúp chương trình chạy nhanh gấp đôi." }, PARAGRAPH),
    ).toBeNull();
  });

  it("rejects a 'right' option the evidence does not support better than a wrong one", () => {
    expect(checkReasoningAnswer({ ...goodAnswer, correctIndex: 2 }, PARAGRAPH)).toBeNull();
  });

  it("rejects duplicate options and missing fields", () => {
    expect(checkReasoningAnswer({ ...goodAnswer, options: ["a", "a", "b", "c"] }, PARAGRAPH)).toBeNull();
    expect(checkReasoningAnswer({ question: "Vì sao?" }, PARAGRAPH)).toBeNull();
  });
});

describe("buildReasoningQuestions", () => {
  it("asks the model once per useful paragraph and keeps only checked answers", async () => {
    const calls = [];
    const questions = await buildReasoningQuestions({
      sources: [NOTE],
      limit: 2,
      ask: async (type, passage) => {
        calls.push(type);
        return passage === PARAGRAPH
          ? { json: goodAnswer, provider: "ollama", model: "qwen2.5:3b" }
          : { json: { ...goodAnswer, evidence: "Không có trong đoạn này đâu nhé bạn." }, provider: "ollama", model: "qwen2.5:3b" };
      },
    });
    expect(calls).toEqual(["why", "condition"]);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ kind: "reasoning", reasoningType: "why", provider: "ollama" });
    expect(reasoningQuestionIsGrounded(questions[0], [NOTE])).toBe(true);
  });

  it("stops at the time budget", async () => {
    let clock = 0;
    const questions = await buildReasoningQuestions({
      sources: [NOTE],
      limit: 5,
      now: () => (clock += 100_000),
      ask: async () => ({ json: goodAnswer, provider: "ollama", model: "m" }),
    });
    expect(questions).toEqual([]);
  });

  it("skips a paragraph when the model call fails", async () => {
    const questions = await buildReasoningQuestions({
      sources: [NOTE],
      ask: async () => {
        throw new Error("Ollama timed out");
      },
    });
    expect(questions).toEqual([]);
  });
});

describe("quiz with a reasoning question", () => {
  it("puts it first, labels the quiz with its model and skips the rewording call", async () => {
    const facts = extractFacts(NOTE);
    let reworded = false;
    const quiz = await buildQuizFromFacts(
      facts,
      { numberOfQuestions: 4, sources: [NOTE] },
      {
        rewriteQuestions: async () => {
          reworded = true;
          return new Map();
        },
        generateReasoning: async () => [
          {
            kind: "reasoning",
            question: goodAnswer.question,
            options: goodAnswer.options,
            correctIndex: 0,
            correctAnswer: "A",
            explanation: goodAnswer.evidence,
            sourceTopic: "why",
            difficulty: "hard",
            sourceKey: "reasoning|x",
            provider: "ollama",
            model: "qwen2.5:3b",
          },
        ],
      },
    );
    expect(quiz.questions[0].kind).toBe("reasoning");
    expect(quiz.questions[0]).not.toHaveProperty("provider");
    expect(quiz.model).toBe("ollama:qwen2.5:3b");
    expect(reworded).toBe(false);
    expect(questionIsGrounded(quiz.questions[0], facts, { sources: [NOTE] })).toBe(true);
  });
});

describe("flashcards with a reasoning card", () => {
  const reasoningQuestion = {
    kind: "reasoning",
    question: goodAnswer.question,
    options: goodAnswer.options,
    correctIndex: 0,
    correctAnswer: "A",
    explanation: goodAnswer.evidence,
    sourceTopic: "why",
    difficulty: "hard",
    sourceKey: "reasoning|x",
    provider: "ollama",
    model: "qwen2.5:3b",
  };

  it("puts the reasoning card first with the answer and its quote on the back", async () => {
    const facts = extractFacts(NOTE);
    let reworded = false;
    const cards = await buildFlashcardsFromFacts(
      facts,
      { numberOfCards: 3, sources: [NOTE] },
      {
        rewriteFronts: async () => {
          reworded = true;
          return new Map();
        },
        generateReasoning: async () => [reasoningQuestion],
      },
    );
    expect(cards[0]).toEqual({
      front: "Vì sao đóng gói giúp chương trình an toàn hơn?",
      back: 'Vì dữ liệu không bị thay đổi ngoài ý muốn (Ghi chú: "Nhờ đó dữ liệu không bị thay đổi ngoài ý muốn và chương trình an toàn hơn.")',
    });
    expect(reworded).toBe(false);
  });

  it("drops a reasoning card whose quote is not in the notes", async () => {
    const cards = await buildFlashcardsFromFacts(
      extractFacts(NOTE),
      { numberOfCards: 3, sources: [NOTE] },
      {
        rewriteFronts: async () => new Map(),
        generateReasoning: async () => [{ ...reasoningQuestion, explanation: "Câu này không có trong ghi chú của bạn." }],
      },
    );
    expect(cards.some((card) => card.front === reasoningQuestion.question)).toBe(false);
  });
});

describe("flashcard deck model", () => {
  const facts = extractFacts(NOTE);
  const reasoningCard = {
    kind: "reasoning",
    question: goodAnswer.question,
    options: goodAnswer.options,
    correctIndex: 0,
    explanation: goodAnswer.evidence,
    provider: "ollama",
    model: "qwen2.5:3b",
  };

  it("names the model that wrote a card in the deck", async () => {
    const deck = await buildFlashcardDeck(
      facts,
      { numberOfCards: 3, sources: [NOTE] },
      { rewriteFronts: async () => new Map(), generateReasoning: async () => [reasoningCard] },
    );
    expect(deck.model).toBe("ollama:qwen2.5:3b");
    expect(deck.cards.some((card) => "via" in card)).toBe(false);
  });

  it("names OpenAI when it reworded a kept front", async () => {
    const DB_NOTE = "Foreign key: a key that points at a row in another table.\nPrimary key: a key that identifies one row in a table.";
    const dbFacts = extractFacts(DB_NOTE);
    const fronts = new Map([["f1", "When would you use a Foreign key?"]]);
    fronts.wordingProvider = "openai";
    fronts.wordingModel = "gpt-4.1-mini";
    const deck = await buildFlashcardDeck(
      dbFacts,
      { numberOfCards: 2 },
      { rewriteFronts: async () => fronts, generateReasoning: async () => [] },
    );
    expect(deck.cards[0].front).toBe("When would you use a Foreign key?");
    expect(deck.model).toBe("openai:gpt-4.1-mini");
  });

  it("says study-facts when no model wrote any card", async () => {
    const deck = await buildFlashcardDeck(
      facts,
      { numberOfCards: 3, sources: [NOTE] },
      { rewriteFronts: async () => new Map(), generateReasoning: async () => [] },
    );
    expect(deck.model).toBe("study-facts");
  });
});
