CREATE TYPE "AccountActionTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

CREATE TABLE "account_action_tokens" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" "AccountActionTokenPurpose" NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_action_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_action_tokens_token_hash_key" ON "account_action_tokens"("token_hash");
CREATE INDEX "account_action_tokens_identifier_purpose_idx" ON "account_action_tokens"("identifier", "purpose");
