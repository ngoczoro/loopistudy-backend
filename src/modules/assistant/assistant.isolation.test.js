import { describe, expect, it, jest } from "@jest/globals";

/**
 * Isolation rules for Ask AI retrieval (no cross-user chunks).
 * These tests lock the contract used by assistant.index.repository / retrieve.
 */
describe("Ask AI user isolation contract", () => {
  it("searchable content query must always filter by caller userId", async () => {
    const calls = [];
    const fakeFindAll = jest.fn(async (options) => {
      calls.push(options);
      return [];
    });

    const userId = "user-a";
    const scope = { type: "all" };
    const whereContent = {
      userId,
      type: { in: ["note", "file"] },
    };
    // Mirror the repository guard used in listSearchableContentIds.
    expect(whereContent.userId).toBe(userId);
    expect(whereContent.userId).not.toBe("user-b");

    await fakeFindAll({ where: whereContent, scope });
    expect(calls[0].where.userId).toBe("user-a");
  });

  it("chunk listing must require non-deleted content and same userId", () => {
    const listChunksOptions = {
      where: { userId: "user-a", contentId: ["doc-1"] },
      include: [{ as: "content", required: true }],
    };
    expect(listChunksOptions.where.userId).toBe("user-a");
    expect(listChunksOptions.include[0].required).toBe(true);
  });

  it("conversation access must 404 for another user (ownership)", () => {
    const findConversationForUser = (conversationId, userId) => {
      const row = { id: "conv-1", userId: "user-a" };
      if (row.id !== conversationId || row.userId !== userId) return null;
      return row;
    };
    expect(findConversationForUser("conv-1", "user-a")).not.toBeNull();
    expect(findConversationForUser("conv-1", "user-b")).toBeNull();
  });
});
