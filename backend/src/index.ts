import "dotenv/config";
import cors from "cors";
import express from "express";
import "./db.js";
import { authMiddleware } from "./auth.js";
import { errorHandler, notFoundHandler } from "./errors.js";
import { authRouter } from "./routes/auth.js";
import { bookingsRouter, createBookingForSlot } from "./routes/bookings.js";
import { companiesRouter } from "./routes/companies.js";
import { directionsRouter } from "./routes/directions.js";
import { getSlotById, slotsRouter } from "./routes/slots.js";
import { userEventsRouter } from "./routes/userEvents.js";
import { userRouter } from "./routes/user.js";

const app = express();
const port = process.env.PORT ?? 3001;

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = process.env.ALLOWED_ORIGINS?.trim().split(/\s*,\s*/).filter(Boolean) ?? [];
app.use(
  cors({
    origin: isProduction && allowedOrigins.length > 0
      ? (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(null, false))
      : true,
  })
);
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/companies", companiesRouter);
app.get("/slots/:id", getSlotById);
app.post("/slots/:slotId/bookings", authMiddleware, createBookingForSlot);
app.use("/bookings", bookingsRouter);
app.use("/user/events", authMiddleware, userEventsRouter);
app.use("/user", userRouter);

companiesRouter.use("/:companyId/slots", slotsRouter);
companiesRouter.use("/:companyId/directions", directionsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
  });
}
