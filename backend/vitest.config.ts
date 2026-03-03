import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

const testDb = path.join(process.cwd(), "test-data.db");
try {
  fs.unlinkSync(testDb);
} catch {
  // ignore
}
process.env.DB_PATH = testDb;
process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
