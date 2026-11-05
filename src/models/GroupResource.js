import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineGroupResourceModel = (sequelize) => {
  return sequelize.define(
    "GroupResource",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "group_id",
      },
      sharedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "shared_by",
      },
      type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: { isIn: [["link", "note", "file"]] },
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      refId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "ref_id",
      },
      refSnapshot: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "ref_snapshot",
      },
    },
    modelOptions("group_resources"),
  );
};
