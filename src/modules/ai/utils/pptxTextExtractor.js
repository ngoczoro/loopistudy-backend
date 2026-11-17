import JSZip from "jszip";
import ApiError from "../../../utils/ApiError.js";

const SLIDE_PATH_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/i;

const PARAGRAPH_PATTERN = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
const RUN_PATTERN = /<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>|<a:br\b[^>]*\/?>/g;

/**
 * Text of one <a:p>: runs joined as-is, <a:br/> as a line break. Runs carry their own spaces
 * and a word can be split across runs (["M", "ultiple computers"]), so never add a space here.
 */
const paragraphText = (xml) => {
  let text = "";
  for (const match of xml.matchAll(RUN_PATTERN)) {
    text += match[0].startsWith("<a:br") ? "\n" : match[1] ?? "";
  }
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
};

/**
 * Extract visible text from OpenXML slide markup, one line per paragraph, so a slide's title
 * and its bullet items stay separate ("Advantages" / "Back-up and restore data" / …).
 */
export const extractTextFromSlideXml = (xml = "") =>
  [...xml.matchAll(PARAGRAPH_PATTERN)]
    .map((match) => paragraphText(match[1]))
    .filter(Boolean)
    .join("\n");

const sortSlideEntries = (entries) =>
  entries.sort((a, b) => Number(a.number) - Number(b.number));

/**
 * Parse PPTX buffer into slide-separated plain text.
 * @param {Buffer} buffer
 * @returns {string}
 */
export const extractTextFromPptxBuffer = async (buffer) => {
  let zip;

  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw ApiError.badRequest("Unable to read this presentation file.");
  }

  const slideEntries = [];

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;

    const match = path.match(SLIDE_PATH_PATTERN);
    if (!match) continue;

    const xml = await file.async("string");
    const slideText = extractTextFromSlideXml(xml);

    if (slideText) {
      slideEntries.push({
        number: match[1],
        text: slideText,
      });
    }
  }

  if (slideEntries.length === 0) {
    return "";
  }

  return sortSlideEntries(slideEntries)
    .map((slide, index) => `Slide ${index + 1}:\n${slide.text}`)
    .join("\n\n");
};
