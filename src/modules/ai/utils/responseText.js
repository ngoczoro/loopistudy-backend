export const extractResponseText = (response) => {
  if (response?.output_text) {
    return response.output_text;
  }

  const chunks = [];

  for (const output of response?.output ?? []) {
    if (output.type !== "message") continue;

    for (const content of output.content ?? []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("");
};
