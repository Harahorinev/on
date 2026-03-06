import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";
import { msg } from "./messages.js";

/**
 * Application error with HTTP status. Use in routes: next(new AppError(404, "Not found")).
 * Error handler middleware will send { message } with this status.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Consistent error response shape (matches existing API). */
export function sendError(res: Response, statusCode: number, message: string): void {
  res.status(statusCode).json({ message });
}

/**
 * Global error handler. Use last after all routes.
 * - AppError: sends statusCode and message.
 * - Other errors: logged, sends 500 with generic message (no leak).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message);
    return;
  }
  logger.error({ err }, "Unhandled error");
  sendError(res, 500, msg.internalError);
}

/** Catch-all: no route matched → 404. Place before errorHandler. */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, msg.notFound));
}
