/** Curated trusted external learning resources — URLs are fixed and must not be AI-generated. */
export const RESOURCE_CATALOG = Object.freeze([
  {
    id: "java-oracle-docs",
    title: "Oracle Java Documentation",
    type: "documentation",
    provider: "Oracle",
    url: "https://docs.oracle.com/en/java/",
    topics: ["java", "oop", "jvm", "jdk", "inheritance", "polymorphism"],
    description: "Official Java documentation from Oracle.",
  },
  {
    id: "java-baeldung",
    title: "Baeldung Java Tutorials",
    type: "tutorial",
    provider: "Baeldung",
    url: "https://www.baeldung.com/java-tutorial",
    topics: ["java", "oop", "spring", "collections", "threads"],
    description: "In-depth Java tutorials and guides for practical development.",
  },
  {
    id: "java-geeksforgeeks",
    title: "GeeksForGeeks Java",
    type: "article",
    provider: "GeeksForGeeks",
    url: "https://www.geeksforgeeks.org/java/",
    topics: ["java", "oop", "data structures", "algorithms"],
    description: "Java articles covering fundamentals and interview topics.",
  },
  {
    id: "java-freecodecamp",
    title: "freeCodeCamp Java Course",
    type: "course",
    provider: "freeCodeCamp",
    url: "https://www.freecodecamp.org/news/tag/java/",
    topics: ["java", "oop", "programming", "beginner"],
    description: "Free Java learning articles and courses from freeCodeCamp.",
  },
  {
    id: "react-official-docs",
    title: "React Official Docs",
    type: "documentation",
    provider: "React",
    url: "https://react.dev/",
    topics: ["react", "hooks", "jsx", "frontend", "javascript"],
    description: "Official React documentation with modern best practices.",
  },
  {
    id: "react-freecodecamp",
    title: "freeCodeCamp React Course",
    type: "course",
    provider: "freeCodeCamp",
    url: "https://www.freecodecamp.org/learn/front-end-development-libraries/",
    topics: ["react", "hooks", "frontend", "javascript"],
    description: "Interactive React curriculum on freeCodeCamp.",
  },
  {
    id: "react-kent-dodds",
    title: "Kent C. Dodds Blog",
    type: "article",
    provider: "Kent C. Dodds",
    url: "https://kentcdodds.com/blog",
    topics: ["react", "hooks", "testing", "javascript", "frontend"],
    description: "Expert articles on React, hooks, and modern frontend patterns.",
  },
  {
    id: "mdn-javascript",
    title: "MDN JavaScript Guide",
    type: "documentation",
    provider: "MDN",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    topics: ["javascript", "react", "frontend", "web", "programming"],
    description: "Comprehensive JavaScript guide from Mozilla Developer Network.",
  },
  {
    id: "postgres-docs",
    title: "PostgreSQL Documentation",
    type: "documentation",
    provider: "PostgreSQL",
    url: "https://www.postgresql.org/docs/",
    topics: ["database", "sql", "postgresql", "normalization", "indexes"],
    description: "Official PostgreSQL documentation for relational databases.",
  },
  {
    id: "sqlbolt",
    title: "SQLBolt",
    type: "tutorial",
    provider: "SQLBolt",
    url: "https://sqlbolt.com/",
    topics: ["sql", "database", "queries", "joins", "normalization"],
    description: "Interactive SQL lessons with exercises.",
  },
  {
    id: "w3schools-sql",
    title: "W3Schools SQL Tutorial",
    type: "tutorial",
    provider: "W3Schools",
    url: "https://www.w3schools.com/sql/",
    topics: ["sql", "database", "queries", "constraints"],
    description: "Beginner-friendly SQL tutorial with examples.",
  },
  {
    id: "geeksforgeeks-dbms",
    title: "GeeksForGeeks DBMS",
    type: "article",
    provider: "GeeksForGeeks",
    url: "https://www.geeksforgeeks.org/dbms/",
    topics: ["database", "dbms", "normalization", "erd", "transactions", "indexes"],
    description: "Database management system articles and theory.",
  },
  {
    id: "visualgo",
    title: "VisuAlgo",
    type: "tutorial",
    provider: "VisuAlgo",
    url: "https://visualgo.net/en",
    topics: ["dsa", "algorithms", "data structures", "sorting", "graphs", "trees"],
    description: "Visual learning platform for data structures and algorithms.",
  },
  {
    id: "geeksforgeeks-dsa",
    title: "GeeksForGeeks DSA",
    type: "article",
    provider: "GeeksForGeeks",
    url: "https://www.geeksforgeeks.org/data-structures/",
    topics: ["dsa", "data structures", "algorithms", "arrays", "linked lists", "trees"],
    description: "Data structures and algorithms articles with examples.",
  },
  {
    id: "neetcode",
    title: "NeetCode",
    type: "course",
    provider: "NeetCode",
    url: "https://neetcode.io/",
    topics: ["dsa", "algorithms", "leetcode", "interview", "coding"],
    description: "Structured algorithm practice with video explanations.",
  },
  {
    id: "freecodecamp-dsa",
    title: "freeCodeCamp DSA Course",
    type: "course",
    provider: "freeCodeCamp",
    url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
    topics: ["dsa", "javascript", "algorithms", "data structures"],
    description: "Free certification course on algorithms and data structures.",
  },
  {
    id: "mdn-web-docs",
    title: "MDN Web Docs",
    type: "documentation",
    provider: "MDN",
    url: "https://developer.mozilla.org/en-US/docs/Web",
    topics: ["web", "html", "css", "javascript", "rest", "api", "frontend"],
    description: "Authoritative web development documentation.",
  },
  {
    id: "w3schools-web",
    title: "W3Schools Web Tutorials",
    type: "tutorial",
    provider: "W3Schools",
    url: "https://www.w3schools.com/",
    topics: ["web", "html", "css", "javascript", "frontend"],
    description: "Web development tutorials for HTML, CSS, and JavaScript.",
  },
  {
    id: "css-tricks",
    title: "CSS-Tricks",
    type: "article",
    provider: "CSS-Tricks",
    url: "https://css-tricks.com/",
    topics: ["css", "web", "frontend", "layout", "design"],
    description: "Articles and guides on CSS and frontend techniques.",
  },
  {
    id: "freecodecamp-web",
    title: "freeCodeCamp Web Development",
    type: "course",
    provider: "freeCodeCamp",
    url: "https://www.freecodecamp.org/learn/responsive-web-design/",
    topics: ["web", "html", "css", "frontend", "responsive"],
    description: "Responsive web design certification from freeCodeCamp.",
  },
  {
    id: "rest-api-mdn",
    title: "MDN REST API Guide",
    type: "documentation",
    provider: "MDN",
    url: "https://developer.mozilla.org/en-US/docs/Glossary/REST",
    topics: ["rest", "api", "web", "http", "backend"],
    description: "Introduction to REST concepts and web APIs.",
  },
  {
    id: "spring-docs",
    title: "Spring Framework Documentation",
    type: "documentation",
    provider: "Spring",
    url: "https://docs.spring.io/spring-framework/reference/",
    topics: ["java", "spring", "backend", "rest", "api"],
    description: "Official Spring Framework documentation for Java backends.",
  },
]);

const catalogById = new Map(
  RESOURCE_CATALOG.map((resource) => [resource.id, resource]),
);

export const getResourceById = (resourceId) =>
  catalogById.get(String(resourceId ?? "").trim()) ?? null;

export const getCatalogResourcesByIds = (resourceIds = []) => {
  const results = [];

  for (const id of resourceIds) {
    const resource = getResourceById(id);
    if (resource) {
      results.push(resource);
    }
  }

  return results;
};

export const normalizeResourceQuery = (query) =>
  String(query ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreResource = (resource, tokens) => {
  let score = 0;
  const haystack = [
    resource.title,
    resource.provider,
    resource.description,
    ...(resource.topics ?? []),
  ]
    .join(" ")
    .toLowerCase();

  for (const token of tokens) {
    if (!token) continue;

    if (haystack.includes(token)) {
      score += 3;
    }

    for (const topic of resource.topics ?? []) {
      if (topic.includes(token) || token.includes(topic)) {
        score += 2;
      }
    }
  }

  return score;
};

export const selectCatalogCandidates = (query, maxCandidates = 10) => {
  const normalized = normalizeResourceQuery(query);
  const tokens = normalized.split(" ").filter(Boolean);

  if (!tokens.length) {
    return [];
  }

  const ranked = RESOURCE_CATALOG.map((resource) => ({
    resource,
    score: scoreResource(resource, tokens),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map((item) => item.resource);

  return ranked;
};

export const rankCatalogFallback = (query, limit = 5) => {
  const candidates = selectCatalogCandidates(query, limit);
  return candidates.map((resource) => ({
    resourceId: resource.id,
    title: resource.title,
    type: resource.type,
    provider: resource.provider,
    url: resource.url,
    reason: `Phù hợp với chủ đề "${query}" dựa trên thẻ chủ đề và mô tả nguồn học.`,
    topics: resource.topics ?? [],
  }));
};
