ALTER TABLE "public"."CalendarEvent"
ADD COLUMN "durationHours" DECIMAL(6,2) NOT NULL DEFAULT 1.00;

CREATE TABLE "public"."TrainerCompensation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "hourlyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "lastPayoutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainerCompensation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainerCompensation_userId_key" ON "public"."TrainerCompensation"("userId");

CREATE TABLE "public"."_EventGroups" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_EventGroups_AB_unique" ON "public"."_EventGroups"("A", "B");
CREATE INDEX "_EventGroups_B_index" ON "public"."_EventGroups"("B");

CREATE TABLE "public"."_EventTrainers" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_EventTrainers_AB_unique" ON "public"."_EventTrainers"("A", "B");
CREATE INDEX "_EventTrainers_B_index" ON "public"."_EventTrainers"("B");

ALTER TABLE "public"."TrainerCompensation"
ADD CONSTRAINT "TrainerCompensation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."_EventGroups"
ADD CONSTRAINT "_EventGroups_A_fkey"
FOREIGN KEY ("A") REFERENCES "public"."CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."_EventGroups"
ADD CONSTRAINT "_EventGroups_B_fkey"
FOREIGN KEY ("B") REFERENCES "public"."TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."_EventTrainers"
ADD CONSTRAINT "_EventTrainers_A_fkey"
FOREIGN KEY ("A") REFERENCES "public"."CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."_EventTrainers"
ADD CONSTRAINT "_EventTrainers_B_fkey"
FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
