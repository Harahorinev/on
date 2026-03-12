import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./index.js";

describe("GET /health", () => {
  it("returns db and monitoring snapshot", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db?.ok).toBe(true);
    expect(res.body.monitoring).toBeTruthy();
    expect(typeof res.body.monitoring.uptimeSec).toBe("number");
    expect(res.body.monitoring.notifications).toBeTruthy();
    expect(res.body.monitoring.reminderScheduler).toBeTruthy();
  });
});
