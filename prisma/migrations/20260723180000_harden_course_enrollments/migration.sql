-- Add the optional course mapping first. Legacy payments remain unmapped unless
-- their course can be established by a newly-created order.
ALTER TABLE "payments" ADD COLUMN "course_id" TEXT;

-- Reconcile legacy duplicate enrollments before enforcing uniqueness.
-- Completed access wins. Within the winning status, retain the newest row.
WITH "ranked_enrollments" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "user_id", "course_id"
            ORDER BY
                CASE WHEN "paymentStatus" = 'completed' THEN 0 ELSE 1 END,
                "enrolled_at" DESC,
                "id" DESC
        ) AS "row_number"
    FROM "enrollments"
)
DELETE FROM "enrollments"
USING "ranked_enrollments"
WHERE "enrollments"."id" = "ranked_enrollments"."id"
  AND "ranked_enrollments"."row_number" > 1;

CREATE UNIQUE INDEX "enrollments_user_id_course_id_key"
ON "enrollments"("user_id", "course_id");

CREATE INDEX "payments_course_id_idx" ON "payments"("course_id");

CREATE UNIQUE INDEX "payments_razorpay_order_id_key"
ON "payments"("razorpay_order_id");

ALTER TABLE "payments"
ADD CONSTRAINT "payments_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
