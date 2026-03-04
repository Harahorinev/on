import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { createUser, signToken } from "../auth.js";

describe("GET /companies/:companyId/directions", () => {
  it("returns 404 when company not found", async () => {
    const res = await request(app).get("/companies/unknown-company-id/directions");
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Company not found/i);
  });
});

describe("POST /companies/:companyId/directions", () => {
  let companyToken: string;
  let companyId: string;
  let userToken: string;

  beforeAll(async () => {
    const company = createUser("dir-company@test.co", "123", "Co", "COMPANY");
    companyToken = signToken(company);
    const user = createUser("dir-user@test.co", "123", "User", "USER");
    userToken = signToken(user);
    const create = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Directions Company" });
    companyId = create.body.id;
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/directions`)
      .send({ name: "Dir" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when USER creates direction", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/directions`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Dir" });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/COMPANY/);
  });

  it("returns 400 when name missing", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/directions`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/);
  });

  it("returns 201 and direction when valid", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/directions`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Massage", description: "Relax", sortOrder: 1 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe("Massage");
    expect(res.body.companyId).toBe(companyId);
  });
});

describe("GET /companies/:companyId/directions and GET /:directionId", () => {
  let companyId: string;
  let directionId: string;

  beforeAll(async () => {
    const company = createUser("dir-get-company@test.co", "123", "Co", "COMPANY");
    const token = signToken(company);
    const createCo = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dir Get Company" });
    companyId = createCo.body.id;
    const createDir = await request(app)
      .post(`/companies/${companyId}/directions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Therapy" });
    directionId = createDir.body.id;
  });

  it("GET list returns 200 and array", async () => {
    const res = await request(app).get(`/companies/${companyId}/directions`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d: { id: string }) => d.id === directionId)).toBe(true);
  });

  it("GET /:directionId returns 200", async () => {
    const res = await request(app).get(`/companies/${companyId}/directions/${directionId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Therapy");
  });

  it("GET /:directionId returns 404 for unknown id", async () => {
    const res = await request(app).get(`/companies/${companyId}/directions/unknown-dir-id`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Direction not found/i);
  });
});

describe("PATCH and DELETE /companies/:companyId/directions/:directionId", () => {
  let companyToken: string;
  let companyId: string;
  let directionId: string;
  let otherToken: string;

  beforeAll(async () => {
    const company = createUser("dir-patch-company@test.co", "123", "Co", "COMPANY");
    companyToken = signToken(company);
    otherToken = signToken(createUser("dir-patch-other@test.co", "123", "O", "COMPANY"));
    const createCo = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Dir Patch Company" });
    companyId = createCo.body.id;
    const createDir = await request(app)
      .post(`/companies/${companyId}/directions`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Original" });
    directionId = createDir.body.id;
  });

  it("PATCH returns 403 when not company owner", async () => {
    const createOther = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Other Co" });
    const otherId = createOther.body.id;
    const dir = await request(app)
      .post(`/companies/${otherId}/directions`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Other Dir" });
    const res = await request(app)
      .patch(`/companies/${otherId}/directions/${dir.body.id}`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Hacked" });
    expect(res.status).toBe(403);
  });

  it("PATCH returns 400 when name empty", async () => {
    const res = await request(app)
      .patch(`/companies/${companyId}/directions/${directionId}`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "   " });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/non-empty/);
  });

  it("PATCH returns 200 and updates", async () => {
    const res = await request(app)
      .patch(`/companies/${companyId}/directions/${directionId}`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Updated Name", sortOrder: 2 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.sortOrder).toBe(2);
  });

  it("DELETE returns 204", async () => {
    const createDir = await request(app)
      .post(`/companies/${companyId}/directions`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "To Delete" });
    const res = await request(app)
      .delete(`/companies/${companyId}/directions/${createDir.body.id}`)
      .set("Authorization", `Bearer ${companyToken}`);
    expect(res.status).toBe(204);
  });

  it("DELETE returns 404 for unknown direction", async () => {
    const res = await request(app)
      .delete(`/companies/${companyId}/directions/unknown-dir-id`)
      .set("Authorization", `Bearer ${companyToken}`);
    expect(res.status).toBe(404);
  });
});
