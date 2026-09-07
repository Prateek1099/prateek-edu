// Test-only database adapters: embedded by default, explicit loopback PostgreSQL
// for final review. Never uses the application's DATABASE_URL or environment files.
import { EventEmitter } from "node:events";
import { PGlite } from "@electric-sql/pglite";
import { Pool, types } from "pg";

// Opt-in only: never fall back to the application's DATABASE_URL. The caller
// provisions a fresh disposable database before running the contract suite.
export function realTestUrl() {
  const value = process.env.ASSESSMENT_TEST_DATABASE_URL;
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" ||
      !/^\/vexa_a0_[a-z0-9_]+$/.test(url.pathname)) {
    throw new Error("Assessment tests require an explicit loopback vexa_a0_* disposable database.");
  }
  return value;
}

type TestDatabase = {
  pool: Pool;
  memory: {
    exec: (sql: string) => Promise<unknown>;
    query: <T extends Record<string, unknown>>(sql: string) => Promise<{rows:T[]}>;
    close: () => Promise<void>;
  };
};
export async function assessmentTestDatabase(): Promise<TestDatabase> {
  const connectionString = realTestUrl();
  if (!connectionString) {
    const memory = await PGlite.create();
    return { memory, pool: localTestPool(memory) };
  }
  // One connection preserves SET TIME ZONE in the sequential contract suite.
  // The dedicated concurrency suite uses separate real pools/connections.
  const pool = new Pool({ connectionString, max: 1 });
  const memory = {
    exec: (sql: string) => pool.query(sql),
    query: async <T extends Record<string, unknown>>(sql: string) => ({ rows: (await pool.query<T>(sql)).rows }),
    close: async () => {},
  };
  return { memory, pool };
}

export function localTestPool(memory: PGlite) {
  const pool = new Pool();
  let tail = Promise.resolve();
  async function acquire() {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    return release;
  }
  type Config = { text: string; values?: unknown[]; types?: {getTypeParser:(oid:number,format:string)=>(value:string)=>unknown} };
  async function query(config: Config | string, values: unknown[] = []) {
    const c = typeof config === "string" ? {text:config} : config;
    const parsers: Record<number,(value:string)=>unknown> = {};
    if (c.types) for (const oid of Object.values(types.builtins)) parsers[oid] = c.types.getTypeParser(oid,"text");
    const result = await memory.query(c.text, c.values ?? values, {rowMode:"array",parsers});
    return {rows:result.rows,fields:result.fields,rowCount:result.affectedRows};
  }
  pool.query = (async (config: Config|string, values?:unknown[]) => {
    const release = await acquire();
    try { return await query(config,values); } finally { release(); }
  }) as Pool["query"];
  pool.connect = (async () => {
    const release = await acquire();
    return Object.assign(new EventEmitter(),{query,release});
  }) as Pool["connect"];
  return pool;
}
