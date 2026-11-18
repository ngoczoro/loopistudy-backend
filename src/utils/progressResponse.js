import { buildSuccessResponse } from "./response.js";

const wantsEventStream = (req) => String(req.headers.accept ?? "").includes("text/event-stream");

/**
 * Run a slow generation (quiz, flashcards) and answer with its result.
 * Clients sending `Accept: text/event-stream` get Server-Sent Events:
 *   progress  { stage, ready?, total?, current?, limit? }  while it runs
 *   done      the usual success envelope { success, message, data }
 *   error     { status, message }
 * Every other client gets the plain JSON response exactly as before (errors go to the error
 * middleware). `run(onProgress)` does the work and resolves with the response data.
 */
export const respondWithProgress = async (req, res, { status = 200, message, run }) => {
  if (!wantsEventStream(req)) {
    const data = await run(() => {});
    res.status(status).json(buildSuccessResponse(message, data));
    return;
  }

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  // Generation keeps going if the user closes the page (a quiz is still saved); just stop writing.
  let open = true;
  res.on("close", () => {
    open = false;
  });
  const emit = (event, data) => {
    if (open && !res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const data = await run((progress) => emit("progress", progress));
    emit("done", buildSuccessResponse(message, data));
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) console.error("Generation failed:", error);
    emit("error", {
      status: statusCode,
      message: statusCode < 500 ? error.message : "Something went wrong. Please try again.",
    });
  } finally {
    res.end();
  }
};
