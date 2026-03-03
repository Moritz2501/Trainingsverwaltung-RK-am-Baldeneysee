"use server";

import { AnnouncementPriority, EventType, Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canManageAnnouncements,
  canManageAthletes,
  canManageCalendar,
  canManageFinalizedAttendance,
  canManageGroups,
  canManageUsers,
  canMoveAthletes,
} from "@/lib/rbac";
import {
  athleteBatchCreateSchema,
  attendanceListCreateSchema,
  attendanceListFinalizeSchema,
  attendanceListUpdateSchema,
  attendanceSaveSchema,
  announcementSchema,
  moveAthletesSchema,
  athleteSchema,
  athleteTrainingEntrySchema,
  assignmentSchema,
  calendarEventSchema,
  changePasswordSchema,
  createUserSchema,
  resetPasswordSchema,
  trainingGroupSchema,
  updateAthleteSchema,
  updateUserSchema,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";

function checkboxValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export async function createUserAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN, Role.LEITUNG]);
  if (!canManageUsers(session.user.role)) {
    return;
  }

  const parsed = createUserSchema.safeParse({
    username: String(formData.get("username") ?? "").trim().toLowerCase(),
    displayName: String(formData.get("displayName") ?? "").trim(),
    role: String(formData.get("role") ?? "TRAINER") as Role,
    password: String(formData.get("password") ?? "").trim(),
    active: checkboxValue(formData.get("active")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true },
  });

  if (existing) {
    throw new Error("Benutzername ist bereits vergeben.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.user.create({
      data: {
        username: parsed.data.username,
        displayName: parsed.data.displayName,
        role: parsed.data.role,
        passwordHash,
        active: parsed.data.active,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Benutzername ist bereits vergeben.");
    }
    throw error;
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/new");
}

export async function updateUserAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN, Role.LEITUNG]);
  if (!canManageUsers(session.user.role)) {
    return;
  }

  const parsed = updateUserSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    username: String(formData.get("username") ?? "").trim().toLowerCase(),
    displayName: String(formData.get("displayName") ?? ""),
    role: String(formData.get("role") ?? "TRAINER") as Role,
    active: checkboxValue(formData.get("active")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      active: parsed.data.active,
    },
  });

  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN, Role.LEITUNG]);
  if (!canManageUsers(session.user.role)) {
    return;
  }

  const id = String(formData.get("id") ?? "");
  if (!id) {
    throw new Error("Benutzer-ID fehlt");
  }

  if (id === session.user.id) {
    throw new Error("Du kannst deinen eigenen Account nicht löschen.");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}

export async function resetUserPasswordAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN, Role.LEITUNG]);
  if (!canManageUsers(session.user.role)) {
    return;
  }

  const parsed = resetPasswordSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: parsed.data.id },
    data: { passwordHash },
  });

  revalidatePath("/admin/users");
}

export async function createGroupAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageGroups(session.user.role)) {
    return;
  }

  const parsed = trainingGroupSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    active: checkboxValue(formData.get("active")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await prisma.trainingGroup.create({
    data: parsed.data,
  });

  revalidatePath("/groups");
}

export async function updateGroupAction(formData: FormData) {
  const session = await requireAuth();

  const groupId = String(formData.get("id") ?? "");
  const group = await prisma.trainingGroup.findUnique({
    where: { id: groupId },
    include: { assignments: true },
  });

  if (!group) {
    throw new Error("Gruppe nicht gefunden");
  }

  const assigned = group.assignments.some((entry) => entry.userId === session.user.id);
  const canEdit = canManageGroups(session.user.role) || assigned;

  if (!canEdit) {
    return;
  }

  const parsed = trainingGroupSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    active: checkboxValue(formData.get("active")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await prisma.trainingGroup.update({
    where: { id: groupId },
    data: parsed.data,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroupAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageGroups(session.user.role)) {
    return;
  }

  const groupId = String(formData.get("id") ?? "");
  if (!groupId) {
    throw new Error("Gruppen-ID fehlt");
  }

  await prisma.trainingGroup.delete({ where: { id: groupId } });

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  revalidatePath("/athletes");
}

export async function assignTrainerToGroupAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageGroups(session.user.role)) {
    return;
  }

  const parsed = assignmentSchema.safeParse({
    groupId: String(formData.get("groupId") ?? ""),
    userIds: formData.getAll("userIds").map((value) => String(value)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await prisma.trainingGroupAssignment.deleteMany({
    where: { groupId: parsed.data.groupId },
  });

  if (parsed.data.userIds.length > 0) {
    await prisma.trainingGroupAssignment.createMany({
      data: parsed.data.userIds.map((userId) => ({ userId, groupId: parsed.data.groupId })),
      skipDuplicates: true,
    });
  }

  revalidatePath(`/groups/${parsed.data.groupId}`);
}

async function canEditGroup(sessionUserId: string, role: Role, groupId: string) {
  const group = await prisma.trainingGroup.findUnique({
    where: { id: groupId },
    include: { assignments: true },
  });

  if (!group) {
    throw new Error("Gruppe nicht gefunden");
  }

  if (canManageGroups(role)) {
    return group;
  }

  const assigned = group.assignments.some((entry) => entry.userId === sessionUserId);
  const allowed = canManageGroups(role) || assigned;

  if (!allowed) {
    throw new Error("Keine Berechtigung");
  }

  return group;
}

async function canAccessAttendanceGroup(sessionUserId: string, role: Role, groupId: string) {
  const group = await prisma.trainingGroup.findUnique({
    where: { id: groupId },
    include: { assignments: true },
  });

  if (!group) {
    throw new Error("Gruppe nicht gefunden");
  }

  if (canManageGroups(role)) {
    return group;
  }

  const assigned = group.assignments.some((entry) => entry.userId === sessionUserId);
  if (!assigned) {
    throw new Error("Keine Berechtigung für diese Trainingsgruppe.");
  }

  return group;
}

export async function saveGroupAttendanceAction(formData: FormData) {
  const session = await requireAuth();

  const rawAthleteIds = formData.getAll("athleteIds").map((value) => String(value));
  const items = rawAthleteIds.map((athleteId) => ({
    athleteId,
    status: String(formData.get(`status-${athleteId}`) ?? "ABWESEND"),
  }));

  const parsed = attendanceSaveSchema.safeParse({
    groupId: String(formData.get("groupId") ?? ""),
    date: String(formData.get("date") ?? ""),
    items,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await canAccessAttendanceGroup(session.user.id, session.user.role, parsed.data.groupId);

  const athleteIds = parsed.data.items.map((item) => item.athleteId);
  const existingAthletes = await prisma.athlete.findMany({
    where: { id: { in: athleteIds }, groupId: parsed.data.groupId },
    select: { id: true },
  });

  if (existingAthletes.length !== athleteIds.length) {
    throw new Error("Mindestens ein Sportler gehört nicht zur gewählten Gruppe.");
  }

  await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.attendanceEntry.upsert({
        where: {
          athleteId_date: {
            athleteId: item.athleteId,
            date: parsed.data.date,
          },
        },
        update: {
          status: item.status,
          groupId: parsed.data.groupId,
          createdById: session.user.id,
        },
        create: {
          groupId: parsed.data.groupId,
          athleteId: item.athleteId,
          date: parsed.data.date,
          status: item.status,
          createdById: session.user.id,
        },
      }),
    ),
  );

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${parsed.data.groupId}`);
}

export async function createAttendanceListAction(formData: FormData) {
  const session = await requireAuth();

  const parsed = attendanceListCreateSchema.safeParse({
    groupId: String(formData.get("groupId") ?? ""),
    date: String(formData.get("date") ?? ""),
    title: String(formData.get("title") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await canAccessAttendanceGroup(session.user.id, session.user.role, parsed.data.groupId);

  const list = await prisma.attendanceList.create({
    data: {
      groupId: parsed.data.groupId,
      date: parsed.data.date,
      title: parsed.data.title,
      createdById: session.user.id,
    },
    select: { id: true, groupId: true },
  });

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${list.groupId}`);
  redirect(`/attendance/${list.groupId}?listId=${list.id}`);
}

export async function updateAttendanceListAction(formData: FormData) {
  const session = await requireAuth();

  const listId = String(formData.get("listId") ?? "");
  const athleteIds = formData.getAll("athleteIds").map((value) => String(value));
  const items = athleteIds.map((athleteId) => ({
    athleteId,
    status: String(formData.get(`status-${athleteId}`) ?? "ABWESEND"),
  }));

  const parsed = attendanceListUpdateSchema.safeParse({
    listId,
    items,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const list = await prisma.attendanceList.findUnique({
    where: { id: parsed.data.listId },
    include: {
      group: { include: { assignments: true } },
    },
  });

  if (!list) {
    throw new Error("Anwesenheitsliste nicht gefunden.");
  }

  if (list.isFinalized && !canManageFinalizedAttendance(session.user.role)) {
    throw new Error("Diese Anwesenheitsliste ist bereits finalisiert.");
  }

  const canAccess =
    canManageGroups(session.user.role) || list.group.assignments.some((entry) => entry.userId === session.user.id);
  if (!canAccess) {
    throw new Error("Keine Berechtigung für diese Anwesenheitsliste.");
  }

  const athleteIdsToSave = parsed.data.items.map((item) => item.athleteId);
  const existingAthletes = await prisma.athlete.findMany({
    where: { id: { in: athleteIdsToSave }, groupId: list.groupId },
    select: { id: true },
  });

  if (existingAthletes.length !== athleteIdsToSave.length) {
    throw new Error("Mindestens ein Sportler gehört nicht zur gewählten Gruppe.");
  }

  await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.attendanceListItem.upsert({
        where: {
          listId_athleteId: {
            listId: list.id,
            athleteId: item.athleteId,
          },
        },
        update: {
          status: item.status,
        },
        create: {
          listId: list.id,
          athleteId: item.athleteId,
          status: item.status,
        },
      }),
    ),
  );

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${list.groupId}`);
}

export async function finalizeAttendanceListAction(formData: FormData) {
  const session = await requireAuth();

  const parsed = attendanceListFinalizeSchema.safeParse({
    listId: String(formData.get("listId") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const list = await prisma.attendanceList.findUnique({
    where: { id: parsed.data.listId },
    include: {
      group: { include: { assignments: true } },
    },
  });

  if (!list) {
    throw new Error("Anwesenheitsliste nicht gefunden.");
  }

  const canAccess =
    canManageGroups(session.user.role) || list.group.assignments.some((entry) => entry.userId === session.user.id);
  if (!canAccess) {
    throw new Error("Keine Berechtigung für diese Anwesenheitsliste.");
  }

  await prisma.attendanceList.update({
    where: { id: list.id },
    data: { isFinalized: true },
  });

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${list.groupId}`);
}

export async function deleteAttendanceListAction(formData: FormData) {
  const session = await requireAuth();

  const parsed = attendanceListFinalizeSchema.safeParse({
    listId: String(formData.get("listId") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const list = await prisma.attendanceList.findUnique({
    where: { id: parsed.data.listId },
    include: {
      group: { include: { assignments: true } },
    },
  });

  if (!list) {
    throw new Error("Anwesenheitsliste nicht gefunden.");
  }

  const canAccess =
    canManageGroups(session.user.role) || list.group.assignments.some((entry) => entry.userId === session.user.id);
  if (!canAccess) {
    throw new Error("Keine Berechtigung für diese Anwesenheitsliste.");
  }

  if (list.isFinalized && !canManageFinalizedAttendance(session.user.role)) {
    throw new Error("Finalisierte Listen dürfen nur von Admin, Leitung oder GRUPPEN-VERWALTUNG gelöscht werden.");
  }

  await prisma.attendanceList.delete({ where: { id: list.id } });

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${list.groupId}`);
}

export async function createAthleteAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageAthletes(session.user.role)) {
    return;
  }

  const parsed = athleteSchema.safeParse({
    groupId: String(formData.get("groupId") ?? ""),
    name: String(formData.get("name") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    active: checkboxValue(formData.get("active")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await canEditGroup(session.user.id, session.user.role, parsed.data.groupId);

  await prisma.athlete.create({
    data: {
      groupId: parsed.data.groupId,
      name: parsed.data.name,
      birthDate: parsed.data.birthDate ?? null,
      active: parsed.data.active,
    },
  });

  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/athletes");
}

export async function createAthletesBatchAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageAthletes(session.user.role)) {
    return;
  }

  const groupId = String(formData.get("groupId") ?? "");
  const raw = String(formData.get("batchInput") ?? "");
  const lines = raw.split(/\r?\n/g);

  const parsed = athleteBatchCreateSchema.safeParse({ groupId, lines });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await canEditGroup(session.user.id, session.user.role, parsed.data.groupId);

  const athletesToCreate = parsed.data.lines.map((line) => {
    const [namePart, birthPart] = line.split(";").map((value) => value.trim());
    if (!namePart) {
      throw new Error("Jede Zeile benötigt mindestens einen Namen.");
    }

    let birthDate: Date | null = null;
    if (birthPart) {
      const parsedDate = new Date(birthPart);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`Ungültiges Geburtsdatum in Zeile: ${line}`);
      }
      birthDate = parsedDate;
    }

    return {
      groupId: parsed.data.groupId,
      name: namePart,
      birthDate,
      active: true,
    };
  });

  await prisma.athlete.createMany({
    data: athletesToCreate,
  });

  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/athletes");
}

export async function updateAthleteAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageAthletes(session.user.role)) {
    return;
  }

  const parsed = updateAthleteSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    groupId: String(formData.get("groupId") ?? ""),
    name: String(formData.get("name") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    active: checkboxValue(formData.get("active")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await canEditGroup(session.user.id, session.user.role, parsed.data.groupId);

  await prisma.athlete.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      birthDate: parsed.data.birthDate ?? null,
      active: parsed.data.active,
    },
  });

  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/athletes");
}

export async function deleteAthleteAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageAthletes(session.user.role)) {
    return;
  }
  const id = String(formData.get("id") ?? "");
  const groupId = String(formData.get("groupId") ?? "");

  await canEditGroup(session.user.id, session.user.role, groupId);

  await prisma.athlete.delete({ where: { id } });
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/athletes");
}

export async function createAthleteTrainingEntryAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageAthletes(session.user.role)) {
    return;
  }

  const parsed = athleteTrainingEntrySchema.safeParse({
    athleteId: String(formData.get("athleteId") ?? ""),
    trainingDate: String(formData.get("trainingDate") ?? ""),
    result: String(formData.get("result") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const athlete = await prisma.athlete.findUnique({ where: { id: parsed.data.athleteId } });
  if (!athlete) {
    throw new Error("Sportler nicht gefunden");
  }

  await canEditGroup(session.user.id, session.user.role, athlete.groupId);

  await prisma.athleteTrainingEntry.create({
    data: {
      athleteId: parsed.data.athleteId,
      trainingDate: parsed.data.trainingDate,
      result: parsed.data.result,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath(`/groups/${athlete.groupId}`);
}

export async function deleteAthleteTrainingEntryAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageAthletes(session.user.role)) {
    return;
  }

  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) {
    throw new Error("Eintrags-ID fehlt");
  }

  const entry = await prisma.athleteTrainingEntry.findUnique({
    where: { id: entryId },
    include: {
      athlete: {
        select: { groupId: true },
      },
    },
  });

  if (!entry) {
    throw new Error("Trainingseintrag nicht gefunden");
  }

  await canEditGroup(session.user.id, session.user.role, entry.athlete.groupId);

  await prisma.athleteTrainingEntry.delete({ where: { id: entry.id } });

  revalidatePath(`/groups/${entry.athlete.groupId}`);
}

export async function moveAthletesAction(formData: FormData) {
  const session = await requireAuth();
  if (!canMoveAthletes(session.user.role)) {
    throw new Error("Nur die Leitung darf Sportler zwischen Gruppen verschieben.");
  }

  const parsed = moveAthletesSchema.safeParse({
    sourceGroupId: String(formData.get("sourceGroupId") ?? ""),
    targetGroupId: String(formData.get("targetGroupId") ?? ""),
    athleteIds: formData.getAll("athleteIds").map((value) => String(value)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  if (parsed.data.sourceGroupId === parsed.data.targetGroupId) {
    throw new Error("Quell- und Zielgruppe dürfen nicht identisch sein.");
  }

  await canEditGroup(session.user.id, session.user.role, parsed.data.sourceGroupId);
  await canEditGroup(session.user.id, session.user.role, parsed.data.targetGroupId);

  await prisma.athlete.updateMany({
    where: {
      id: { in: parsed.data.athleteIds },
      groupId: parsed.data.sourceGroupId,
    },
    data: {
      groupId: parsed.data.targetGroupId,
    },
  });

  revalidatePath(`/groups/${parsed.data.sourceGroupId}`);
  revalidatePath(`/groups/${parsed.data.targetGroupId}`);
  revalidatePath("/athletes");
}

export async function removeTrainerFromGroupAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageGroups(session.user.role)) {
    return;
  }

  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  await prisma.trainingGroupAssignment.deleteMany({
    where: { groupId, userId },
  });

  revalidatePath(`/groups/${groupId}`);
}

export async function createCalendarEventAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageCalendar(session.user.role)) {
    return;
  }

  const parsed = calendarEventSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? EventType.VERANSTALTUNG) as EventType,
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await prisma.calendarEvent.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
    },
  });

  revalidatePath("/calendar");
}

export async function updateCalendarEventAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageCalendar(session.user.role)) {
    return;
  }

  const eventId = String(formData.get("id") ?? "");
  const parsed = calendarEventSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? EventType.VERANSTALTUNG) as EventType,
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: parsed.data,
  });

  revalidatePath("/calendar");
}

export async function deleteCalendarEventAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageCalendar(session.user.role)) {
    return;
  }

  const id = String(formData.get("id") ?? "");
  await prisma.calendarEvent.delete({ where: { id } });
  revalidatePath("/calendar");
}

export async function createAnnouncementAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageAnnouncements(session.user.role)) {
    return;
  }

  const parsed = announcementSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    priority: String(formData.get("priority") ?? AnnouncementPriority.MITTEL) as AnnouncementPriority,
    validFrom: String(formData.get("validFrom") ?? ""),
    validTo: String(formData.get("validTo") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await prisma.announcement.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
    },
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}

export async function archiveAnnouncementAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageAnnouncements(session.user.role)) {
    return;
  }

  const id = String(formData.get("id") ?? "");
  await prisma.announcement.update({
    where: { id },
    data: { archived: true },
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}

export async function changeOwnPasswordAction(formData: FormData) {
  const session = await requireAuth();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    throw new Error("Benutzer nicht gefunden");
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Aktuelles Passwort ist falsch");
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  revalidatePath("/profile");
}