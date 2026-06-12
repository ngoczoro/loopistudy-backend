import JSZip from "jszip";
import ApiError from "../../../utils/ApiError.js";

const SLIDE_PATH_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/i;

/** Extract visible text runs from OpenXML slide markup. */
export const extractTextFromSlideXml = (xml = "") => {
  const tokenPattern = /<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>|<a:br\b[^>]*\/?>/g;
  let result = "";

  for (const match of xml.matchAll(tokenPattern)) {
    if (match[0].startsWith("<a:br")) {
      if (result && !result.endsWith("\n")) {
        result += "\n";
      }
      continue;
    }

    const value = match[1]?.trim();
    if (!value) continue;

    if (result && !result.endsWith("\n") && !result.endsWith(" ")) {
      result += " ";
    }
    result += value;
  }

  return result.replace(/[ \t]+/g, " ").trim();
};

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
