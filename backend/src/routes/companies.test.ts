import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { createUser, signToken } from "../auth.js";

describe("GET /companies", () => {
  it("returns 200 and empty array when no companies", async () => {
    const res = await request(app).get("/companies");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /companies/me", () => {
  let userToken: string;
  let companyToken: string;

  beforeAll(() => {
    const user = createUser("comp-me-user@test.co", "123", "U", "USER");
    userToken = signToken(user);
    const company = createUser("comp-me-company@test.co", "123", "C", "COMPANY");
    companyToken = signToken(company);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/companies/me");
    expect(res.status).toBe(401);
  });

  it("returns 404 when USER has no company", async () => {
    const res = await request(app)
      .get("/companies/me")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Компания|найдена|Не найдено/);
  });

  it("returns 200 when COMPANY has company", async () => {
    await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "My Company", timezone: "Europe/Moscow" });
    const res = await request(app)
      .get("/companies/me")
      .set("Authorization", `Bearer ${companyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("My Company");
    expect(res.body.owner).toBeTruthy();
  });
});

describe("GET /companies/:id", () => {
  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/companies/unknown-id-123");
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Компания|найдена|Не найдено/);
  });
});

describe("POST /companies", () => {
  let userToken: string;
  let companyToken: string;

  beforeAll(() => {
    const user = createUser("comp-post-user@test.co", "123", "U", "USER");
    userToken = signToken(user);
    const company = createUser("comp-post-company@test.co", "123", "C", "COMPANY");
    companyToken = signToken(company);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/companies").send({ name: "X" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when USER creates company", async () => {
    const res = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "X" });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/COMPANY|рол|создавать/);
  });

  it("returns 400 when name missing", async () => {
    const res = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/название|Укажите|Имя/);
  });

  it("returns 400 when name too long", async () => {
    const longName = "x".repeat(501);
    const res = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: longName });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/500|символ|Название/);
  });

  it("returns 201 and company when valid", async () => {
    const res = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "New Co", description: "Desc", timezone: "UTC" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe("New Co");
    expect(res.body.timezone).toBe("UTC");
  });

  it("returns 400 when COMPANY already has a company", async () => {
    const res = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Second Co" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/уже|есть компания/);
  });
});

describe("GET /companies/:id and PATCH /companies/:id", () => {
  let companyToken: string;
  let companyId: string;
  let otherToken: string;

  beforeAll(async () => {
    const company = createUser("comp-patch-owner@test.co", "123", "Owner", "COMPANY");
    companyToken = signToken(company);
    const other = createUser("comp-patch-other@test.co", "123", "Other", "COMPANY");
    otherToken = signToken(other);
    const create = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Patchable Co" });
    companyId = create.body.id;
  });

  it("GET /companies/:id returns 200 and company", async () => {
    const res = await request(app).get(`/companies/${companyId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Patchable Co");
  });

  it("PATCH returns 401 without token", async () => {
    const res = await request(app).patch(`/companies/${companyId}`).send({ name: "X" });
    expect(res.status).toBe(401);
  });

  it("PATCH returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch("/companies/unknown-id")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });

  it("PATCH returns 403 when not owner", async () => {
    const res = await request(app)
      .patch(`/companies/${companyId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Hacked" });
    expect(res.status).toBe(403);
  });

  it("PATCH returns 200 and updates company", async () => {
    const res = await request(app)
      .patch(`/companies/${companyId}`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Updated Name", description: "New desc" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.description).toBe("New desc");
  });
});
