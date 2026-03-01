-- Drop season to make groups permanent
ALTER TABLE "public"."TrainingGroup" DROP COLUMN "season";

-- CreateTable
CREATE TABLE "public"."Athlete" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AthleteTrainingEntry" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDate" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteTrainingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Athlete_groupId_idx" ON "public"."Athlete"("groupId");

-- CreateIndex
CREATE INDEX "AthleteTrainingEntry_athleteId_trainingDate_idx" ON "public"."AthleteTrainingEntry"("athleteId", "trainingDate");

-- AddForeignKey
ALTER TABLE "public"."Athlete" ADD CONSTRAINT "Athlete_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AthleteTrainingEntry" ADD CONSTRAINT "AthleteTrainingEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "public"."Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
