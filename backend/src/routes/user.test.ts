import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { createUser, signToken } from "../auth.js";

describe("GET /user/preferences", () => {
  let token: string;

  beforeAll(() => {
    createUser("pref-test@example.com", "123456", "Pref User", "USER");
    const user = createUser("pref-test2@example.com", "123456", "Pref2", "USER");
    token = signToken(user);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/user/preferences");
    expect(res.status).toBe(401);
  });

  it("returns 200 and empty object when no preferences", async () => {
    const res = await request(app)
      .get("/user/preferences")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});

describe("PATCH /user/preferences", () => {
  let token: string;

  beforeAll(() => {
    const user = createUser("pref-patch@example.com", "123456", "Patch", "USER");
    token = signToken(user);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).patch("/user/preferences").send({ notifyEmail: true });
    expect(res.status).toBe(401);
  });

  it("updates and returns preferences", async () => {
    const res = await request(app)
      .patch("/user/preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({ notifyEmail: true, calendarView: "month" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ notifyEmail: true, calendarView: "month" });

    const getRes = await request(app).get("/user/preferences").set("Authorization", `Bearer ${token}`);
    expect(getRes.body).toMatchObject({ notifyEmail: true, calendarView: "month" });
  });

  it("rejects invalid calendarView", async () => {
    const res = await request(app)
      .patch("/user/preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({ calendarView: "day" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/week|month|должно/);
  });

  it("rejects invalid calendarRange", async () => {
    const res = await request(app)
      .patch("/user/preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({ calendarRange: 5 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/7|14|30/);
  });
});

describe("PATCH /user/password", () => {
  const currentPassword = "123456";
  const newPassword = "newpass123";

  it("returns 401 without token", async () => {
    const res = await request(app)
      .patch("/user/password")
      .send({ currentPassword, newPassword });
    expect(res.status).toBe(401);
  });

  it("returns 400 when current password wrong", async () => {
    const user = createUser("pwd-wrong@example.com", currentPassword, "Pwd Wrong", "USER");
    const token = signToken(user);
    const res = await request(app)
      .patch("/user/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "wrong", newPassword });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Текущий|неверен|пароль/);
  });

  it("returns 400 when new password too short", async () => {
    const user = createUser("pwd-short@example.com", currentPassword, "Pwd Short", "USER");
    const token = signToken(user);
    const res = await request(app)
      .patch("/user/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword, newPassword: "short" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6|символ|Пароль/);
  });

  it("returns 204 and changes password", async () => {
    const email = "pwd-ok@example.com";
    const user = createUser(email, currentPassword, "Pwd Ok", "USER");
    const token = signToken(user);
    const res = await request(app)
      .patch("/user/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword, newPassword });
    expect(res.status).toBe(204);

    const loginRes = await request(app).post("/auth/login").send({ email, password: newPassword });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeTruthy();
  });
});
