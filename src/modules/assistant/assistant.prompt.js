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

/** True when the model refused instead of answering from provided passages. */
export const looksLikeNotFoundRefusal = (text) => {
  const folded = String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
  if (!folded.trim()) return true;
  const patterns = [
    /khong tim thay/,
    /khong co trong tai lieu/,
    /khong du de tra loi/,
    /tai lieu da chon/,
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
    .trim();
};
