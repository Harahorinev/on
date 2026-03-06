import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { createUser, signToken } from "../auth.js";

describe("GET /user/events", () => {
  let userToken: string;
  let companyToken: string;

  beforeAll(() => {
    userToken = signToken(createUser("events-get-user@test.co", "123", "User", "USER"));
    companyToken = signToken(createUser("events-get-company@test.co", "123", "Co", "COMPANY"));
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/user/events");
    expect(res.status).toBe(401);
  });

  it("returns 403 when COMPANY role", async () => {
    const res = await request(app)
      .get("/user/events")
      .set("Authorization", `Bearer ${companyToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/USER|рол|события/);
  });

  it("returns 200 and empty array when no events", async () => {
    const res = await request(app)
      .get("/user/events")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /user/events", () => {
  let userToken: string;
  let companyToken: string;

  beforeAll(() => {
    userToken = signToken(createUser("events-post-user@test.co", "123", "User", "USER"));
    companyToken = signToken(createUser("events-post-company@test.co", "123", "Co", "COMPANY"));
  });

  const start = new Date(Date.now() + 3600000).toISOString();
  const end = new Date(Date.now() + 7200000).toISOString();

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/user/events")
      .send({ title: "E", startAt: start, endAt: end });
    expect(res.status).toBe(401);
  });

  it("returns 403 when COMPANY role", async () => {
    const res = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ title: "E", startAt: start, endAt: end });
    expect(res.status).toBe(403);
  });

  it("returns 400 when title missing", async () => {
    const res = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ startAt: start, endAt: end });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/название|Укажите/);
  });

  it("returns 400 when startAt or endAt missing", async () => {
    const res = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "E" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/начало|конец|Укажите/);
  });

  it("returns 400 when endAt not after startAt", async () => {
    const res = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "E", startAt: end, endAt: start });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/позже|окончания|начала/);
  });

  it("returns 201 and event when valid", async () => {
    const res = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "Meeting", description: "Team sync", startAt: start, endAt: end });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.title).toBe("Meeting");
    expect(res.body.startAt).toBe(start);
  });
});

describe("GET /user/events/:id", () => {
  let userToken: string;
  let otherUserToken: string;
  let eventId: string;

  beforeAll(async () => {
    userToken = signToken(createUser("events-getid-user@test.co", "123", "User", "USER"));
    otherUserToken = signToken(createUser("events-getid-other@test.co", "123", "Other", "USER"));
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const create = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "Private", startAt: start, endAt: end });
    eventId = create.body.id;
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get(`/user/events/${eventId}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .get("/user/events/unknown-event-id")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Событие|найдено|Не найдено/);
  });

  it("returns 403 when other user's event", async () => {
    const res = await request(app)
      .get(`/user/events/${eventId}`)
      .set("Authorization", `Bearer ${otherUserToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 200 and event for owner", async () => {
    const res = await request(app)
      .get(`/user/events/${eventId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(eventId);
    expect(res.body.title).toBe("Private");
  });
});

describe("PATCH and DELETE /user/events/:id", () => {
  let userToken: string;
  let otherUserToken: string;
  let eventId: string;

  beforeAll(async () => {
    userToken = signToken(createUser("events-patch-user@test.co", "123", "User", "USER"));
    otherUserToken = signToken(createUser("events-patch-other@test.co", "123", "Other", "USER"));
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const create = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "To Update", startAt: start, endAt: end });
    eventId = create.body.id;
  });

  it("PATCH returns 403 when other user", async () => {
    const res = await request(app)
      .patch(`/user/events/${eventId}`)
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({ title: "Hacked" });
    expect(res.status).toBe(403);
  });

  it("PATCH returns 400 when title empty", async () => {
    const res = await request(app)
      .patch(`/user/events/${eventId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "   " });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/пуст|название/);
  });

  it("PATCH returns 200 and updates", async () => {
    const res = await request(app)
      .patch(`/user/events/${eventId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "Updated Title" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Title");
  });

  it("DELETE returns 403 when other user", async () => {
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const create = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "To Delete", startAt: start, endAt: end });
    const res = await request(app)
      .delete(`/user/events/${create.body.id}`)
      .set("Authorization", `Bearer ${otherUserToken}`);
    expect(res.status).toBe(403);
  });

  it("DELETE returns 204 for owner", async () => {
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const create = await request(app)
      .post("/user/events")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "To Delete", startAt: start, endAt: end });
    const res = await request(app)
      .delete(`/user/events/${create.body.id}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(204);
  });

  it("DELETE returns 404 for unknown id", async () => {
    const res = await request(app)
      .delete("/user/events/unknown-event-id")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(404);
  });
});
