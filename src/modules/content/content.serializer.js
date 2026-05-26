import { getExtension } from "../../shared/utils/contentFileTypes.js";

const PREVIEWABLE_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
]);

const DOWNLOAD_ONLY_EXTENSIONS = new Set(["ppt", "pptx"]);

const isPreviewableFile = (plain, fileUrl) => {
  const ext = getExtension(plain.fileName);
  if (!fileUrl) return false;
  if (DOWNLOAD_ONLY_EXTENSIONS.has(ext)) return false;
  return PREVIEWABLE_EXTENSIONS.has(ext);
};

export const serializeContentItem = (item) => {
  if (!item) return null;

  const plain = item.get ? item.get({ plain: true }) : item;
  const fileUrl = plain.fileUrl ?? null;
  const cloudinaryPublicId = plain.cloudinaryPublicId ?? null;
  const previewable = isPreviewableFile(plain, fileUrl);
  const ext = getExtension(plain.fileName);
  const downloadable = Boolean(fileUrl);

  return {
    id: plain.id,
    subjectId: plain.subjectId ?? null,
    title: plain.title,
    description: plain.description ?? null,
    type: plain.type,
    content: plain.content ?? null,
    fileUrl,
    fileName: plain.fileName ?? null,
    fileSize:
      plain.fileSizeBytes != null ? Number(plain.fileSizeBytes) : null,
    mimeType: plain.fileMime ?? null,
    cloudinaryPublicId,
    previewable,
    downloadable,
    previewNotSupported: DOWNLOAD_ONLY_EXTENSIONS.has(ext),
    isPinned: Boolean(plain.isPinned),
    createdAt: plain.createdAt ?? plain.created_at ?? null,
    updatedAt: plain.updatedAt ?? plain.updated_at ?? null,
  };
};

export const serializeContentList = (items) =>
  items.map((item) => serializeContentItem(item));
