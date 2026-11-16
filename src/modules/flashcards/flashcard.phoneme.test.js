import { describe, expect, it } from "@jest/globals";
import { arpabetToIpa, ipaToEspeak, normalizePronunciationText } from "./flashcard.phoneme.js";
import { lookupPronunciations } from "./flashcard.lexicon.js";

describe("arpabetToIpa", () => {
  it("marks stress and splits syllables", () => {
    expect(arpabetToIpa("AE1 P AH0 L")).toBe("/ˈæ.pəl/");
    expect(arpabetToIpa("K AH0 M P Y UW1 T ER0")).toBe("/kəm.ˈpjuː.tɚ/");
    expect(arpabetToIpa("HH AH0 L OW1")).toBe("/hə.ˈloʊ/");
    expect(arpabetToIpa("B UH1 K")).toBe("/ˈbʊk/");
    expect(arpabetToIpa("R EH1 D")).toBe("/ˈrɛd/");
    expect(arpabetToIpa("R IY1 D")).toBe("/ˈriːd/");
  });
});

describe("ipaToEspeak", () => {
  it("turns learner IPA into eSpeak phonemes", () => {
    expect(ipaToEspeak("/ˈæ.pəl/")).toBe("'ap@l");
    expect(ipaToEspeak("/kəm.ˈpjuː.tɚ/")).toBe("k@m'pju:t3");
    expect(ipaToEspeak("/hə.ˈloʊ/")).toBe("h@'loU");
    expect(ipaToEspeak("/ˈrɛd/")).toBe("'rEd");
    expect(ipaToEspeak("/ˈriːd/")).toBe("'ri:d");
  });
});

describe("normalizePronunciationText", () => {
  it("keeps a short english phrase and drops everything else", () => {
    expect(normalizePronunciationText("  Apple! ")).toBe("apple");
    expect(normalizePronunciationText("ice cream")).toBe("ice cream");
    expect(normalizePronunciationText("one two three four five")).toBeNull();
    expect(normalizePronunciationText("xin chào")).toBeNull();
  });
});

describe("lookupPronunciations", () => {
  it("reads the bundled CMU dictionary", () => {
    expect(lookupPronunciations("apple")).toEqual(["/ˈæ.pəl/"]);
    expect(lookupPronunciations("read")).toEqual(["/ˈrɛd/", "/ˈriːd/"]);
    expect(lookupPronunciations("notawordzz")).toEqual([]);
  });
});
