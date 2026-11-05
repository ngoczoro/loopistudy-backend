export const DEFAULT_CONVERSATION_TITLE = "New chat";
export const TITLE_FROM_QUESTION_MAX = 60;
export const MAX_QUESTION_LENGTH = 2000;
export const MAX_SCOPE_DOCUMENTS = 10;
export const QUESTIONS_PER_HOUR_LIMIT = 30;

export const MESSAGE_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
};

export const ANSWER_STATUS = {
  ANSWERED: "answered",
  NOT_FOUND: "not_found",
  NO_SOURCES: "no_sources",
};

export const INDEX_STATUS = {
  INDEXED: "indexed",
  INDEXING: "indexing",
  STALE: "stale",
  NOT_INDEXED: "not_indexed",
  FAILED: "failed",
  UNSUPPORTED: "unsupported",
};

export const SCOPE_TYPE = {
  ALL: "all",
  SUBJECT: "subject",
  DOCUMENTS: "documents",
};

export const NO_SOURCES_MESSAGE =
  "Tài liệu trong phạm vi này đang được chuẩn bị để hỏi đáp. Bạn thử hỏi lại sau ít phút nhé.";

export const NOT_FOUND_MESSAGE =
  "Mình không tìm thấy nội dung này trong tài liệu bạn đã chọn. Hãy thử hỏi cách khác, mở rộng phạm vi hoặc kiểm tra tài liệu đã được index chưa.";

/** P3: Ollama local timeout (measured ~25s for short answers; RAG prompts need more headroom). */
export const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 60_000);
export const OPENAI_ASSISTANT_TIMEOUT_MS = Number(
  process.env.OPENAI_ASSISTANT_TIMEOUT_MS || 30_000,
);
/** Empty disables the Ollama tier (OpenAI / extractive still work). */
export const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";
export const EMBEDDING_MODEL =
  process.env.ASSISTANT_EMBEDDING_MODEL || "Xenova/multilingual-e5-small";

/** ~500 tokens ≈ 2000 chars for mixed VI/EN study notes. */
export const CHUNK_SIZE_CHARS = Number(process.env.ASSISTANT_CHUNK_SIZE || 2000);
export const CHUNK_OVERLAP_CHARS = Number(process.env.ASSISTANT_CHUNK_OVERLAP || 200);
export const INDEX_MAX_ATTEMPTS = 3;
export const INDEX_WORKER_INTERVAL_MS = Number(
  process.env.ASSISTANT_INDEX_INTERVAL_MS || 30_000,
);
export const INDEX_BATCH_SIZE = 3;
/** No hard truncate for RAG (unlike AI summary). Soft cap to protect memory. */
export const RAG_MAX_EXTRACT_CHARS = Number(
  process.env.ASSISTANT_MAX_EXTRACT_CHARS || 500_000,
);
export const RETRIEVE_TOP_K = 5;
/** Passage window shown to the LLM / Sources UI — centered on query matches, not always the chunk head. */
export const RETRIEVE_EXCERPT_CHARS = Number(process.env.ASSISTANT_EXCERPT_CHARS || 900);
/** Keyword/hybrid floor — keep high enough to drop stopword-only false hits (e.g. CV vs môn học). */
export const RETRIEVE_MIN_SCORE = Number(process.env.ASSISTANT_RETRIEVE_MIN_SCORE || 0.4);
/** Reject hybrid hits whose keyword signal is noise unless semantic is clearly strong. */
export const RETRIEVE_MIN_KEYWORD_FOR_HYBRID = 0.2;
/**
 * e5-small often scores unrelated study notes ~0.75–0.80 for the same EN query.
 * Keep this high so pure-semantic hits need a clear peak (or keyword help via EN↔VI map).
 */
export const RETRIEVE_MIN_SEMANTIC_ALONE = Number(
  process.env.ASSISTANT_MIN_SEMANTIC_ALONE || 0.84,
);
/** When the user pins a single document, trust in-doc ranking more (lower floors). */
export const RETRIEVE_MIN_SCORE_PINNED = Number(
  process.env.ASSISTANT_RETRIEVE_MIN_SCORE_PINNED || 0.28,
);
export const RETRIEVE_MIN_SEMANTIC_PINNED = Number(
  process.env.ASSISTANT_MIN_SEMANTIC_PINNED || 0.72,
);
