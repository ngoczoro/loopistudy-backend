import sequelize from "../../../config/database.js";

const SavedResource = () => sequelize.models.SavedLearningResource;

export const findByUserAndUrl = async (userId, url) =>
  SavedResource().findOne({
    where: { userId, url },
  });

export const createSavedResource = async (data) =>
  SavedResource().create(data);

export const findSavedResources = async (userId, { subjectId } = {}) => {
  const where = { userId };

  if (subjectId !== undefined && subjectId !== null && subjectId !== "") {
    where.subjectId = subjectId;
  }

  return SavedResource().findAll({
    where,
    order: [["createdAt", "DESC"]],
  });
};

export const findSavedResourceByIdAndUser = async (id, userId) =>
  SavedResource().findOne({
    where: { id, userId },
  });

export const deleteSavedResource = async (record) => record.destroy();

export const findSavedUrlsForUser = async (userId) => {
  const rows = await SavedResource().findAll({
    where: { userId },
    attributes: ["url"],
    raw: true,
  });

  return new Set(rows.map((row) => String(row.url ?? "").trim()).filter(Boolean));
};
