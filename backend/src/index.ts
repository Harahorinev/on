import "dotenv/config";
import cors from "cors";
import express from "express";
import "./db.js";
import { authMiddleware } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { bookingsRouter, createBookingForSlot } from "./routes/bookings.js";
import { companiesRouter } from "./routes/companies.js";
import { directionsRouter } from "./routes/directions.js";
import { getSlotById, slotsRouter } from "./routes/slots.js";
import { userEventsRouter } from "./routes/userEvents.js";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/companies", companiesRouter);
app.get("/slots/:id", getSlotById);
app.post("/slots/:slotId/bookings", authMiddleware, createBookingForSlot);
app.use("/bookings", bookingsRouter);
app.use("/user/events", authMiddleware, userEventsRouter);

companiesRouter.use("/:companyId/slots", slotsRouter);
companiesRouter.use("/:companyId/directions", directionsRouter);

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
