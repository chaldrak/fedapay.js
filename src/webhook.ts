import { createHmac, timingSafeEqual } from "node:crypto";

const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Vérifie la signature du webhook FedaPay sans instancier un client.
 * Format de l'en-tête : "t=<timestamp>,s=<hex>"
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string,
  webhookSecret: string,
): boolean {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((part) => part.split("=", 2) as [string, string]),
    );
    const timestamp = parts["t"];
    const sig = parts["s"];
    if (!timestamp || !sig) return false;

    const ts = parseInt(timestamp, 10);
    if (Number.isNaN(ts)) return false;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > WEBHOOK_TOLERANCE_SECONDS) return false;

    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("hex");

    return timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}
