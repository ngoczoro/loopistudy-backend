import { describe, expect, it } from "@jest/globals";
import { respondWithProgress } from "./progressResponse.js";

const fakeRes = () => {
  const res = { chunks: [], headers: {}, writableEnded: false };
  res.status = (code) => ((res.statusCode = code), res);
  res.set = (headers) => (Object.assign(res.headers, headers), res);
  res.json = (body) => ((res.body = body), res);
  res.flushHeaders = () => {};
  res.on = () => {};
  res.write = (chunk) => res.chunks.push(chunk);
  res.end = () => (res.writableEnded = true);
  return res;
};
const events = (res) =>
  res.chunks.map((chunk) => {
    const [, name, data] = chunk.match(/^event: (.+)\ndata: (.*)\n\n$/);
    return [name, JSON.parse(data)];
  });

describe("respondWithProgress", () => {
  it("answers plain JSON when the client did not ask for a stream", async () => {
    const res = fakeRes();
    await respondWithProgress({ headers: {} }, res, {
      status: 201,
      message: "ok",
      run: async (onProgress) => {
        onProgress({ stage: "prepared" });
        return { id: 1 };
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, message: "ok", data: { id: 1 } });
    expect(res.chunks).toEqual([]);
  });

  it("streams progress then the result when asked", async () => {
    const res = fakeRes();
    await respondWithProgress({ headers: { accept: "text/event-stream" } }, res, {
      message: "ok",
      run: async (onProgress) => {
        onProgress({ stage: "prepared", ready: 3, total: 5 });
        return { id: 1 };
      },
    });
    expect(res.headers["Content-Type"]).toContain("text/event-stream");
    expect(events(res)).toEqual([
      ["progress", { stage: "prepared", ready: 3, total: 5 }],
      ["done", { success: true, message: "ok", data: { id: 1 } }],
    ]);
  });

  it("streams a client error with its status, and hides server errors", async () => {
    const res = fakeRes();
    await respondWithProgress({ headers: { accept: "text/event-stream" } }, res, {
      message: "ok",
      run: async () => {
        throw Object.assign(new Error("Need at least 4 distinct facts"), { statusCode: 400 });
      },
    });
    expect(events(res)).toEqual([["error", { status: 400, message: "Need at least 4 distinct facts" }]]);
  });
});
