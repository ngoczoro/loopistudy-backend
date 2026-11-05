import sequelize from "../../config/database.js";

const GroupResource = () => sequelize.models.GroupResource;
const User = () => sequelize.models.User;

const sharerInclude = () => ({
  model: User(),
  as: "sharer",
  attributes: ["id", "fullName", "avatarUrl"],
});

export const listByGroup = async (groupId) =>
  GroupResource().findAll({
    where: { groupId },
    include: [sharerInclude()],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
  });

export const findInGroup = async (groupId, resourceId) =>
  GroupResource().findOne({ where: { id: resourceId, groupId } });

export const findById = async (resourceId) =>
  GroupResource().findByPk(resourceId, { include: [sharerInclude()] });

export const create = async (data) => GroupResource().create(data);

export const remove = async (resource) => resource.destroy();
