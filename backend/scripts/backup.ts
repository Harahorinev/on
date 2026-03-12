import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, "..", "data.db");
const dbPath = path.resolve(process.env.DB_PATH ?? defaultDbPath);
const backupDir = path.resolve(process.env.BACKUP_DIR ?? path.resolve(__dirname, "..", "backups"));
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? "7");

function timestampForFilename(date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return [
    date.getUTCFullYear().toString(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "-",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("");
}

function ensureBackupDirExists(): void {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

function cleanupOldBackups(): void {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  const thresholdMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = fs.readdirSync(backupDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".db")) continue;
    const filePath = path.join(backupDir, entry.name);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < thresholdMs) {
      fs.unlinkSync(filePath);
    }
  }
}

async function runBackup(): Promise<void> {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }
  ensureBackupDirExists();

  const filename = `backup-${timestampForFilename()}.db`;
  const backupPath = path.join(backupDir, filename);
  const sourceDb = new Database(dbPath, { readonly: true, fileMustExist: true });

  try {
    await sourceDb.backup(backupPath);
  } finally {
    sourceDb.close();
  }

  cleanupOldBackups();
  const size = fs.statSync(backupPath).size;
  process.stdout.write(`Backup created: ${backupPath} (${size} bytes)\n`);
}

runBackup().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : "Unknown backup error";
  process.stderr.write(`Backup failed: ${msg}\n`);
  process.exit(1);
});
