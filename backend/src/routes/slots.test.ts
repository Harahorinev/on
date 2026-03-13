import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { createUser, signToken } from "../auth.js";

describe("GET /slots/:id (public)", () => {
  it("returns 404 for unknown slot id", async () => {
    const res = await request(app).get("/slots/unknown-slot-id");
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Слот|найден|Не найдено/);
  });
});

describe("GET /companies/:companyId/slots", () => {
  let companyId: string;

  beforeAll(async () => {
    const company = createUser("slots-company@test.co", "123", "Slots Co", "COMPANY");
    const token = signToken(company);
    const create = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Slots Company" });
    companyId = create.body.id;
  });

  it("returns 200 and empty array when no slots", async () => {
    const res = await request(app).get(`/companies/${companyId}/slots`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /companies/:companyId/slots", () => {
  let companyToken: string;
  let companyId: string;
  let userToken: string;
  let employeeId: string;
  let otherEmployeeId: string;

  beforeAll(async () => {
    const company = createUser("slots-post-company@test.co", "123", "Co", "COMPANY");
    companyToken = signToken(company);
    const user = createUser("slots-post-user@test.co", "123", "User", "USER");
    userToken = signToken(user);
    const create = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Slots Post Company" });
    companyId = create.body.id;
    const employee = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Employee One" });
    employeeId = employee.body.id;
    const otherCompany = createUser("slots-post-other-company@test.co", "123", "Other Company", "COMPANY");
    const otherToken = signToken(otherCompany);
    const otherCompanyRes = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Other Slots Company" });
    const otherEmployee = await request(app)
      .post(`/companies/${otherCompanyRes.body.id}/employees`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Foreign Employee" });
    otherEmployeeId = otherEmployee.body.id;
  });

  const futureStart = new Date(Date.now() + 3600000).toISOString();
  const futureEnd = new Date(Date.now() + 7200000).toISOString();

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/slots`)
      .send({ startAt: futureStart, endAt: futureEnd, capacity: 1 });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown company", async () => {
    const res = await request(app)
      .post("/companies/unknown-company-id/slots")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ startAt: futureStart, endAt: futureEnd, capacity: 1 });
    expect(res.status).toBe(404);
  });

  it("returns 403 when USER creates slot", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ startAt: futureStart, endAt: futureEnd, capacity: 1 });
    expect(res.status).toBe(403);
  });

  it("returns 400 when startAt, endAt or capacity missing", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ startAt: futureStart });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Укажите|начало|конец|вместимость/);
  });

  it("returns 400 when endAt not after startAt", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ startAt: futureEnd, endAt: futureStart, capacity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/позже|окончания|начала/);
  });

  it("returns 201 and slot when valid", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({
        startAt: futureStart,
        endAt: futureEnd,
        capacity: 2,
        title: "Test Slot",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.companyId).toBe(companyId);
    expect(res.body.capacity).toBe(2);
    expect(res.body.status).toBe("OPEN");
    expect(res.body.employeeId).toBeUndefined();
  });

  it("returns 201 and assigned employee when employeeId is valid", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({
        startAt: new Date(Date.now() + 10800000).toISOString(),
        endAt: new Date(Date.now() + 14400000).toISOString(),
        capacity: 1,
        employeeId,
      });
    expect(res.status).toBe(201);
    expect(res.body.employeeId).toBe(employeeId);
    expect(res.body.employee.name).toBe("Employee One");
  });

  it("returns 400 when employee belongs to another company", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({
        startAt: new Date(Date.now() + 18000000).toISOString(),
        endAt: new Date(Date.now() + 21600000).toISOString(),
        capacity: 1,
        employeeId: otherEmployeeId,
      });
    expect(res.status).toBe(400);
  });
});

describe("GET /slots/:id and GET /companies/:companyId/slots/:slotId", () => {
  let companyId: string;
  let slotId: string;

  beforeAll(async () => {
    const company = createUser("slots-get-company@test.co", "123", "Co", "COMPANY");
    const token = signToken(company);
    const createCo = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Slots Get Company" });
    companyId = createCo.body.id;
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const createSlot = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startAt: start, endAt: end, capacity: 1 });
    slotId = createSlot.body.id;
  });

  it("GET /slots/:id returns 200 and slot", async () => {
    const res = await request(app).get(`/slots/${slotId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(slotId);
  });

  it("GET /companies/:companyId/slots/:slotId returns 200", async () => {
    const res = await request(app).get(`/companies/${companyId}/slots/${slotId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(slotId);
  });
});

describe("PATCH and DELETE /companies/:companyId/slots/:slotId", () => {
  let companyToken: string;
  let companyId: string;
  let slotId: string;
  let otherToken: string;
  let employeeId: string;

  beforeAll(async () => {
    const company = createUser("slots-patch-company@test.co", "123", "Co", "COMPANY");
    companyToken = signToken(company);
    otherToken = signToken(createUser("slots-patch-other@test.co", "123", "O", "COMPANY"));
    const createCo = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Slots Patch Company" });
    companyId = createCo.body.id;
    const employee = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Patch Employee" });
    employeeId = employee.body.id;
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const createSlot = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ startAt: start, endAt: end, capacity: 1 });
    slotId = createSlot.body.id;
  });

  it("PATCH returns 403 when not company owner", async () => {
    const createOther = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Other Co" });
    const otherId = createOther.body.id;
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const slot = await request(app)
      .post(`/companies/${otherId}/slots`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ startAt: start, endAt: end, capacity: 1 });
    const res = await request(app)
      .patch(`/companies/${otherId}/slots/${slot.body.id}`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ status: "CLOSED" });
    expect(res.status).toBe(403);
  });

  it("PATCH returns 200 and updates slot", async () => {
    const res = await request(app)
      .patch(`/companies/${companyId}/slots/${slotId}`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ title: "Updated Title", status: "CLOSED", employeeId });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Title");
    expect(res.body.status).toBe("CLOSED");
    expect(res.body.employeeId).toBe(employeeId);
  });

  it("PATCH allows unassigning employee later", async () => {
    const res = await request(app)
      .patch(`/companies/${companyId}/slots/${slotId}`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ employeeId: null });
    expect(res.status).toBe(200);
    expect(res.body.employeeId).toBeUndefined();
  });

  it("DELETE returns 204", async () => {
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const create = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ startAt: start, endAt: end, capacity: 1 });
    const res = await request(app)
      .delete(`/companies/${companyId}/slots/${create.body.id}`)
      .set("Authorization", `Bearer ${companyToken}`);
    expect(res.status).toBe(204);
  });

  it("DELETE returns 404 for unknown slot", async () => {
    const res = await request(app)
      .delete(`/companies/${companyId}/slots/unknown-slot`)
      .set("Authorization", `Bearer ${companyToken}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /companies/:companyId/slots filtering", () => {
  let companyToken: string;
  let companyId: string;
  let employeeId: string;

  beforeAll(async () => {
    const company = createUser("slots-filter-company@test.co", "123", "Filter Co", "COMPANY");
    companyToken = signToken(company);
    const createCo = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Slots Filter Company" });
    companyId = createCo.body.id;
    const employee = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Filter Employee" });
    employeeId = employee.body.id;
    await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({
        startAt: new Date(Date.now() + 3600000).toISOString(),
        endAt: new Date(Date.now() + 7200000).toISOString(),
        capacity: 1,
        title: "Assigned Slot",
        employeeId,
      });
    await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({
        startAt: new Date(Date.now() + 10800000).toISOString(),
        endAt: new Date(Date.now() + 14400000).toISOString(),
        capacity: 1,
        title: "Unassigned Slot",
      });
  });

  it("filters slots by employeeId", async () => {
    const res = await request(app).get(`/companies/${companyId}/slots?employeeId=${employeeId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Assigned Slot");
    expect(res.body[0].employeeId).toBe(employeeId);
  });
});
