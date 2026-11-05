import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineDocumentIndexStatusModel = (sequelize) => {
  return sequelize.define(
    "DocumentIndexStatus",
    {
      contentId: {
        type: DataTypes.UUID,
        primaryKey: true,
        field: "content_id",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "not_indexed",
        validate: {
          isIn: [["indexed", "indexing", "stale", "not_indexed", "failed", "unsupported"]],
        },
      },
      contentHash: {
        // sha256 (64) + chunker suffix `:cN` — see migration 024
        type: DataTypes.STRING(96),
        allowNull: true,
        field: "content_hash",
      },
      chunkCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "chunk_count",
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      nextAttemptAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "next_attempt_at",
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "last_error",
      },
      indexedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "indexed_at",
      },
    },
    modelOptions("document_index_status"),
  );
};
