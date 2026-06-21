const roundScore = (value) => Math.round(Number(value) * 100) / 100;

export const serializeSearchResultItem = (passage) => ({
  documentId: passage.documentId,
  documentTitle: passage.documentTitle,
  subjectId: passage.subjectId ?? null,
  subjectName: passage.subjectName ?? "",
  excerpt: passage.excerpt,
  score: roundScore(passage.score ?? 0),
});

export const serializeDocumentSearchResult = ({ query, results = [] }) => ({
  query,
  results: results.map(serializeSearchResultItem),
});

export const serializeDocumentSearchExplainResult = ({
  query,
  answer,
  passageReasons = [],
}) => ({
  query,
  answer,
  passageReasons: passageReasons.map((item) => ({
    documentId: item.documentId,
    reason: item.reason ?? "",
  })),
});
