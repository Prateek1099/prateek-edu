import "server-only";

export type VexaServerRuntime =
  | "LOCAL_DEVELOPMENT"
  | "VERCEL_PREVIEW"
  | "VERCEL_PRODUCTION"
  | "OTHER_UNKNOWN";

export type VexaDatabaseEnvironment =
  | "development"
  | "preview"
  | "production";

type SafetyEnvironment = Readonly<
  Partial<
    Record<
      | "NODE_ENV"
      | "VERCEL"
      | "VERCEL_ENV"
      | "VERCEL_TARGET_ENV"
      | "VEXA_DATABASE_ENV"
      | "DATABASE_URL",
      string
    >
  >
>;

export type DatabaseSafetyDecision = Readonly<{
  runtime: VexaServerRuntime;
  databaseEnvironment: VexaDatabaseEnvironment;
  productionTarget: boolean;
}>;

const PRODUCTION_DATABASE_HOSTS = new Set([
  "ep-sweet-flower-aml0hm35-pooler.c-5.us-east-1.aws.neon.tech",
  "ep-sweet-flower-aml0hm35.c-5.us-east-1.aws.neon.tech",
]);

const PRODUCTION_DATABASE_NAMES = new Set(["neondb"]);

const TARGET_OVERRIDE_PARAMETERS = new Set([
  "database",
  "dbname",
  "host",
  "hostaddr",
  "port",
  "service",
  "servicefile",
]);

const BLOCKED_PRODUCTION_TARGET_MESSAGE =
  "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED: VEXA SAFETY GUARD blocked database access because a non-production application runtime is configured against the production database.";

const INVALID_CONFIGURATION_MESSAGE =
  "DATABASE_SAFETY_CONFIGURATION_INVALID: VEXA SAFETY GUARD could not positively verify a safe runtime and database pairing.";

const PRODUCTION_MISMATCH_MESSAGE =
  "PRODUCTION_DATABASE_CONFIGURATION_MISMATCH: VEXA SAFETY GUARD blocked database access because Vercel Production is not configured with the pinned production database identity.";

export class DatabaseSafetyError extends Error {
  readonly code:
    | "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED"
    | "DATABASE_SAFETY_CONFIGURATION_INVALID"
    | "PRODUCTION_DATABASE_CONFIGURATION_MISMATCH";

  constructor(
    code: DatabaseSafetyError["code"],
    message: string,
  ) {
    super(message);
    this.name = "DatabaseSafetyError";
    this.code = code;
  }
}

function invalidConfiguration(): never {
  throw new DatabaseSafetyError(
    "DATABASE_SAFETY_CONFIGURATION_INVALID",
    INVALID_CONFIGURATION_MESSAGE,
  );
}

function normalizeDatabaseEnvironment(
  value: string | undefined,
): VexaDatabaseEnvironment {
  if (
    value === "development" ||
    value === "preview" ||
    value === "production"
  ) {
    return value;
  }

  return invalidConfiguration();
}

export function classifyVexaServerRuntime(
  env: SafetyEnvironment,
): VexaServerRuntime {
  const hasAnyVercelMarker = Boolean(
    env.VERCEL || env.VERCEL_ENV || env.VERCEL_TARGET_ENV,
  );

  if (!hasAnyVercelMarker) {
    return "LOCAL_DEVELOPMENT";
  }

  if (env.VERCEL !== "1") {
    return "OTHER_UNKNOWN";
  }

  if (
    env.VERCEL_ENV === "production" &&
    env.VERCEL_TARGET_ENV === "production"
  ) {
    return "VERCEL_PRODUCTION";
  }

  if (
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_TARGET_ENV === "preview"
  ) {
    return "VERCEL_PREVIEW";
  }

  if (
    env.VERCEL_ENV === "development" &&
    env.VERCEL_TARGET_ENV === "development"
  ) {
    return "LOCAL_DEVELOPMENT";
  }

  return "OTHER_UNKNOWN";
}

function parseDatabaseTarget(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return invalidConfiguration();
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return invalidConfiguration();
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    return invalidConfiguration();
  }

  for (const key of parsed.searchParams.keys()) {
    if (TARGET_OVERRIDE_PARAMETERS.has(key.toLowerCase())) {
      return invalidConfiguration();
    }
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  } catch {
    return invalidConfiguration();
  }

  if (!hostname || !databaseName || databaseName.includes("/")) {
    return invalidConfiguration();
  }

  return { hostname, databaseName };
}

export function evaluateApplicationDatabaseSafety(
  env: SafetyEnvironment,
): DatabaseSafetyDecision {
  const runtime = classifyVexaServerRuntime(env);
  const target = parseDatabaseTarget(env.DATABASE_URL);
  const productionTarget =
    PRODUCTION_DATABASE_HOSTS.has(target.hostname) &&
    PRODUCTION_DATABASE_NAMES.has(target.databaseName);

  if (productionTarget) {
    if (
      runtime === "VERCEL_PRODUCTION" &&
      env.VEXA_DATABASE_ENV === "production"
    ) {
      return {
        runtime,
        databaseEnvironment: "production",
        productionTarget,
      };
    }

    if (runtime === "VERCEL_PRODUCTION") {
      throw new DatabaseSafetyError(
        "PRODUCTION_DATABASE_CONFIGURATION_MISMATCH",
        PRODUCTION_MISMATCH_MESSAGE,
      );
    }

    throw new DatabaseSafetyError(
      "LOCAL_DEV_PRODUCTION_DB_WRITE_BLOCKED",
      BLOCKED_PRODUCTION_TARGET_MESSAGE,
    );
  }

  const databaseEnvironment = normalizeDatabaseEnvironment(
    env.VEXA_DATABASE_ENV,
  );

  if (runtime === "VERCEL_PRODUCTION") {
    throw new DatabaseSafetyError(
      "PRODUCTION_DATABASE_CONFIGURATION_MISMATCH",
      PRODUCTION_MISMATCH_MESSAGE,
    );
  }

  if (databaseEnvironment === "production") {
    return invalidConfiguration();
  }

  const allowedNonProductionPair =
    (runtime === "LOCAL_DEVELOPMENT" &&
      databaseEnvironment === "development") ||
    (runtime === "VERCEL_PREVIEW" &&
      (databaseEnvironment === "preview" ||
        databaseEnvironment === "development"));

  if (!allowedNonProductionPair) {
    return invalidConfiguration();
  }

  return { runtime, databaseEnvironment, productionTarget };
}

export function assertSafeApplicationDatabaseAccess(
  env: SafetyEnvironment = process.env,
): DatabaseSafetyDecision {
  return evaluateApplicationDatabaseSafety(env);
}
