ALTER TYPE "public"."Role" ADD VALUE IF NOT EXISTS 'GRUPPEN_VERWALTUNG';

CREATE TABLE "public"."AttendanceList" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "isFinalized" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AttendanceList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."AttendanceListItem" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "status" "public"."AttendanceStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AttendanceListItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AttendanceList_groupId_date_idx" ON "public"."AttendanceList"("groupId", "date");
CREATE UNIQUE INDEX "AttendanceListItem_listId_athleteId_key" ON "public"."AttendanceListItem"("listId", "athleteId");
CREATE INDEX "AttendanceListItem_athleteId_idx" ON "public"."AttendanceListItem"("athleteId");

ALTER TABLE "public"."AttendanceList" ADD CONSTRAINT "AttendanceList_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AttendanceList" ADD CONSTRAINT "AttendanceList_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."AttendanceListItem" ADD CONSTRAINT "AttendanceListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."AttendanceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AttendanceListItem" ADD CONSTRAINT "AttendanceListItem_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "public"."Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
