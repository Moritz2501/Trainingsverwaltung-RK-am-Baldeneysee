CREATE TYPE "public"."AthleteDistance" AS ENUM ('M100', 'M500', 'M1000', 'M2000');

ALTER TABLE "public"."AthleteTrainingEntry"
ADD COLUMN "distance" "public"."AthleteDistance",
ADD COLUMN "strokeRate" INTEGER,
ADD COLUMN "totalTimeSeconds" DECIMAL(8,2),
ADD COLUMN "splitPer500Seconds" DECIMAL(8,2);
