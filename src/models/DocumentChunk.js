import { DataTypes } from "sequelize";
import { modelOptions } from "./shared.js";

export const defineDocumentChunkModel = (sequelize) => {
  return sequelize.define(
    "DocumentChunk",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
      },
      contentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "content_id",
      },
      chunkIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "chunk_index",
      },
      chunkText: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "chunk_text",
      },
      location: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      embedding: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: true,
      },
      embeddingModel: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "embedding_model",
      },
      // search_tsv is maintained via raw SQL in the indexer (Postgres TSVECTOR).
    },
    modelOptions("document_chunks"),
  );
};
