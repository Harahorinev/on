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

describe("GET /companies/:id/export", () => {
  let ownerToken: string;
  let otherToken: string;
  let companyId: string;
  let slotId: string;

  beforeAll(async () => {
    const owner = createUser("comp-export-owner@test.co", "123", "Owner", "COMPANY");
    ownerToken = signToken(owner);
    const other = createUser("comp-export-other@test.co", "123", "Other", "COMPANY");
    otherToken = signToken(other);
    const create = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Export Co" });
    companyId = create.body.id;

    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const slotRes = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ startAt: start, endAt: end, capacity: 3, title: "Consultation", location: "Room 1" });
    slotId = slotRes.body.id;
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get(`/companies/${companyId}/export?format=csv`);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-owner", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/export?format=csv`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 400 for unknown format", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/export?format=pdf`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(400);
  });

  it("returns CSV export", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/export?format=csv`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("slot_id,start_at,end_at,status,capacity,title,location,confirmed_bookings,cancelled_bookings");
    expect(res.text).toContain(slotId);
  });

  it("returns iCal export", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/export?format=ical`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/calendar");
    expect(res.text).toContain("BEGIN:VCALENDAR");
    expect(res.text).toContain("BEGIN:VEVENT");
    expect(res.text).toContain(`UID:${slotId}@on`);
  });
});

describe("GET /companies/:id/bookings", () => {
  let ownerToken: string;
  let otherCompanyToken: string;
  let userToken: string;
  let companyId: string;

  beforeAll(async () => {
    const owner = createUser("comp-bookings-owner@test.co", "123", "Owner", "COMPANY");
    ownerToken = signToken(owner);
    const otherCompany = createUser("comp-bookings-other@test.co", "123", "Other", "COMPANY");
    otherCompanyToken = signToken(otherCompany);
    const bookingUser = createUser("comp-bookings-user@test.co", "123", "User", "USER");
    userToken = signToken(bookingUser);

    const companyRes = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Bookings Co" });
    companyId = companyRes.body.id;

    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const slotRes = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ startAt: start, endAt: end, capacity: 2, title: "Visit" });

    await request(app)
      .post(`/slots/${slotRes.body.id}/bookings`)
      .set("Authorization", `Bearer ${userToken}`);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get(`/companies/${companyId}/bookings`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown company", async () => {
    const res = await request(app)
      .get("/companies/unknown-company-id/bookings")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owner", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/bookings`)
      .set("Authorization", `Bearer ${otherCompanyToken}`);
    expect(res.status).toBe(403);
  });

  it("returns bookings with user and slot info for owner", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/bookings`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({
      id: expect.any(String),
      slotId: expect.any(String),
      userId: expect.any(String),
      status: "CONFIRMED",
      user: { id: expect.any(String), email: expect.any(String), name: expect.any(String) },
      slot: { id: expect.any(String), startAt: expect.any(String), endAt: expect.any(String) },
    });
  });
});
