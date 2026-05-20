import { describe, it, expect } from "@jest/globals";
import { FedaPayClient } from "../src/client.js";

describe("FedaPayClient", () => {
  it("lève une erreur si secretKey est absent", () => {
    expect(
      () => new FedaPayClient({ secretKey: "" }),
    ).toThrow("secretKey is required");
  });

  it("lève une erreur si verifyWebhookSignature est appelé sans webhookSecret", () => {
    const client = new FedaPayClient({ secretKey: "sk_test_123" });
    expect(() => client.verifyWebhookSignature("body", "t=1,s=abc")).toThrow(
      "webhookSecret is required",
    );
  });

  it("instancie correctement en mode sandbox (défaut)", () => {
    expect(
      () => new FedaPayClient({ secretKey: "sk_test_123" }),
    ).not.toThrow();
  });

  it("instancie correctement en mode live", () => {
    expect(
      () =>
        new FedaPayClient({ secretKey: "sk_live_123", environment: "live" }),
    ).not.toThrow();
  });
});
