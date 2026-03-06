/**
 * Structured logger for production (JSON) and development.
 * B97: Replace console.* with this so log aggregators can parse fields.
 */
import pino from "pino";

const isTest = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: isTest ? "silent" : process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  serializers: {
    err: pino.stdSerializers.err,
  },
  ...(isProduction && {
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
});
