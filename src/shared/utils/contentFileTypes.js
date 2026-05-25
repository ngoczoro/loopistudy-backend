export const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
]);

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

export const ALLOWED_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
];

export const getExtension = (fileName = "") => {
  if (!fileName || !fileName.includes(".")) return "";
  return fileName.split(".").pop()?.toLowerCase() || "";
};

export const isImageFile = (file) => {
  const ext = getExtension(file?.originalname || file?.fileName);
  const mime = file?.mimetype?.toLowerCase() || file?.fileMime?.toLowerCase() || "";
  return mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext);
};

export const isDocumentFile = (file) => {
  const ext = getExtension(file?.originalname || file?.fileName);
  const mime = file?.mimetype?.toLowerCase() || file?.fileMime?.toLowerCase() || "";
  if (DOCUMENT_EXTENSIONS.has(ext)) return true;

  return [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "text/plain",
  ].includes(mime);
};

export const isTextFile = (file) => {
  const ext = getExtension(file?.originalname || file?.fileName);
  const mime = file?.mimetype?.toLowerCase() || file?.fileMime?.toLowerCase() || "";
  return ext === "txt" || mime === "text/plain";
};

export const getUploadType = (file) => {
  if (isImageFile(file)) return "image";
  if (isDocumentFile(file)) return "document";
  return null;
};
