export const serializeDocumentSummary = (record) => {
  if (!record) return null;

  const plain = record.get ? record.get({ plain: true }) : record;

  return {
    documentId: plain.documentId ?? plain.document_id,
    summary: plain.summary,
    keyPoints: plain.keyPoints ?? plain.key_points ?? [],
    learningNotes: plain.learningNotes ?? plain.learning_notes ?? [],
    keywords: plain.keywords ?? [],
    model: plain.model ?? null,
    generatedAt: plain.updatedAt ?? plain.updated_at ?? plain.createdAt ?? plain.created_at,
  };
};
