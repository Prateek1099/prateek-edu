/**
 * Vercel Blob read/write token is **bound to one store**. It is not configured in code by store name.
 * `put(..., { access: "public" })` only works with a token from a **public** Blob store.
 *
 * If you see: "Cannot use public access on a private store", the active token is still for a **private** store.
 *
 * Env resolution (first non-empty wins):
 * 1. `PUBLIC_BLOB_READ_WRITE_TOKEN` — optional; use during migration if `BLOB_READ_WRITE_TOKEN` still points at an old private store.
 * 2. `BLOB_READ_WRITE_TOKEN` — usual Vercel default; must be the token from your **public** store (e.g. examnest-public-files).
 * 3. `VERCEL_BLOB_READ_WRITE_TOKEN` — alternate name some setups use.
 */
export function resolveBlobReadWriteToken(): string | null {
  for (const raw of [
    process.env.PUBLIC_BLOB_READ_WRITE_TOKEN,
    process.env.BLOB_READ_WRITE_TOKEN,
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN,
  ]) {
    const t = raw?.trim();
    if (t) return t;
  }
  return null;
}
