import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

/**
 * Loads environment variables for standalone scripts (seed, migrations).
 * Next.js loads .env.local automatically; tsx/node scripts do not.
 *
 * Handles common Windows issues: UTF-8/UTF-16 BOM, empty unsaved files.
 */
const cwd = process.cwd();
const candidates = [".env.local", ".env"];

function decodeEnvFile(path: string): string {
  const buffer = readFileSync(path);

  if (buffer.length === 0) {
    return "";
  }

  // UTF-16 LE (Windows Notepad default)
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le").replace(/^\uFEFF/, "");
  }

  // UTF-16 BE
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return buffer.toString("utf16le").replace(/^\uFEFF/, "");
  }

  // UTF-8 with BOM
  let content = buffer.toString("utf8");
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  return content;
}

function applyParsedEnv(parsed: Record<string, string>): number {
  let count = 0;
  for (const [rawKey, value] of Object.entries(parsed)) {
    const key = rawKey.replace(/^\uFEFF/, "").trim();
    if (!key) continue;
    process.env[key] = value;
    count++;
  }
  return count;
}

let loadedFrom: string | null = null;
let loadedCount = 0;

for (const file of candidates) {
  const path = resolve(cwd, file);
  if (!existsSync(path)) continue;

  const { size } = statSync(path);
  if (size === 0) {
    console.error(
      `[load-env] ${file} exists but is empty (0 bytes).`,
      "Save the file in your editor (Ctrl+S) or paste your variables again.",
    );
    continue;
  }

  try {
    const content = decodeEnvFile(path);
    const parsed = parse(content);
    loadedCount = applyParsedEnv(parsed);
    loadedFrom = file;

    if (loadedCount > 0) {
      console.log(`[load-env] Loaded ${loadedCount} variable(s) from ${file}`);
      break;
    }

    console.warn(
      `[load-env] ${file} (${size} bytes) parsed but no KEY=value pairs found.`,
      "Use format: MONGODB_URI=your-connection-string (quote values with special chars).",
    );
  } catch (error) {
    console.warn(
      `[load-env] Failed to read ${file}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

if (!process.env.MONGODB_URI?.trim()) {
  console.error(
    [
      "[load-env] MONGODB_URI is missing.",
      loadedFrom
        ? `  Parsed ${loadedFrom} but MONGODB_URI was not among the keys.`
        : `  Checked: ${candidates.map((f) => resolve(cwd, f)).join(", ")}`,
      "  Fix: open .env.local, ensure it contains:",
      '    MONGODB_URI="mongodb+srv://..."',
      "  Then save the file (Ctrl+S) and run npm run seed again.",
    ].join("\n"),
  );
}
