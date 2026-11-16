export const topicTokens = (topic) =>
  String(topic ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 1);

const haystackFor = (item) =>
  `${item.title ?? ""} ${item.description ?? ""} ${item.content ?? ""}`.toLowerCase();

/**
 * Items mentioning the topic, most matched words first.
 * Ties keep the incoming order (pinned, then recently updated).
 */
export const rankByTopic = (items, topic) => {
  const tokens = topicTokens(topic);
  if (!tokens.length) return items;

  return items
    .map((item, index) => {
      const haystack = haystackFor(item);
      const score = tokens.filter((token) => haystack.includes(token)).length;
      return { item, index, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
};
