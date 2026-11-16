const VOWELS = {
  AA: "ɑ",
  AE: "æ",
  AH: "ʌ",
  AO: "ɔ",
  AW: "aʊ",
  AY: "aɪ",
  EH: "ɛ",
  ER: "ɝ",
  EY: "eɪ",
  IH: "ɪ",
  IY: "iː",
  OW: "oʊ",
  OY: "ɔɪ",
  UH: "ʊ",
  UW: "uː",
};

const CONSONANTS = {
  B: "b",
  CH: "tʃ",
  D: "d",
  DH: "ð",
  F: "f",
  G: "g",
  HH: "h",
  JH: "dʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  P: "p",
  R: "r",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",
};

const ONSETS = new Set([
  "p", "b", "t", "d", "k", "g", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h", "m", "n", "l", "r", "w", "j",
  "pr", "br", "tr", "dr", "kr", "gr", "fr", "θr", "ʃr",
  "pl", "bl", "kl", "gl", "fl", "sl",
  "sp", "st", "sk", "sm", "sn", "sw", "tw", "dw", "kw", "gw",
  "pj", "bj", "tj", "dj", "kj", "gj", "fj", "mj", "nj", "lj",
  "spr", "str", "skr", "spl", "skw",
]);

const ESPEAK_REPLACEMENTS = [
  ["tʃ", "tS"],
  ["dʒ", "dZ"],
  ["aɪ", "aI"],
  ["aʊ", "aU"],
  ["eɪ", "eI"],
  ["oʊ", "oU"],
  ["ɔɪ", "OI"],
  ["iː", "i:"],
  ["uː", "u:"],
  ["ɑː", "A:"],
  ["ɔː", "O:"],
  ["ɜː", "3:"],
  ["æ", "a"],
  ["ɑ", "A"],
  ["ʌ", "V"],
  ["ə", "@"],
  ["ɚ", "3"],
  ["ɝ", "3:"],
  ["ɔ", "O"],
  ["ɛ", "E"],
  ["ɪ", "I"],
  ["ʊ", "U"],
  ["ð", "D"],
  ["θ", "T"],
  ["ʃ", "S"],
  ["ʒ", "Z"],
  ["ŋ", "N"],
  ["j", "j"],
  ["ˈ", "'"],
  ["ˌ", ","],
  [".", ""],
  ["/", ""],
];

const parsePhone = (token) => {
  const match = String(token).match(/^([A-Z]+)([012])?$/);
  if (!match) return null;
  const [, base, stressDigit] = match;
  const stress = stressDigit ? Number(stressDigit) : null;
  if (VOWELS[base]) {
    let ipa = VOWELS[base];
    if (base === "AH" && stress === 0) ipa = "ə";
    if (base === "ER" && stress === 0) ipa = "ɚ";
    if (base === "ER" && stress !== 0) ipa = "ɝ";
    return { ipa, stress: stress ?? 0, vowel: true };
  }
  if (CONSONANTS[base]) {
    return { ipa: CONSONANTS[base], stress: null, vowel: false };
  }
  return null;
};

const syllabify = (phones) => {
  const nuclei = [];
  phones.forEach((phone, index) => {
    if (phone.vowel) nuclei.push(index);
  });
  if (nuclei.length === 0) return [];

  const syllables = nuclei.map(() => []);
  for (let index = 0; index < nuclei[0]; index += 1) {
    syllables[0].push(phones[index]);
  }

  for (let syllable = 0; syllable < nuclei.length; syllable += 1) {
    syllables[syllable].push(phones[nuclei[syllable]]);
    const end = syllable + 1 < nuclei.length ? nuclei[syllable + 1] : phones.length;
    const between = phones.slice(nuclei[syllable] + 1, end);
    if (syllable === nuclei.length - 1) {
      syllables[syllable].push(...between);
      continue;
    }

    let onsetLength = 0;
    for (let size = between.length; size >= 1; size -= 1) {
      const onset = between.slice(between.length - size).map((phone) => phone.ipa).join("");
      if (ONSETS.has(onset)) {
        onsetLength = size;
        break;
      }
    }
    syllables[syllable].push(...between.slice(0, between.length - onsetLength));
    syllables[syllable + 1].push(...between.slice(between.length - onsetLength));
  }

  return syllables;
};

/** ARPABET phones ("AE1 P AH0 L") → learner IPA with syllable dots and stress. */
export const arpabetToIpa = (phoneText) => {
  const phones = String(phoneText ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parsePhone);
  if (phones.length === 0 || phones.some((phone) => !phone)) return null;

  const syllables = syllabify(phones);
  if (syllables.length === 0) return null;

  const parts = syllables.map((syllable) => {
    const stress = syllable.some((phone) => phone.stress === 1)
      ? "ˈ"
      : syllable.some((phone) => phone.stress === 2)
        ? "ˌ"
        : "";
    return `${stress}${syllable.map((phone) => phone.ipa).join("")}`;
  });

  return `/${parts.join(".")}/`;
};

/** Learner IPA → eSpeak NG phoneme string (without [[ ]]). */
export const ipaToEspeak = (ipa) => {
  const source = String(ipa ?? "");
  let cursor = 0;
  let output = "";

  while (cursor < source.length) {
    if (source[cursor] === " ") {
      output += " ";
      cursor += 1;
      continue;
    }

    const match = ESPEAK_REPLACEMENTS.find(([from]) => source.startsWith(from, cursor));
    if (match) {
      output += match[1];
      cursor += match[0].length;
      continue;
    }

    const char = source[cursor];
    if (/[a-z]/i.test(char)) output += char;
    cursor += 1;
  }

  return output.replace(/\s+/g, " ").trim();
};

export const normalizePronunciationText = (input) => {
  const raw = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’]/g, "'");
  if ([...raw].some((char) => /\p{L}/u.test(char) && !/[a-z]/.test(char))) return null;

  const text = raw
    .replace(/[^a-z'\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  const words = text.split(" ");
  if (words.length > 4) return null;
  if (words.some((word) => !/^[a-z]+(?:['-][a-z]+)*$/.test(word))) return null;
  return words.join(" ");
};
