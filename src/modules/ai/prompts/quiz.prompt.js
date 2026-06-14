export const QUIZ_PROMPT_VERSION = "2.0.0";

import { getQuestionDifficultyDistribution } from "../utils/quizDifficulty.js";

const QUESTION_DESIGN = {
  easy: "Nhận biết định nghĩa, thuật ngữ, sự kiện trực tiếp.",
  medium: "So sánh khái niệm, giải thích mối quan hệ, áp dụng kiến thức.",
  hard: "Phân tích, suy luận, kết hợp nhiều khái niệm.",
};

const formatDistribution = (numberOfQuestions, difficultyMode) => {
  const distribution = getQuestionDifficultyDistribution(
    numberOfQuestions,
    difficultyMode,
  );
  const counts = distribution.reduce(
    (acc, level) => {
      acc[level] = (acc[level] ?? 0) + 1;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0 },
  );

  const lines = distribution.map(
    (level, index) => `  Câu ${index + 1}: ${level}`,
  );

  return {
    distribution,
    text: [
      `Chế độ độ khó: ${difficultyMode}`,
      `Tổng số câu BẮT BUỘC: ${numberOfQuestions} (${counts.easy} easy, ${counts.medium} medium, ${counts.hard} hard)`,
      "Phân bổ độ khó theo từng câu:",
      ...lines,
    ].join("\n"),
  };
};

const formatAvoidQuestions = (questions = []) => {
  if (!questions.length) {
    return "Không có câu hỏi trước đó cần tránh.";
  }

  return questions
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");
};

const formatSummaryContext = (summaryContext) => {
  if (!summaryContext?.summary) {
    return "";
  }

  const parts = [
    "TÓM TẮT AI CỦA TÀI LIỆU (ưu tiên các khái niệm trong phần này):",
    summaryContext.summary,
  ];

  if (Array.isArray(summaryContext.keyPoints) && summaryContext.keyPoints.length) {
    parts.push(`Điểm chính: ${summaryContext.keyPoints.join("; ")}`);
  }

  if (
    Array.isArray(summaryContext.learningNotes) &&
    summaryContext.learningNotes.length
  ) {
    parts.push(`Ghi chú học tập: ${summaryContext.learningNotes.join("; ")}`);
  }

  return parts.join("\n");
};

const baseOutputRules = (numberOfQuestions) => `
YÊU CẦU ĐẦU RA:
- Trả về ONLY valid JSON, không markdown, không giải thích thêm.
- Ngôn ngữ: Tiếng Việt.
- Chỉ multiple choice, mỗi câu đúng 4 options.
- correctAnswer: "A" | "B" | "C" | "D".
- Mỗi câu phải có explanation và sourceTopic.
- Mỗi câu phải có difficulty là "easy" | "medium" | "hard" (KHÔNG dùng "mixed").
- Phải tạo ĐÚNG ${numberOfQuestions} câu hỏi nếu đủ nội dung.
- Không trùng lặp câu hỏi trong cùng bài quiz.

JSON shape:
{
  "title": "string",
  "description": "string",
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "A",
      "explanation": "string",
      "difficulty": "easy",
      "sourceTopic": "string"
    }
  ]
}`;

export const buildDocumentQuizPrompt = ({
  documentTitle = "",
  documentText = "",
  summaryContext = null,
  subjectName = "",
  numberOfQuestions = 5,
  difficulty = "mixed",
  variationSeed = "",
  avoidQuestions = [],
} = {}) => {
  const { text: distributionText } = formatDistribution(
    numberOfQuestions,
    difficulty,
  );

  const instructions = `You are generating a quiz from a student document.

You MUST use only the information contained in the provided document and its AI summary.

Never use outside knowledge.

If the document does not contain enough information, generate fewer questions rather than inventing facts.

All questions must be directly supported by the uploaded document.

---

Bạn là giáo viên trợ giảng AI tạo quiz trắc nghiệm từ tài liệu học tập.

QUY TẮC GROUNDING (BẮT BUỘC):
1. CHỈ dùng thông tin trong văn bản tài liệu và tóm tắt AI đính kèm.
2. KHÔNG dùng kiến thức bên ngoài tài liệu.
3. KHÔNG hỏi về chủ đề không xuất hiện trong tài liệu.
4. Mỗi câu phải truy vết được về tài liệu.

Variation seed: ${variationSeed}

Use this seed to vary:
- question selection
- wording
- distractors
- option order

Do not repeat the same quiz.

Tránh tạo câu hỏi giống hoặc gần giống các câu sau:
${formatAvoidQuestions(avoidQuestions)}

${distributionText}

THIẾT KẾ THEO ĐỘ KHÓ:
- EASY: ${QUESTION_DESIGN.easy}
- MEDIUM: ${QUESTION_DESIGN.medium}
- HARD: ${QUESTION_DESIGN.hard}

${baseOutputRules(numberOfQuestions)}`;

  const contextLines = [
    documentTitle ? `Tiêu đề tài liệu: ${documentTitle}` : null,
    subjectName ? `Môn học: ${subjectName}` : null,
    `Số câu hỏi: ${numberOfQuestions}`,
    `Chế độ độ khó: ${difficulty}`,
    `Variation seed: ${variationSeed}`,
  ].filter(Boolean);

  const summaryBlock = formatSummaryContext(summaryContext);
  const inputParts = [
    contextLines.join("\n"),
    summaryBlock,
    documentText ? `Nội dung tài liệu:\n${documentText}` : null,
  ].filter(Boolean);

  return {
    feature: "quiz-document",
    version: QUIZ_PROMPT_VERSION,
    instructions,
    input: inputParts.join("\n\n"),
  };
};

export const buildSubjectQuizPrompt = ({
  subjectName = "",
  topic = "",
  numberOfQuestions = 5,
  difficulty = "mixed",
  variationSeed = "",
  avoidQuestions = [],
} = {}) => {
  const practiceTopic = String(topic || subjectName || "General").trim();
  const { text: distributionText } = formatDistribution(
    numberOfQuestions,
    difficulty,
  );

  const instructions = `You are generating a subject-focused practice quiz for a student.

This is NOT a document quiz. You may use general academic knowledge relevant to the selected subject.

The quiz MUST remain strictly relevant to the subject "${subjectName}".

DO NOT generate questions from unrelated subjects (Math, Chemistry, Physics, etc.) when the subject is "${subjectName}".

Variation means different questions within the SAME subject — not switching subjects.

Variation seed: ${variationSeed}

Use this seed to vary:
- question selection
- wording
- distractors
- option order

Do not repeat the same quiz.

Tránh tạo câu hỏi giống hoặc gần giống các câu sau:
${formatAvoidQuestions(avoidQuestions)}

${distributionText}

QUY TẮC QUICK QUIZ / SUBJECT PRACTICE:
1. Môn học chính: ${subjectName}
2. Chủ đề luyện tập: ${practiceTopic}
3. Câu hỏi phải liên quan trực tiếp đến môn học đã chọn.
4. Có thể dùng kiến thức học thuật phổ biến phù hợp với môn.
5. Không bịa câu hỏi vô nghĩa hoặc lệch môn học.
6. Mỗi lần tạo phải khác biệt so với các lần trước.

THIẾT KẾ THEO ĐỘ KHÓ:
- EASY: ${QUESTION_DESIGN.easy}
- MEDIUM: ${QUESTION_DESIGN.medium}
- HARD: ${QUESTION_DESIGN.hard}

${baseOutputRules(numberOfQuestions)}`;

  const input = [
    `Môn học: ${subjectName}`,
    `Chủ đề luyện tập: ${practiceTopic}`,
    `Số câu hỏi: ${numberOfQuestions}`,
    `Chế độ độ khó: ${difficulty}`,
    `Variation seed: ${variationSeed}`,
  ].join("\n");

  return {
    feature: "quiz-subject",
    version: QUIZ_PROMPT_VERSION,
    instructions,
    input,
  };
};

/** @deprecated Use buildDocumentQuizPrompt */
export const buildQuizPrompt = buildDocumentQuizPrompt;

export { getQuestionDifficultyDistribution };
