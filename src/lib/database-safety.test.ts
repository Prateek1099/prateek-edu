import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DatabaseSafetyError,
  classifyVexaServerRuntime,
  evaluateApplicationDatabaseSafety,
} from "./database-safety";

const pooledProductionHost =
  "ep-sweet-flower-aml0hm35-pooler.c-5.us-east-1.aws.neon.tech";
const unpooledProductionHost =
  "ep-sweet-flower-aml0hm35.c-5.us-east-1.aws.neon.tech";

function url(host: string, query = "") {
  return `postgresql://guard-user:guard-password@${host}:5432/neondb${query}`;
}

const localDevelopment = {
  VEXA_DATABASE_ENV: "development",
  DATABASE_URL: url("development-db.internal"),
};

const vercelPreview = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_TARGET_ENV: "preview",
  VEXA_DATABASE_ENV: "preview",
  DATABASE_URL: url("preview-db.internal"),
};

const vercelProduction = {
  VERCEL: "1",
  VERCEL_ENV: "production",
  VERCEL_TARGET_ENV: "production",
  VEXA_DATABASE_ENV: "production",
  DATABASE_URL: url(pooledProductionHost),
};

function expectBlocked(
  environment: Record<string, string>,
  code: DatabaseSafetyError["code"],
) {
  assert.throws(
    () => evaluateApplicationDatabaseSafety(environment),
    (error: unknown) =>
      error instanceof DatabaseSafetyError && error.code === code,
  );
}

test("classifies local, Preview, Production, and inconsistent Vercel markers", () => {
  assert.equal(classifyVexaServerRuntime({}), "LOCAL_DEVELOPMENT");
  assert.equal(classifyVexaServerRuntime(vercelPreview), "VERCEL_PREVIEW");
  assert.equal(
    classifyVexaServerRuntime(vercelProduction),
    "VERCEL_PRODUCTION",
  );
  assert.equal(
    classifyVexaServerRuntime({ VERCEL: "1", VERCEL_ENV: "production" }),
    "OTHER_UNKNOWN",
  );
});

test("allows local development with a designated development database", () => {
  assert.deepEqual(evaluateApplicationDatabaseSafety(localDevelopment), {
    runtime: "LOCAL_DEVELOPMENT",
    databaseEnvironment: "development",
    productionTarget: false,
  });
});

test("blocks local development against the pooled production database", () => {
  expectBlocked(
    { ...localDevelopment, DATABASE_URL: url(pooledProductionHost) },
    "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED",
  );
});

test("blocks the current local production target even when its DB label is absent", () => {
  expectBlocked(
    { DATABASE_URL: url(pooledProductionHost) },
    "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED",
  );
});

test("blocks local NODE_ENV=production without verified Vercel identity", () => {
  expectBlocked(
    {
      ...localDevelopment,
      NODE_ENV: "production",
      DATABASE_URL: url(pooledProductionHost),
    },
    "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED",
  );
});

test("blocks Vercel Preview against production", () => {
  expectBlocked(
    { ...vercelPreview, DATABASE_URL: url(pooledProductionHost) },
    "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED",
  );
});

test("allows Vercel Preview against a designated preview database", () => {
  assert.equal(
    evaluateApplicationDatabaseSafety(vercelPreview).runtime,
    "VERCEL_PREVIEW",
  );
});

test("allows Vercel Preview against a designated development database", () => {
  assert.equal(
    evaluateApplicationDatabaseSafety({
      ...vercelPreview,
      VEXA_DATABASE_ENV: "development",
    }).databaseEnvironment,
    "development",
  );
});

test("allows verified Vercel Production against the pooled production endpoint", () => {
  assert.equal(
    evaluateApplicationDatabaseSafety(vercelProduction).productionTarget,
    true,
  );
});

test("recognizes and allows the pinned unpooled production endpoint", () => {
  assert.equal(
    evaluateApplicationDatabaseSafety({
      ...vercelProduction,
      DATABASE_URL: url(unpooledProductionHost),
    }).productionTarget,
    true,
  );
});

test("fails closed when Vercel Production points to an unexpected database", () => {
  expectBlocked(
    { ...vercelProduction, DATABASE_URL: url("development-db.internal") },
    "PRODUCTION_DATABASE_CONFIGURATION_MISMATCH",
  );
});

test("blocks an unknown Vercel runtime against production", () => {
  expectBlocked(
    {
      VERCEL: "1",
      VERCEL_ENV: "production",
      VEXA_DATABASE_ENV: "production",
      DATABASE_URL: url(pooledProductionHost),
    },
    "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED",
  );
});

test("fails safely for malformed or non-PostgreSQL URLs", () => {
  expectBlocked(
    { ...localDevelopment, DATABASE_URL: "not-a-database-url" },
    "DATABASE_SAFETY_CONFIGURATION_INVALID",
  );
  expectBlocked(
    { ...localDevelopment, DATABASE_URL: "https://development-db.internal/db" },
    "DATABASE_SAFETY_CONFIGURATION_INVALID",
  );
});

test("does not trust hostname substring or suffix spoofs", () => {
  expectBlocked(
    {
      ...vercelProduction,
      DATABASE_URL: url(`${pooledProductionHost}.attacker.invalid`),
    },
    "PRODUCTION_DATABASE_CONFIGURATION_MISMATCH",
  );
});

test("canonicalizes a trailing DNS root dot before production matching", () => {
  expectBlocked(
    {
      ...localDevelopment,
      DATABASE_URL: url(`${pooledProductionHost}.`),
    },
    "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED",
  );
});

test("rejects query parameters that can override the effective target", () => {
  expectBlocked(
    {
      ...localDevelopment,
      DATABASE_URL: `${url("development-db.internal")}?host=${pooledProductionHost}`,
    },
    "DATABASE_SAFETY_CONFIGURATION_INVALID",
  );
  expectBlocked(
    {
      ...localDevelopment,
      DATABASE_URL: `${url("development-db.internal")}?hostaddr=127.0.0.1`,
    },
    "DATABASE_SAFETY_CONFIGURATION_INVALID",
  );
});

test("a production label alone cannot make an unpinned target trusted", () => {
  expectBlocked(
    { ...localDevelopment, VEXA_DATABASE_ENV: "production" },
    "DATABASE_SAFETY_CONFIGURATION_INVALID",
  );
});

test("a production hostname alone cannot make a fake runtime trusted", () => {
  expectBlocked(
    {
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_TARGET_ENV: "production",
      VEXA_DATABASE_ENV: "production",
      DATABASE_URL: url(pooledProductionHost),
    },
    "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED",
  );
});

test("missing or invalid database environment labels fail closed", () => {
  expectBlocked(
    { DATABASE_URL: url("development-db.internal") },
    "DATABASE_SAFETY_CONFIGURATION_INVALID",
  );
  expectBlocked(
    {
      DATABASE_URL: url("development-db.internal"),
      VEXA_DATABASE_ENV: "staging",
    },
    "DATABASE_SAFETY_CONFIGURATION_INVALID",
  );
});

test("guard errors do not expose credentials or connection-string parameters", () => {
  const secretUrl = `postgresql://secret-user:secret-password@${pooledProductionHost}:5432/neondb?sslmode=require`;
  assert.throws(
    () =>
      evaluateApplicationDatabaseSafety({
        ...localDevelopment,
        DATABASE_URL: secretUrl,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseSafetyError);
      assert.match(error.message, /LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED/);
      assert.doesNotMatch(error.message, /secret-user|secret-password|sslmode/);
      assert.doesNotMatch(error.message, /neon\.tech/);
      return true;
    },
  );
});

test("Prisma safety assertion runs before cached-client reuse and pool construction", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/lib/prisma.ts"),
    "utf8",
  );
  const assertion = source.indexOf("assertSafeApplicationDatabaseAccess();");
  const cachedClient = source.indexOf("if (globalForPrisma.prisma)");
  const poolConstruction = source.indexOf("new Pool({ connectionString })");

  assert.ok(assertion >= 0);
  assert.ok(cachedClient > assertion);
  assert.ok(poolConstruction > assertion);
});
