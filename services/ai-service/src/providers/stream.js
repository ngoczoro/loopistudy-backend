/** Complete lines from a fetch body (Ollama NDJSON, OpenAI SSE), as in the backend. */
export async function* readLines(body) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield line;
    }
  }
  const rest = buffer.trim();
  if (rest) yield rest;
}

/**
 * A signal for a streamed provider call: aborts when no first token arrives within
 * `firstTokenMs`, or when `outer` aborts (the backend went away). After the first token only
 * `outer` can abort it; the backend watches the gaps between tokens itself.
 */
export const firstTokenSignal = (firstTokenMs, outer) => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, firstTokenMs);
  const onOuter = () => controller.abort();
  if (outer?.aborted) onOuter();
  outer?.addEventListener("abort", onOuter, { once: true });

  return {
    signal: controller.signal,
    gotToken: () => clearTimeout(timer),
    timedOut: () => timedOut,
    stop: () => {
      clearTimeout(timer);
      outer?.removeEventListener("abort", onOuter);
    },
  };
};
