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
  markTrainerPayoutSchema,
  athleteSchema,
  athleteTrainingEntrySchema,
  assignmentSchema,
  calendarEventSchema,
  changePasswordSchema,
  createUserSchema,
  updateTrainerCompensationSchema,
  resetPasswordSchema,
  trainingGroupSchema,
  updateAthleteSchema,
  updateUserSchema,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaMismatchError } from "@/lib/prisma-errors";
import { requireAuth, requireRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { computeCompensationSummary } from "@/lib/compensation";

function checkboxValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function twoDecimals(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "USER_CREATE",
    targetType: "User",
    targetId: parsed.data.username,
    message: `Benutzer ${parsed.data.displayName} (${parsed.data.username}) erstellt.`,
    metadata: { role: parsed.data.role, active: parsed.data.active },
  });

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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "USER_UPDATE",
    targetType: "User",
    targetId: parsed.data.id,
    message: `Benutzer ${parsed.data.username} aktualisiert.`,
    metadata: { role: parsed.data.role, active: parsed.data.active },
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

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, displayName: true },
  });

  await prisma.user.delete({ where: { id } });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "USER_DELETE",
    targetType: "User",
    targetId: id,
    message: `Benutzer ${targetUser?.displayName ?? "Unbekannt"} (${targetUser?.username ?? id}) gelöscht.`,
  });

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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "USER_PASSWORD_RESET",
    targetType: "User",
    targetId: parsed.data.id,
    message: "Temporäres Passwort zurückgesetzt.",
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

  const group = await prisma.trainingGroup.create({
    data: parsed.data,
  });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "GROUP_CREATE",
    targetType: "TrainingGroup",
    targetId: group.id,
    message: `Trainingsgruppe ${group.name} erstellt.`,
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

  const updated = await prisma.trainingGroup.update({
    where: { id: groupId },
    data: parsed.data,
  });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "GROUP_UPDATE",
    targetType: "TrainingGroup",
    targetId: groupId,
    message: `Trainingsgruppe ${updated.name} aktualisiert.`,
    metadata: { active: updated.active },
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

  const group = await prisma.trainingGroup.findUnique({ where: { id: groupId }, select: { name: true } });
  await prisma.trainingGroup.delete({ where: { id: groupId } });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "GROUP_DELETE",
    targetType: "TrainingGroup",
    targetId: groupId,
    message: `Trainingsgruppe ${group?.name ?? groupId} gelöscht.`,
  });

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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "GROUP_ASSIGN_TRAINERS",
    targetType: "TrainingGroup",
    targetId: parsed.data.groupId,
    message: `Trainer-Zuweisungen für Gruppe ${parsed.data.groupId} aktualisiert.`,
    metadata: { userIds: parsed.data.userIds },
  });

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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATTENDANCE_SAVE",
    targetType: "TrainingGroup",
    targetId: parsed.data.groupId,
    message: `Anwesenheit für ${parsed.data.date.toLocaleDateString("de-DE")} gespeichert.`,
    metadata: { items: parsed.data.items.length },
  });

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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATTENDANCE_LIST_CREATE",
    targetType: "AttendanceList",
    targetId: list.id,
    message: `Anwesenheitsliste ${parsed.data.title} erstellt.`,
    metadata: { groupId: parsed.data.groupId, date: parsed.data.date.toISOString() },
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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATTENDANCE_LIST_UPDATE",
    targetType: "AttendanceList",
    targetId: list.id,
    message: `Anwesenheitsliste ${list.title} aktualisiert.`,
    metadata: { items: parsed.data.items.length, isFinalized: list.isFinalized },
  });

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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATTENDANCE_LIST_FINALIZE",
    targetType: "AttendanceList",
    targetId: list.id,
    message: `Anwesenheitsliste ${list.title} finalisiert.`,
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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATTENDANCE_LIST_DELETE",
    targetType: "AttendanceList",
    targetId: list.id,
    message: `Anwesenheitsliste ${list.title} gelöscht.`,
    metadata: { isFinalized: list.isFinalized },
  });

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

  const athlete = await prisma.athlete.create({
    data: {
      groupId: parsed.data.groupId,
      name: parsed.data.name,
      birthDate: parsed.data.birthDate ?? null,
      active: parsed.data.active,
    },
  });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATHLETE_CREATE",
    targetType: "Athlete",
    targetId: athlete.id,
    message: `Sportler ${athlete.name} erstellt.`,
    metadata: { groupId: parsed.data.groupId },
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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATHLETE_BATCH_CREATE",
    targetType: "TrainingGroup",
    targetId: parsed.data.groupId,
    message: `${athletesToCreate.length} Sportler per Sammelimport erstellt.`,
    metadata: { count: athletesToCreate.length },
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

  const athlete = await prisma.athlete.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      birthDate: parsed.data.birthDate ?? null,
      active: parsed.data.active,
    },
  });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATHLETE_UPDATE",
    targetType: "Athlete",
    targetId: athlete.id,
    message: `Sportler ${athlete.name} aktualisiert.`,
    metadata: { groupId: parsed.data.groupId, active: parsed.data.active },
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

  const athlete = await prisma.athlete.findUnique({ where: { id }, select: { id: true, name: true } });
  await prisma.athlete.delete({ where: { id } });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATHLETE_DELETE",
    targetType: "Athlete",
    targetId: id,
    message: `Sportler ${athlete?.name ?? id} gelöscht.`,
    metadata: { groupId },
  });
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

  const entry = await prisma.athleteTrainingEntry.create({
    data: {
      athleteId: parsed.data.athleteId,
      trainingDate: parsed.data.trainingDate,
      result: parsed.data.result,
      notes: parsed.data.notes ?? null,
    },
  });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATHLETE_TRAINING_ENTRY_CREATE",
    targetType: "AthleteTrainingEntry",
    targetId: entry.id,
    message: `Trainingseintrag für Sportler ${athlete.id} erstellt.`,
    metadata: { athleteId: athlete.id, groupId: athlete.groupId },
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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATHLETE_TRAINING_ENTRY_DELETE",
    targetType: "AthleteTrainingEntry",
    targetId: entry.id,
    message: `Trainingseintrag ${entry.id} gelöscht.`,
    metadata: { athleteId: entry.athleteId, groupId: entry.athlete.groupId },
  });

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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ATHLETE_MOVE",
    targetType: "TrainingGroup",
    targetId: parsed.data.sourceGroupId,
    message: `${parsed.data.athleteIds.length} Sportler verschoben.`,
    metadata: {
      sourceGroupId: parsed.data.sourceGroupId,
      targetGroupId: parsed.data.targetGroupId,
      athleteIds: parsed.data.athleteIds,
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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "GROUP_REMOVE_TRAINER",
    targetType: "TrainingGroup",
    targetId: groupId,
    message: `Trainer ${userId} aus Gruppe entfernt.`,
    metadata: { userId },
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
    durationHours: String(formData.get("durationHours") ?? "1"),
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
    groupIds: formData.getAll("groupIds").map((value) => String(value)),
    trainerIds: formData.getAll("trainerIds").map((value) => String(value)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  let event;
  try {
    event = await prisma.calendarEvent.create({
      data: {
        title: parsed.data.title,
        type: parsed.data.type,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        durationHours: twoDecimals(parsed.data.durationHours),
        location: parsed.data.location,
        description: parsed.data.description,
        createdById: session.user.id,
        groups: {
          connect: parsed.data.groupIds.map((id) => ({ id })),
        },
        trainers: {
          connect: parsed.data.trainerIds.map((id) => ({ id })),
        },
      },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      throw new Error("Datenbank-Migration fehlt: Bitte zuerst Prisma-Migration ausführen.");
    }
    throw error;
  }

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "CALENDAR_EVENT_CREATE",
    targetType: "CalendarEvent",
    targetId: event.id,
    message: `Kalendereintrag ${event.title} erstellt.`,
    metadata: {
      type: parsed.data.type,
      durationHours: twoDecimals(parsed.data.durationHours),
      groupIds: parsed.data.groupIds,
      trainerIds: parsed.data.trainerIds,
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
    durationHours: String(formData.get("durationHours") ?? "1"),
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
    groupIds: formData.getAll("groupIds").map((value) => String(value)),
    trainerIds: formData.getAll("trainerIds").map((value) => String(value)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  try {
    await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title: parsed.data.title,
        type: parsed.data.type,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        durationHours: twoDecimals(parsed.data.durationHours),
        location: parsed.data.location,
        description: parsed.data.description,
        groups: {
          set: parsed.data.groupIds.map((id) => ({ id })),
        },
        trainers: {
          set: parsed.data.trainerIds.map((id) => ({ id })),
        },
      },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      throw new Error("Datenbank-Migration fehlt: Bitte zuerst Prisma-Migration ausführen.");
    }
    throw error;
  }

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "CALENDAR_EVENT_UPDATE",
    targetType: "CalendarEvent",
    targetId: eventId,
    message: `Kalendereintrag ${eventId} aktualisiert.`,
    metadata: {
      type: parsed.data.type,
      durationHours: twoDecimals(parsed.data.durationHours),
      groupIds: parsed.data.groupIds,
      trainerIds: parsed.data.trainerIds,
    },
  });

  revalidatePath("/calendar");
}

export async function deleteCalendarEventAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageCalendar(session.user.role)) {
    return;
  }

  const id = String(formData.get("id") ?? "");
  const event = await prisma.calendarEvent.findUnique({ where: { id }, select: { title: true } });
  await prisma.calendarEvent.delete({ where: { id } });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "CALENDAR_EVENT_DELETE",
    targetType: "CalendarEvent",
    targetId: id,
    message: `Kalendereintrag ${event?.title ?? id} gelöscht.`,
  });
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
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const announcement = await prisma.announcement.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
    },
  });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ANNOUNCEMENT_CREATE",
    targetType: "Announcement",
    targetId: announcement.id,
    message: `Ankündigung ${announcement.title} erstellt.`,
    metadata: { priority: announcement.priority },
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
  const announcement = await prisma.announcement.update({
    where: { id },
    data: { archived: true },
  });

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "ANNOUNCEMENT_ARCHIVE",
    targetType: "Announcement",
    targetId: id,
    message: `Ankündigung ${announcement.title} archiviert.`,
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

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "USER_CHANGE_OWN_PASSWORD",
    targetType: "User",
    targetId: session.user.id,
    message: "Eigenes Passwort geändert.",
  });

  revalidatePath("/profile");
}

export async function updateTrainerCompensationAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN, Role.LEITUNG]);

  const parsed = updateTrainerCompensationSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    hourlyRate: String(formData.get("hourlyRate") ?? "0"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, displayName: true, role: true },
  });

  if (!user) {
    throw new Error("Trainer nicht gefunden.");
  }

  if (user.role !== Role.TRAINER && user.role !== Role.GRUPPEN_VERWALTUNG) {
    throw new Error("Stundensatz kann nur für Trainer gesetzt werden.");
  }

  const normalizedRate = twoDecimals(parsed.data.hourlyRate);
  try {
    await prisma.trainerCompensation.upsert({
      where: { userId: parsed.data.userId },
      update: { hourlyRate: normalizedRate },
      create: {
        userId: parsed.data.userId,
        hourlyRate: normalizedRate,
      },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      throw new Error("Datenbank-Migration fehlt: Bitte zuerst Prisma-Migration ausführen.");
    }
    throw error;
  }

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "TRAINER_COMPENSATION_RATE_SET",
    targetType: "User",
    targetId: user.id,
    message: `Stundensatz für ${user.displayName} gesetzt.`,
    metadata: { hourlyRate: normalizedRate },
  });

  revalidatePath("/compensation");
  revalidatePath("/dashboard");
}

export async function markTrainerPayoutAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN, Role.LEITUNG]);

  const parsed = markTrainerPayoutSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: {
        id: true,
        displayName: true,
        role: true,
        compensation: {
          select: {
            hourlyRate: true,
            totalPaid: true,
            lastPayoutAt: true,
          },
        },
        participatingEvents: {
          select: { endDate: true, durationHours: true },
        },
      },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      throw new Error("Datenbank-Migration fehlt: Bitte zuerst Prisma-Migration ausführen.");
    }
    throw error;
  }

  if (!user) {
    throw new Error("Trainer nicht gefunden.");
  }

  if (user.role !== Role.TRAINER && user.role !== Role.GRUPPEN_VERWALTUNG) {
    throw new Error("Auszahlung kann nur für Trainer markiert werden.");
  }

  const summary = computeCompensationSummary(user.participatingEvents, user.compensation);
  const amountToMarkAsPaid = summary.earnedSincePayout;

  try {
    await prisma.trainerCompensation.upsert({
      where: { userId: user.id },
      update: {
        totalPaid: twoDecimals(summary.totalPaid + amountToMarkAsPaid),
        lastPayoutAt: new Date(),
      },
      create: {
        userId: user.id,
        hourlyRate: summary.hourlyRate,
        totalPaid: amountToMarkAsPaid,
        lastPayoutAt: new Date(),
      },
    });
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      throw new Error("Datenbank-Migration fehlt: Bitte zuerst Prisma-Migration ausführen.");
    }
    throw error;
  }

  await createAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "TRAINER_COMPENSATION_MARK_PAID",
    targetType: "User",
    targetId: user.id,
    message: `Auszahlung für ${user.displayName} als erledigt markiert.`,
    metadata: { amountMarkedAsPaid: amountToMarkAsPaid },
  });

  revalidatePath("/compensation");
  revalidatePath("/dashboard");
}