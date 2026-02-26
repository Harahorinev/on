import { Router } from "express";
import {
  createUser,
  findUserByEmail,
  rowToUser,
  signToken,
  verifyPassword,
} from "../auth.js";

export const authRouter = Router();

authRouter.post("/register", (req, res) => {
  const { email, password, name, role } = req.body ?? {};
  if (!email || !password || !name || !role) {
    res.status(400).json({ message: "email, password, name, role required" });
    return;
  }
  if (!["USER", "COMPANY"].includes(role)) {
    res.status(400).json({ message: "role must be USER or COMPANY" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ message: "password at least 6 characters" });
    return;
  }
  if (findUserByEmail(email)) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }
  try {
    const user = createUser(email, password, name, role);
    const accessToken = signToken(user);
    res.status(201).json({ accessToken, user });
  } catch (e) {
    console.error("Register error:", e);
    res.status(500).json({ message: "Registration failed" });
  }
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: "email and password required" });
    return;
  }
  const row = findUserByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }
  const user = rowToUser(row);
  const accessToken = signToken(user);
  res.json({ accessToken, user });
});
