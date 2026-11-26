import mongoose, {
  type ConnectOptions,
  type Connection,
  type Mongoose,
} from "mongoose";

/**
 * Cached Mongoose connection for Next.js App Router (serverless / edge-adjacent).
 *
 * In development, Next.js hot-reloads modules and would otherwise open a new
 * MongoDB connection on every reload. In production (Vercel), each lambda reuses
 * the same global between invocations when warm.
 *
 * @example Route Handler / Server Action
 * ```ts
 * import { connectDB } from "@/lib/db";
 *
 * export async function GET() {
 *   await connectDB();
 *   // ... use models
 * }
 * ```
 */

const MONGOOSE_CACHE_KEY = "__goalPortalMongooseCache__" as const;

type ConnectionState = "disconnected" | "connecting" | "connected" | "disconnecting";

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
  listenersAttached: boolean;
}

declare global {
  var __goalPortalMongooseCache__: MongooseCache | undefined;
}

function getCache(): MongooseCache {
  if (!global[MONGOOSE_CACHE_KEY]) {
    global[MONGOOSE_CACHE_KEY] = {
      conn: null,
      promise: null,
      listenersAttached: false,
    };
  }
  return global[MONGOOSE_CACHE_KEY];
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined. Add it to .env.local (see .env.example).",
    );
  }
  return uri;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Connection options tuned for Vercel serverless + MongoDB Atlas.
 * @see https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/
 */
function getConnectOptions(): ConnectOptions {
  return {
    // Fail fast in serverless instead of buffering commands while disconnected
    bufferCommands: false,

    // Pool sizing — keep conservative for serverless (many short-lived instances)
    maxPoolSize: parsePositiveInt(process.env.MONGODB_MAX_POOL_SIZE, 10),
    minPoolSize: parsePositiveInt(process.env.MONGODB_MIN_POOL_SIZE, 0),

    // Timeouts (ms)
    serverSelectionTimeoutMS: parsePositiveInt(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      10_000,
    ),
    socketTimeoutMS: parsePositiveInt(process.env.MONGODB_SOCKET_TIMEOUT_MS, 45_000),
    connectTimeoutMS: parsePositiveInt(process.env.MONGODB_CONNECT_TIMEOUT_MS, 10_000),

    // Retry writes (Atlas default; explicit for clarity)
    retryWrites: true,

    // Optional app name for Atlas monitoring / logs
    ...(process.env.MONGODB_APP_NAME
      ? { appName: process.env.MONGODB_APP_NAME }
      : { appName: "goal-portal" }),
  };
}

function attachConnectionListeners(connection: Connection, cache: MongooseCache): void {
  if (cache.listenersAttached) return;

  connection.on("error", (error: Error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[mongodb] connection error:", error.message);
    }
    // Allow the next connectDB() call to establish a fresh connection
    cache.conn = null;
    cache.promise = null;
  });

  connection.on("disconnected", () => {
    cache.conn = null;
    cache.promise = null;
  });

  cache.listenersAttached = true;
}

function configureMongoose(): void {
  mongoose.set("strictQuery", true);

  if (process.env.NODE_ENV === "development") {
    mongoose.set("debug", process.env.MONGODB_DEBUG === "true");
  }
}

/**
 * Returns the native driver connection state (0–3).
 * Prefer {@link getDBState} for a readable string in logs/health checks.
 */
export function getReadyState(): number {
  return mongoose.connection.readyState;
}

export function getDBState(): ConnectionState {
  const states: ConnectionState[] = [
    "disconnected",
    "connected",
    "connecting",
    "disconnecting",
  ];
  return states[mongoose.connection.readyState] ?? "disconnected";
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Establishes (or reuses) the cached Mongoose connection.
 * Safe to call from every Server Component, Server Action, and Route Handler.
 */
export async function connectDB(): Promise<Mongoose> {
  const cache = getCache();

  if (cache.conn && isDBConnected()) {
    return cache.conn;
  }

  // Stale cache after Atlas idle timeout or network blip
  if (cache.conn && !isDBConnected()) {
    cache.conn = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    configureMongoose();

    const uri = getMongoUri();
    const options = getConnectOptions();

    cache.promise = mongoose
      .connect(uri, options)
      .then((instance) => {
        attachConnectionListeners(instance.connection, cache);
        return instance;
      })
      .catch((error: unknown) => {
        // Reset so the next request can retry after a transient failure
        cache.promise = null;
        cache.conn = null;
        throw error;
      });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    cache.promise = null;
    cache.conn = null;
    throw error;
  }
}

/**
 * Closes the cached connection. Use in scripts, tests, or graceful shutdown —
 * not in normal App Router request handlers (Vercel reuses warm instances).
 */
export async function disconnectDB(): Promise<void> {
  const cache = getCache();

  if (!cache.conn && !cache.promise) {
    return;
  }

  await mongoose.disconnect();

  cache.conn = null;
  cache.promise = null;
  cache.listenersAttached = false;
}

/**
 * Lightweight health probe for admin/cron routes.
 */
export async function pingDB(): Promise<{ ok: boolean; state: ConnectionState }> {
  try {
    await connectDB();
    if (!mongoose.connection.db) {
      return { ok: false, state: getDBState() };
    }
    await mongoose.connection.db.admin().command({ ping: 1 });
    return { ok: true, state: getDBState() };
  } catch {
    return { ok: false, state: getDBState() };
  }
}

export type { Mongoose, Connection };
