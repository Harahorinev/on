import { describe, it, expect, beforeEach, vi } from "vitest";
import { isEmailConfigured, sendEmail } from "./notification.js";

describe("notification", () => {
  const origEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...origEnv };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  it("isEmailConfigured is false when SMTP env not set", async () => {
    const { isEmailConfigured: check } = await import("./notification.js");
    expect(check()).toBe(false);
  });

  it("sendEmail returns false when not configured", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      text: "Body",
    });
    expect(result).toBe(false);
  });
});
