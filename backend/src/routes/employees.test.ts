import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createUser, signToken } from "../auth.js";
import { app } from "../index.js";

describe("Employees routes", () => {
  let ownerToken: string;
  let otherCompanyToken: string;
  let userToken: string;
  let companyId: string;
  let directionId: string;

  beforeAll(async () => {
    const owner = createUser("emp-owner@test.co", "123", "Owner", "COMPANY");
    ownerToken = signToken(owner);
    const other = createUser("emp-other@test.co", "123", "Other", "COMPANY");
    otherCompanyToken = signToken(other);
    const user = createUser("emp-user@test.co", "123", "User", "USER");
    userToken = signToken(user);

    const companyRes = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Employees Co" });
    companyId = companyRes.body.id;

    const directionRes = await request(app)
      .post(`/companies/${companyId}/directions`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Therapy" });
    directionId = directionRes.body.id;
  });

  it("GET list returns 401 without token", async () => {
    const res = await request(app).get(`/companies/${companyId}/employees`);
    expect(res.status).toBe(401);
  });

  it("GET list returns 403 for non-owner", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${otherCompanyToken}`);
    expect(res.status).toBe(403);
  });

  it("POST returns 403 for USER", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Employee" });
    expect(res.status).toBe(403);
  });

  it("POST creates employee with directions", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Alice", description: "Senior specialist", directionIds: [directionId] });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Alice");
    expect(res.body.directionIds).toEqual([directionId]);
  });

  it("GET list returns created employees", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((row: { name: string }) => row.name === "Alice")).toBe(true);
  });

  it("PATCH updates employee", async () => {
    const create = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Bob" });
    const employeeId = create.body.id;
    const patch = await request(app)
      .patch(`/companies/${companyId}/employees/${employeeId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Bob Updated", directionIds: [directionId] });
    expect(patch.status).toBe(200);
    expect(patch.body.name).toBe("Bob Updated");
    expect(patch.body.directionIds).toEqual([directionId]);
  });

  it("DELETE removes employee", async () => {
    const create = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "To Delete" });
    const employeeId = create.body.id;
    const del = await request(app)
      .delete(`/companies/${companyId}/employees/${employeeId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(del.status).toBe(204);
  });

  it("DELETE keeps future slots but clears employee assignment by default", async () => {
    const create = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Busy Employee" });
    const employeeId = create.body.id;
    const slot = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        startAt: new Date(Date.now() + 3600000).toISOString(),
        endAt: new Date(Date.now() + 7200000).toISOString(),
        capacity: 1,
        employeeId,
      });
    const del = await request(app)
      .delete(`/companies/${companyId}/employees/${employeeId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(del.status).toBe(204);

    const slotRes = await request(app).get(`/slots/${slot.body.id}`);
    expect(slotRes.status).toBe(200);
    expect(slotRes.body.employeeId).toBeUndefined();
  });

  it("DELETE keeps deleted employee on past slots for history", async () => {
    const create = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Past Employee" });
    const employeeId = create.body.id;
    const pastStart = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const pastEnd = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    await request(app)
      .patch(`/companies/${companyId}/employees/${employeeId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ description: "Was active" });

    const slotId = `past-slot-${employeeId}`;
    const { db } = await import("../db.js");
    db.prepare(
      "INSERT INTO slots (id, company_id, employee_id, start_at, end_at, capacity, status, title) VALUES (?, ?, ?, ?, ?, ?, 'CLOSED', ?)"
    ).run(slotId, companyId, employeeId, pastStart, pastEnd, 1, "Past Visit");

    const del = await request(app)
      .delete(`/companies/${companyId}/employees/${employeeId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(del.status).toBe(204);

    const slotRes = await request(app).get(`/slots/${slotId}`);
    expect(slotRes.status).toBe(200);
    expect(slotRes.body.employeeId).toBe(employeeId);
    expect(slotRes.body.employee.name).toBe("Past Employee");
  });

  it("DELETE removes employee with future slots when confirmed by query param", async () => {
    const create = await request(app)
      .post(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Delete With Slots" });
    const employeeId = create.body.id;
    const slot = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        startAt: new Date(Date.now() + 3600000).toISOString(),
        endAt: new Date(Date.now() + 7200000).toISOString(),
        capacity: 1,
        employeeId,
      });
    const bookingUser = createUser(`emp-book-user-${employeeId}@test.co`, "123", "Booker", "USER");
    const bookingToken = signToken(bookingUser);
    await request(app).post(`/slots/${slot.body.id}/bookings`).set("Authorization", `Bearer ${bookingToken}`);

    const del = await request(app)
      .delete(`/companies/${companyId}/employees/${employeeId}?deleteFutureSlots=true`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(del.status).toBe(204);

    const employeeList = await request(app)
      .get(`/companies/${companyId}/employees`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(employeeList.body.some((row: { id: string }) => row.id === employeeId)).toBe(false);

    const slotRes = await request(app).get(`/slots/${slot.body.id}`);
    expect(slotRes.status).toBe(404);
  });
});
