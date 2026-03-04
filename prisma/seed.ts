import bcrypt from "bcryptjs";
import { PrismaClient, Role, EventType, AnnouncementPriority } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = "admin";
  const adminPassword = "admin123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      displayName: "System-Administrator",
      role: Role.ADMIN,
      active: true,
      passwordHash,
    },
    create: {
      username: adminUsername,
      displayName: "System-Administrator",
      role: Role.ADMIN,
      active: true,
      passwordHash,
    },
  });

  const group = await prisma.trainingGroup.upsert({
    where: { id: "seed-group-2026" },
    update: {
      name: "Leistungsgruppe A",
      description: "Standardgruppe für Seed-Daten",
      active: true,
    },
    create: {
      id: "seed-group-2026",
      name: "Leistungsgruppe A",
      description: "Standardgruppe für Seed-Daten",
      active: true,
    },
  });

  await prisma.trainingGroupAssignment.upsert({
    where: {
      userId_groupId: {
        userId: admin.id,
        groupId: group.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      groupId: group.id,
    },
  });

  const existingEvent = await prisma.calendarEvent.findFirst({ where: { title: "Frühjahrsregatta" } });
  if (!existingEvent) {
    await prisma.calendarEvent.create({
      data: {
        title: "Frühjahrsregatta",
        type: EventType.REGATTA,
        startDate: new Date("2026-04-12"),
        endDate: new Date("2026-04-13"),
        location: "Baldeneysee",
        description: "Saisonauftakt mit mehreren Vereinen.",
        createdById: admin.id,
      },
    });
  }

  const existingAnnouncement = await prisma.announcement.findFirst({ where: { title: "Willkommen im Trainerportal" } });
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        title: "Willkommen im Trainerportal",
        body: "Bitte das initiale Admin-Passwort nach dem ersten Login sofort ändern.",
        priority: AnnouncementPriority.HOCH,
        validFrom: new Date(),
        createdById: admin.id,
        archived: false,
      },
    });
  }

  console.log("Seed erfolgreich.");
  console.log("Initialer ADMIN: admin / admin123! (bitte sofort ändern)");
}

main()
  .catch((error) => {
    console.error("Seed fehlgeschlagen", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
