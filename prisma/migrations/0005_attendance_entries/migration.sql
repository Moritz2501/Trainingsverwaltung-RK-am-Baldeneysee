CREATE TYPE "public"."AttendanceStatus" AS ENUM ('ANWESEND', 'ABWESEND');

CREATE TABLE "public"."AttendanceEntry" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "status" "public"."AttendanceStatus" NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AttendanceEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceEntry_athleteId_date_key" ON "public"."AttendanceEntry"("athleteId", "date");
CREATE INDEX "AttendanceEntry_groupId_date_idx" ON "public"."AttendanceEntry"("groupId", "date");

ALTER TABLE "public"."AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "public"."Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
