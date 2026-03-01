-- Add single name and birthDate to Athlete
ALTER TABLE "public"."Athlete" ADD COLUMN "name" TEXT;
ALTER TABLE "public"."Athlete" ADD COLUMN "birthDate" TIMESTAMP(3);

-- Backfill name from existing first/last name columns
UPDATE "public"."Athlete"
SET "name" = trim(coalesce("firstName", '') || ' ' || coalesce("lastName", ''));

-- Ensure name is required
ALTER TABLE "public"."Athlete" ALTER COLUMN "name" SET NOT NULL;

-- Remove deprecated athlete columns
ALTER TABLE "public"."Athlete" DROP COLUMN "firstName";
ALTER TABLE "public"."Athlete" DROP COLUMN "lastName";
ALTER TABLE "public"."Athlete" DROP COLUMN "notes";

-- Remove training notes field
ALTER TABLE "public"."AthleteTrainingEntry" DROP COLUMN "notes";
