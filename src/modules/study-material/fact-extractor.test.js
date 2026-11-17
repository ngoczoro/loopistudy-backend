import {
  extractFacts,
  extractFactsFromSources,
  isOutlineText,
  isQuestionTerm,
  isStructuralTerm,
  keepTopFacts,
  selectFactsInPassages,
} from "./fact-extractor.js";

// Shape of a real course outline uploaded as a subject file.
const COURSE_OUTLINE = `ĐỀ CƯƠNG CHI TIẾT MÔN HỌC: SINH HỌC ĐẠI CƯƠNG (LỚP 10)

Trình độ môn học: Cơ bản / Đại cương

Đối tượng: Học sinh lớp 10

Mục tiêu tổng quát: Giúp học sinh nhận biết được các thành phần cơ bản của sự sống.

I. CHUẨN ĐẦU RA MÔN HỌC (CLOs)

CLO 1: Liệt kê được các cấp độ tổ chức sống cơ bản trong tự nhiên.

CLO 2: Nhận biết và nêu tên được các đại phân tử hữu cơ chính cấu tạo nên tế bào.

Chương 1: Giới thiệu chung về thế giới sống

Bài 1: Các cấp độ tổ chức của thế giới sống (Từ nguyên tử, tế bào, cơ thể đến hệ sinh thái).

Bài 2: Phương pháp quan sát đơn giản trong Sinh học (Cách sử dụng kính hiển vi).

Chương 3: Cấu trúc tế bào (Mức độ nhận diện)

Bài 5: Tế bào nhân sơ (Cấu tạo đơn giản của vi khuẩn).

Bài 6: Tế bào nhân thực (Mô tả hình dáng các bào quan lớn: Nhân, Ty thể, Lục lạp).

Source: Shutterstock`;

describe("structural labels", () => {
  it.each(["Bài 5", "Chương 3", "CLO 2", "Week 4", "Lesson 10", "II", "Trình độ môn học", "Mục tiêu tổng quát", "Lưu ý", "Source", "ĐỀ CƯƠNG CHI TIẾT MÔN HỌC"])(
    "treats %s as structure, not a concept",
    (term) => expect(isStructuralTerm(term)).toBe(true),
  );

  it.each(["Ti thể", "Tế bào nhân sơ", "DNA", "Kế thừa (Inheritance)", "Bài toán tối ưu", "Mục lục động", "Đối tượng", "Đối tượng (Object)"])(
    "keeps %s as a concept",
    (term) => expect(isStructuralTerm(term)).toBe(false),
  );
});

describe("question words", () => {
  it.each(["What", "How", "Why it matters", "Tại sao", "Vì sao", "Như thế nào"])("%s is not a term", (term) =>
    expect(isQuestionTerm(term)).toBe(true));
  it.each(["Whatsapp", "Howard", "Ti thể", "Kế thừa"])("%s can be a term", (term) =>
    expect(isQuestionTerm(term)).toBe(false));
});

describe("course outlines", () => {
  it("detects an outline and yields no facts from it", () => {
    expect(isOutlineText(COURSE_OUTLINE)).toBe(true);
    expect(extractFacts(COURSE_OUTLINE)).toEqual([]);
  });

  it("keeps real notes that use chapter headings", () => {
    const note = [
      "Chương 3: Cấu trúc tế bào",
      "Ti thể: bào quan tạo năng lượng ATP cho tế bào",
      "Lục lạp: bào quan thực hiện quang hợp ở thực vật",
      "Ribosome: nơi tổng hợp protein trong tế bào",
      "Bài 5: Tế bào nhân sơ (Cấu tạo đơn giản của vi khuẩn).",
    ].join("\n");

    expect(isOutlineText(note)).toBe(false);
    const facts = extractFacts(note);
    expect(facts.map((fact) => fact.term)).toEqual(["Ti thể", "Lục lạp", "Ribosome", "Tế bào nhân sơ"]);
    expect(facts[0].heading).toBe("Cấu trúc tế bào");
    expect(facts[3].definition).toBe("Cấu tạo đơn giản của vi khuẩn");
  });

  it("drops lesson glosses that are syllabus instructions", () => {
    const note = [
      "Ti thể: bào quan tạo năng lượng ATP cho tế bào",
      "Bài 6: Tế bào nhân thực (Mô tả hình dáng các bào quan lớn: Nhân, Ty thể).",
    ].join("\n");
    expect(extractFacts(note).map((fact) => fact.term)).toEqual(["Ti thể"]);
  });
});
import { rankByTopic } from "../ai/utils/topicMatch.js";

const noteWith = (prefix, count) =>
  `# ${prefix}\n` +
  Array.from(
    { length: count },
    (_, i) => `${prefix} term ${i + 1}: definition number ${i + 1} for ${prefix}`,
  ).join("\n");

describe("extractFactsFromSources", () => {
  it("takes facts round-robin so a long first source cannot fill the quota", () => {
    const facts = extractFactsFromSources(
      [noteWith("Alpha", 40), noteWith("Beta", 5), noteWith("Gamma", 5)],
      { limit: 30 },
    );

    expect(facts).toHaveLength(30);
    const fromSource = (name) => facts.filter((fact) => fact.heading === name).length;
    expect(fromSource("Beta")).toBe(5);
    expect(fromSource("Gamma")).toBe(5);
    expect(fromSource("Alpha")).toBe(20);
    expect(facts.slice(0, 3).map((fact) => fact.heading)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("gives every fact a unique id after merging", () => {
    const facts = extractFactsFromSources([noteWith("Alpha", 3), noteWith("Beta", 3)]);
    const ids = facts.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("f1");
  });

  it("drops the same sentence appearing in two sources", () => {
    const shared = "Mitochondria: the powerhouse of the cell";
    const facts = extractFactsFromSources([shared, shared]);
    expect(facts).toHaveLength(1);
  });

  it("matches extractFacts for a single source", () => {
    const facts = extractFactsFromSources([noteWith("Solo", 4)]);
    expect(facts.map((fact) => fact.id)).toEqual(["f1", "f2", "f3", "f4"]);
  });
});

describe("selectFactsInPassages", () => {
  const prokaryote = [
    "# Tế bào nhân sơ",
    "- Vùng nhân: nơi chứa phân tử ADN vòng của tế bào nhân sơ",
    "- Plasmid: phân tử ADN vòng nhỏ nằm ngoài vùng nhân",
    "- Roi: cấu trúc giúp vi khuẩn di chuyển trong môi trường",
  ].join("\n");
  const genetics = [
    "# Di truyền học",
    "Alen: các trạng thái khác nhau của cùng một gen",
    "Kiểu gen: tổ hợp các alen của một cá thể sinh vật",
  ].join("\n");
  const documents = [
    { id: "a", text: prokaryote },
    { id: "b", text: genetics },
  ];

  it("keeps only facts inside the matched passages", () => {
    const passages = [
      {
        contentId: "a",
        chunkText: "Vùng nhân: nơi chứa phân tử ADN vòng của tế bào nhân sơ\nPlasmid: phân tử ADN vòng nhỏ nằm ngoài vùng nhân",
        score: 0.9,
      },
    ];
    const facts = selectFactsInPassages(documents, passages);
    expect(facts.map((fact) => fact.term)).toEqual(["Vùng nhân", "Plasmid"]);
  });

  it("drops a fact the passage only shows partly (chunk overlap cut mid-line)", () => {
    const passages = [
      { contentId: "a", chunkText: "ADN vòng của tế bào nhân sơ\n- Roi: cấu trúc giúp vi khuẩn di chuyển trong môi trường", score: 0.8 },
    ];
    const facts = selectFactsInPassages(documents, passages);
    expect(facts.map((fact) => fact.term)).toEqual(["Roi"]);
  });

  it("orders documents by their best passage and balances across them", () => {
    const passages = [
      { contentId: "b", chunkText: genetics, score: 0.95 },
      { contentId: "a", chunkText: prokaryote, score: 0.6 },
    ];
    const facts = selectFactsInPassages(documents, passages);
    expect(facts.slice(0, 2).map((fact) => fact.heading)).toEqual(["Di truyền học", "Tế bào nhân sơ"]);
    expect(facts.map((fact) => fact.id)).toEqual(["f1", "f2", "f3", "f4", "f5"]);
  });

  it("returns nothing when no passage belongs to a loaded document", () => {
    expect(selectFactsInPassages(documents, [{ contentId: "x", chunkText: genetics, score: 1 }])).toEqual([]);
  });
});

describe("keepTopFacts", () => {
  const facts = ["a", "b", "c", "d", "e", "f"].map((term) => ({ term, sentence: term }));

  it("keeps facts close to the best score, best first", () => {
    const kept = keepTopFacts(facts, [0.70, 0.91, 0.88, 0.60, 0.90, 0.50], { min: 2 });
    expect(kept.map((fact) => fact.term)).toEqual(["b", "e", "c"]);
    expect(kept.map((fact) => fact.id)).toEqual(["f1", "f2", "f3"]);
  });

  it("always keeps at least `min` facts", () => {
    const kept = keepTopFacts(facts, [0.9, 0.1, 0.1, 0.1, 0.1, 0.1], { min: 4 });
    expect(kept).toHaveLength(4);
    expect(kept[0].term).toBe("a");
  });

  it("keeps the incoming order when there are no scores", () => {
    const kept = keepTopFacts(facts, [], { max: 3 });
    expect(kept.map((fact) => fact.term)).toEqual(["a", "b", "c"]);
  });
});

describe("rankByTopic", () => {
  const items = [
    { id: "pinned", title: "Lịch thi học kỳ" },
    { id: "both", title: "Tế bào nhân sơ", content: "vi khuẩn" },
    { id: "one", title: "Tế bào nhân thực" },
    { id: "none", title: "Di truyền học" },
  ];

  it("keeps only matching items, most matched words first", () => {
    const ranked = rankByTopic(items, "tế bào nhân sơ");
    expect(ranked.map((item) => item.id)).toEqual(["both", "one"]);
  });

  it("keeps incoming order on ties", () => {
    const ranked = rankByTopic(items, "học");
    expect(ranked.map((item) => item.id)).toEqual(["pinned", "none"]);
  });

  it("returns every item when the topic is empty", () => {
    expect(rankByTopic(items, "  ")).toBe(items);
    expect(rankByTopic(items, undefined)).toBe(items);
  });

  it("returns nothing when no item matches", () => {
    expect(rankByTopic(items, "quang hợp")).toEqual([]);
  });
});
