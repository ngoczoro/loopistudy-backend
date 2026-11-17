/**
 * Build prompts so the model only answers from retrieved passages and cites [n].
 */

export const buildRagSystemPrompt = () =>
  [
    "Bạn là trợ lý học tập của Loopi Study.",
    "Chỉ trả lời dựa trên các đoạn tài liệu được cung cấp bên dưới.",
    "Không bịa thêm kiến thức ngoài tài liệu.",
    "Khi dùng ý từ đoạn n, chèn marker dạng số nguyên ngay sau câu đó, ví dụ [1] hoặc [2].",
    "Chỉ dùng các số [n] có trong danh sách đoạn. Không bịa số nguồn.",
    "Không bao giờ viết [User], [Assistant], [Học viên], [Trợ lý] hay bất kỳ nhãn nào khác trong ngoặc vuông.",
    "Trả lời ngắn gọn, rõ ràng, ưu tiên tiếng Việt trừ khi câu hỏi bằng tiếng Anh.",
    "Có thể dùng gạch đầu dòng (- ) và **in đậm** khi cần.",
    "Nếu tiêu đề hoặc nội dung đoạn rõ ràng khớp chủ đề câu hỏi (kể cả câu hỏi tiếng Việt / đoạn tiếng Anh), hãy trả lời từ đoạn đó.",
    "Chỉ khi mọi đoạn đều lạc đề hoàn toàn mới nói ngắn: không có trong tài liệu đã chọn. Không nhắc người dùng đổi phạm vi hay kiểm tra index.",
  ].join(" ");

/** The answer without [n] markers: what the reader actually gets. */
export const visibleAnswerText = (text) =>
  String(text ?? "")
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Small models often prefix "Trả lời:" (copied from the prompt example). */
export const stripAnswerPrefix = (text) =>
  String(text ?? "").replace(/^\s*(?:trả lời|answer)\s*:\s*/i, "").trim();

/** Longer answers that mention "not found" usually still answer part of the question. */
const REFUSAL_MAX_CHARS = 200;

/**
 * True when the model refused instead of answering from provided passages.
 * Empty answers are not refusals; callers treat them as a failed attempt.
 */
export const looksLikeNotFoundRefusal = (text) => {
  const visible = visibleAnswerText(text);
  if (!visible || visible.length > REFUSAL_MAX_CHARS) return false;
  const folded = visible
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
  const patterns = [
    /khong tim thay/,
    /khong co trong tai lieu/,
    /khong du de tra loi/,
    /tai lieu da chon/,
    /(chua|khong) co thong tin/,
    /khong (duoc )?de cap/,
    /not (found|in (the )?documents?)/,
    /no (relevant )?information/,
    /cannot find .{0,40}(document|note|material)/,
  ];
  return patterns.some((pattern) => pattern.test(folded));
};

export const formatPassagesForPrompt = (hits = []) =>
  hits
    .map((hit) => {
      const title = hit.documentTitle || "Document";
      const location = hit.location ? ` (${hit.location})` : "";
      return `[${hit.index}] ${title}${location}\n${hit.excerpt}`;
    })
    .join("\n\n");

/*
 * Ollama (qwen2.5:3b) gets a shorter prompt with one worked example. With the full rule list it
 * often replied with only a slide number such as "[5]" (taken from "Slide 5:" in the passage),
 * which leaves nothing once out-of-range markers are sanitized.
 */
export const buildOllamaSystemPrompt = () =>
  [
    "Bạn là trợ lý học tập.",
    "Chỉ trả lời bằng thông tin có trong các đoạn tài liệu, không thêm giải thích hay kiến thức bên ngoài.",
    "Tài liệu có thể viết bằng tiếng Anh; hãy trả lời bằng tiếng Việt, giữ nguyên thuật ngữ tiếng Anh.",
    "Viết thành câu trả lời đầy đủ. Sau mỗi ý ghi số của ĐOẠN chứa ý đó, ví dụ [1]. Không dùng số slide làm số nguồn.",
    "Nếu các đoạn thật sự không có thông tin, chỉ viết: Không có trong tài liệu.",
  ].join(" ");

const OLLAMA_EXAMPLE = [
  "Ví dụ:",
  "Đoạn tài liệu:",
  "[1] Bài giảng mạng",
  "Slide 3:",
  "Benefits Fast Cheap Reliable",
  "Câu hỏi: lợi ích là gì?",
  "Trả lời: Có 3 lợi ích: nhanh (Fast), rẻ (Cheap) và đáng tin cậy (Reliable) [1].",
].join("\n");

export const buildOllamaUserPrompt = ({ question, hits }) =>
  `${OLLAMA_EXAMPLE}\n\nĐoạn tài liệu:\n${formatPassagesForPrompt(hits)}\n\nCâu hỏi: ${question}\nTrả lời:`;

export const buildRagUserPrompt = ({ question, hits }) =>
  `Đoạn tài liệu:\n${formatPassagesForPrompt(hits)}\n\n` +
  `Câu hỏi: ${question}\n\n` +
  "Hãy trả lời dựa trên các đoạn trên và trích nguồn bằng [n] (chỉ số, ví dụ [1]).";

/**
 * Keep only [n] markers that exist in citations.
 * Strip bogus markers like [Học viên], [User], [0], [99].
 */
export const sanitizeCitationMarkers = (text, citationCount) => {
  const max = Number(citationCount) || 0;
  return String(text ?? "")
    .replace(/\[([^\]]+)\]/g, (match, raw) => {
      if (!/^\d+$/.test(String(raw).trim())) return "";
      const n = Number(raw);
      return n >= 1 && n <= max ? `[${n}]` : "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/ {2,}/g, " ")
    // A stripped marker before punctuation would leave "Security ." behind.
    .replace(/ +([.,;:!?])/g, "$1")
    .trim();
};
