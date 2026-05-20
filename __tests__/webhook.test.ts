import { describe, it, expect } from "@jest/globals";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "../src/webhook.js";

function makeHeader(rawBody: string, secret: string, tsOverride?: number): string {
  const ts = tsOverride ?? Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`)
    .digest("hex");
  return `t=${ts},s=${sig}`;
}

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret";
  const body = JSON.stringify({ event: "transaction.approved" });

  it("retourne true pour une signature valide", () => {
    const header = makeHeader(body, secret);
    expect(verifyWebhookSignature(body, header, secret)).toBe(true);
  });

  it("retourne false si la signature est incorrecte", () => {
    const header = makeHeader(body, "mauvais-secret");
    expect(verifyWebhookSignature(body, header, secret)).toBe(false);
  });

  it("retourne false si le timestamp est trop vieux", () => {
    const oldTs = Math.floor(Date.now() / 1000) - 400;
    const header = makeHeader(body, secret, oldTs);
    expect(verifyWebhookSignature(body, header, secret)).toBe(false);
  });

  it("retourne false si l'en-tête est malformé", () => {
    expect(verifyWebhookSignature(body, "invalid-header", secret)).toBe(false);
  });

  it("retourne false si le corps a été modifié", () => {
    const header = makeHeader(body, secret);
    expect(verifyWebhookSignature(body + "tampered", header, secret)).toBe(false);
  });
});
