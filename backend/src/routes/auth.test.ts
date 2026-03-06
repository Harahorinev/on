import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { app } from "../index.js";
import { createUser } from "../auth.js";
import { authRouter } from "./auth.js";
import { errorHandler } from "../errors.js";

describe("POST /auth/register", () => {
  it("returns 400 when body fields missing", async () => {
    const res = await request(app).post("/auth/register").send({ email: "a@b.co" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Укажите|обязательн/);
  });

  it("returns 400 when role invalid", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "r1@test.co", password: "123456", name: "U", role: "ADMIN" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/USER|COMPANY|рол/);
  });

  it("returns 400 when password too short", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "r2@test.co", password: "12345", name: "U", role: "USER" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6|символ|Пароль/);
  });

  it("returns 201 and token when valid USER", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "reg-user@test.co", password: "123456", name: "Reg User", role: "USER" });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: "reg-user@test.co", name: "Reg User", role: "USER" });
  });

  it("returns 409 when email already registered", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "dup@test.co", password: "123456", name: "Dup", role: "USER" });
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "dup@test.co", password: "other12", name: "Dup2", role: "USER" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/уже|зарегистрирован|Email/);
  });

  it("returns 400 when email format invalid", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "123456", name: "U", role: "USER" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/формат|email|Неверн/);
  });

  it("returns 400 when name too long", async () => {
    const longName = "x".repeat(257);
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "longname@test.co", password: "123456", name: longName, role: "USER" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/256|символ|Имя/);
  });

  it("returns 400 when password too long", async () => {
    const longPassword = "a".repeat(73);
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "longpwd@test.co", password: longPassword, name: "U", role: "USER" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/72|символ|Пароль/);
  });
});

describe("POST /auth/login", () => {
  beforeAll(() => {
    createUser("login-ok@test.co", "pass123", "Login User", "USER");
  });

  it("returns 400 when email or password missing", async () => {
    const res = await request(app).post("/auth/login").send({ email: "a@b.co" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Укажите|email|пароль/);
  });

  it("returns 400 when email format invalid", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "bad-format", password: "secret" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/формат|email|Неверн/);
  });

  it("returns 401 when password wrong", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login-ok@test.co", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Неверн|email|пароль/);
  });

  it("returns 401 when email unknown", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@test.co", password: "any" });
    expect(res.status).toBe(401);
  });

  it("returns 200 and token when credentials valid", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login-ok@test.co", password: "pass123" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: "login-ok@test.co", name: "Login User", role: "USER" });
  });
});

describe("auth rate limiting", () => {
  it("returns 429 when exceeding rate limit on /auth/login", async () => {
    const limitedApp = express();
    limitedApp.use(express.json());
    limitedApp.use(
      "/auth",
      rateLimit({
        windowMs: 60_000,
        max: 2,
        skip: () => false,
        message: { message: "Слишком много попыток входа. Попробуйте позже." },
      }),
      authRouter
    );
    limitedApp.use(errorHandler);

    await request(limitedApp).post("/auth/login").send({ email: "a@b.co", password: "x" });
    await request(limitedApp).post("/auth/login").send({ email: "a@b.co", password: "y" });
    const res = await request(limitedApp).post("/auth/login").send({ email: "a@b.co", password: "z" });
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/Слишком|много|Попробуйте|позже/);
  });
});
