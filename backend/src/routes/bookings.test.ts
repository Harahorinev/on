import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { createUser, signToken } from "../auth.js";

describe("GET /bookings/me", () => {
  let userToken: string;

  beforeAll(() => {
    const user = createUser("book-me-user@test.co", "123", "User", "USER");
    userToken = signToken(user);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/bookings/me");
    expect(res.status).toBe(401);
  });

  it("returns 200 and empty array when no bookings", async () => {
    const res = await request(app)
      .get("/bookings/me")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /slots/:slotId/bookings", () => {
  let userToken: string;
  let companyToken: string;
  let slotId: string;

  beforeAll(async () => {
    const user = createUser("book-post-user@test.co", "123", "User", "USER");
    userToken = signToken(user);
    const company = createUser("book-post-company@test.co", "123", "Co", "COMPANY");
    companyToken = signToken(company);
    const createCo = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Bookings Company" });
    const companyId = createCo.body.id;
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const slot = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ startAt: start, endAt: end, capacity: 2 });
    slotId = slot.body.id;
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post(`/slots/${slotId}/bookings`);
    expect(res.status).toBe(401);
  });

  it("returns 403 when COMPANY creates booking", async () => {
    const res = await request(app)
      .post(`/slots/${slotId}/bookings`)
      .set("Authorization", `Bearer ${companyToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/USER/);
  });

  it("returns 404 for unknown slot", async () => {
    const res = await request(app)
      .post("/slots/unknown-slot-id/bookings")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Slot not found/i);
  });

  it("returns 201 and booking when valid", async () => {
    const res = await request(app)
      .post(`/slots/${slotId}/bookings`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.slotId).toBe(slotId);
    expect(res.body.userId).toBeTruthy();
    expect(res.body.status).toBe("CONFIRMED");
  });

  it("returns 409 when already booked", async () => {
    const res = await request(app)
      .post(`/slots/${slotId}/bookings`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already|booked/i);
  });
});

describe("GET /bookings/:id and DELETE /bookings/:id", () => {
  let userToken: string;
  let otherUserToken: string;
  let bookingId: string;

  beforeAll(async () => {
    const user = createUser("book-get-user@test.co", "123", "User", "USER");
    userToken = signToken(user);
    const other = createUser("book-get-other@test.co", "123", "Other", "USER");
    otherUserToken = signToken(other);
    const company = createUser("book-get-company@test.co", "123", "Co", "COMPANY");
    const companyToken = signToken(company);
    const createCo = await request(app)
      .post("/companies")
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ name: "Book Get Company" });
    const companyId = createCo.body.id;
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const slot = await request(app)
      .post(`/companies/${companyId}/slots`)
      .set("Authorization", `Bearer ${companyToken}`)
      .send({ startAt: start, endAt: end, capacity: 2 });
    const book = await request(app)
      .post(`/slots/${slot.body.id}/bookings`)
      .set("Authorization", `Bearer ${userToken}`);
    bookingId = book.body.id;
  });

  it("GET returns 401 without token", async () => {
    const res = await request(app).get(`/bookings/${bookingId}`);
    expect(res.status).toBe(401);
  });

  it("GET returns 404 for unknown booking", async () => {
    const res = await request(app)
      .get("/bookings/unknown-booking-id")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(404);
  });

  it("GET returns 403 when other user", async () => {
    const res = await request(app)
      .get(`/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${otherUserToken}`);
    expect(res.status).toBe(403);
  });

  it("GET returns 200 and booking for owner", async () => {
    const res = await request(app)
      .get(`/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(bookingId);
  });

  it("DELETE returns 403 when other user", async () => {
    const res = await request(app)
      .delete(`/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${otherUserToken}`);
    expect(res.status).toBe(403);
  });

  it("DELETE returns 200 and cancels booking", async () => {
    const res = await request(app)
      .delete(`/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
  });
});
