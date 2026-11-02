import { describe, expect, it } from "@jest/globals";
import { RETRIEVE_MIN_SCORE } from "./assistant.constants.js";
import {
  buildExcerpt,
  buildExtractiveAnswer,
  cosineSimilarity,
  scoreChunk,
} from "./assistant.retrieve.js";

describe("scoreChunk", () => {
  it("scores higher when query terms appear in the passage", () => {
    const passage =
      "Encapsulation dong goi du lieu va phuong thuc trong mot lop Java.";
    expect(scoreChunk(passage, "encapsulation java")).toBeGreaterThan(
      scoreChunk(passage, "quantum physics"),
    );
  });

  it("ignores vietnamese diacritics when matching", () => {
    const passage = "Đóng gói dữ liệu giúp bảo vệ trạng thái đối tượng.";
    expect(scoreChunk(passage, "dong goi du lieu")).toBeGreaterThan(0.5);
  });

  it("does not treat CV notes as biology CLO sources", () => {
    const question = "Chuẩn đầu ra của môn sinh học";
    const cv = `CV ứng tuyển thực tập
Tôi là sinh viên năm cuối của trường Đại học. Mục tiêu học tập và phát triển kỹ năng.
Kinh nghiệm làm việc nhóm, báo cáo đầu ra dự án.`;
    const bio = `Chuẩn đầu ra môn Sinh học
CLO1: Phân tích cấu trúc tế bào và chức năng các bào quan.
CLO2: Giải thích cơ chế di truyền Mendel và đột biến gen.
CLO3: Vận dụng kiến thức sinh thái vào bảo vệ môi trường.`;

    const cvScore = scoreChunk(cv, question);
    const bioScore = scoreChunk(bio, question);

    expect(bioScore).toBeGreaterThan(cvScore);
    expect(bioScore).toBeGreaterThanOrEqual(RETRIEVE_MIN_SCORE);
    expect(cvScore).toBeLessThan(RETRIEVE_MIN_SCORE);
  });

  it("uses whole tokens instead of substring matches", () => {
    // "ra" must not match inside arbitrary words; stopword "ra" is ignored anyway.
    expect(scoreChunk("thuc hanh lap trinh java", "chuan dau ra mon sinh")).toBe(0);
  });

  it("prefers Technical Skills section over Experience for technical/cv questions", () => {
    const question = "cv của tôi bao gồm các technical gì";
    const experience = `Experience
Built automated regression flows for MSA/SOW/PO with Mesha using XPath locators.`;
    const skills = `Technical Skills
Languages: JavaScript, TypeScript, Java, SQL, C++
Web & Backend: React.js, Node.js, PostgreSQL
Testing & Automation: Playwright, Selenium, Mesha`;

    const skillsScore = scoreChunk(skills, question, { title: "Dao_Le_Bao_Ngoc_Resume" });
    const experienceScore = scoreChunk(experience, question, {
      title: "Dao_Le_Bao_Ngoc_Resume",
    });

    expect(skillsScore).toBeGreaterThanOrEqual(RETRIEVE_MIN_SCORE);
    expect(skillsScore).toBeGreaterThan(experienceScore);
  });

  it("maps English biology/grade terms onto Vietnamese syllabus wording", () => {
    const syllabus = `ĐỀ CƯƠNG CHI TIẾT MÔN HỌC: SINH HỌC ĐẠI CƯƠNG (LỚP 10)
Đối tượng: Học sinh lớp 10`;
    const trees = `Binary Trees — Lecture Notes. Traversal algorithms and BST properties.`;

    expect(
      scoreChunk(syllabus, "For which grade level is the subject of Biology intended?"),
    ).toBeGreaterThan(scoreChunk(trees, "For which grade level is the subject of Biology intended?"));
  });

  it("maps apply/role questions onto Software Engineer / QA Engineer headings", () => {
    const question = "cv đang apply cho role gì";
    const header = `Dao Le Bao Ngoc
Software Engineer
Final-year Software Engineering student`;
    const skills = `Technical Skills
Languages: JavaScript, TypeScript, Java`;

    expect(scoreChunk(header, question, { title: "cv" })).toBeGreaterThan(
      scoreChunk(skills, question, { title: "cv" }),
    );
    expect(scoreChunk(header, question, { title: "cv" })).toBeGreaterThanOrEqual(0.35);
  });
});

describe("buildExcerpt", () => {
  it("centers the window on query matches instead of always using the chunk head", () => {
    const prefix = "Student header and ecommerce intro. ".repeat(40);
    const focus =
      "Hybrid Processing\n\nKết hợp nhiều phương thức trong cùng hệ thống\nToàn bộ nền tảng.";
    const suffix = " More table rows about batch jobs. ".repeat(20);
    const excerpt = buildExcerpt(prefix + focus + suffix, "what is the Hybrid Processing", 200);
    expect(excerpt.toLowerCase()).toContain("hybrid processing");
    expect(excerpt).toContain("Kết hợp");
    expect(excerpt.startsWith("Student header")).toBe(false);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal or invalid vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
});

describe("buildExtractiveAnswer", () => {
  it("lists excerpts with citation markers", () => {
    const text = buildExtractiveAnswer([
      { index: 1, excerpt: "SRP: one reason to change" },
      { index: 2, excerpt: "OCP: open for extension" },
    ]);
    expect(text).toContain("[1]");
    expect(text).toContain("[2]");
    expect(text).toContain("SRP");
  });
});
