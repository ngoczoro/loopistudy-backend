import sequelize from "../../../config/database.js";

const DocumentSummary = () => sequelize.models.DocumentSummary;

export const findByDocumentId = async (documentId) =>
  DocumentSummary().findOne({
    where: { documentId },
  });

export const createSummary = async (data) => DocumentSummary().create(data);

export const updateSummary = async (record, data) => record.update(data);

export const upsertSummary = async (documentId, data) => {
  const existing = await findByDocumentId(documentId);
  const { createdBy, ...fields } = data;

  if (existing) {
    return updateSummary(existing, fields);
  }

  return createSummary({
    documentId,
    createdBy,
    ...fields,
  });
};
