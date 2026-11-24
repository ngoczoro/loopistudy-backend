import express from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildSuccessResponse } from "../../utils/response.js";
import { callsService } from "./calls.service.js";

/**
 * LiveKit signs the exact request bytes, so this route reads the raw body.
 * Mount it before `express.json()`.
 */
export const createLivekitWebhookHandler = (service = callsService) => [
  express.raw({ type: ["application/webhook+json", "application/json"], limit: "1mb" }),
  asyncHandler(async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const data = await service.receiveWebhook(rawBody, req.get("Authorization"));
    res.json(buildSuccessResponse("Webhook received", data));
  }),
];

export const LIVEKIT_WEBHOOK_PATH = "/api/v1/calls/livekit-webhook";
