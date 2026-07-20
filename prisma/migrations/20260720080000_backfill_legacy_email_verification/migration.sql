-- Verification enforcement was introduced by Git commit
-- cea9d40cb1d41815b5779f83bd210badd9d68d6a at 2026-07-18 18:56:12 UTC.
-- Preserve access only for credential accounts that predate that rollout.
UPDATE "users"
SET "email_verified" = TIMESTAMP '2026-07-18 18:56:12'
WHERE "email_verified" IS NULL
  AND "password" IS NOT NULL
  AND "created_at" < TIMESTAMP '2026-07-18 18:56:12';
