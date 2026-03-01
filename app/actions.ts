"use server";

import { AnnouncementPriority, EventType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { canManageAnnouncements, canManageCalendar, canManageGroups, canManageUsers } from "@/lib/rbac";
import {
  announcementSchema,
  assignmentSchema,
  calendarEventSchema,
  changePasswordSchema,
  createUserSchema,
  resetPasswordSchema,
  trainingGroupSchema,
  updateUserSchema,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";

function checkboxValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export async function createUserAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN]);
  if (!canManageUsers(session.user.role)) {
    return;
  }

  const parsed = createUserSchema.safeParse({
    username: String(formData.get("username") ?? "").toLowerCase(),
    displayName: String(formData.get("displayName") ?? ""),
    role: String(formData.get("role") ?? "TRAINER") as Role,
    password: String(formData.get("password") ?? ""),
    active: checkboxValue(formData.get("active")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      passwordHash,
      active: parsed.data.active,
    },
  });

  revalidatePath("/admin/users");
}

export async function updateUserAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN]);
  if (!canManageUsers(session.user.role)) {
    return;
  }

  const parsed = updateUserSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    username: String(formData.get("username") ?? "").toLowerCase(),
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

export async function resetUserPasswordAction(formData: FormData) {
  const session = await requireRole([Role.ADMIN]);
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
    season: formData.get("season"),
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
    season: formData.get("season"),
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

export async function assignTrainerToGroupAction(formData: FormData) {
  const session = await requireAuth();
  if (!canManageGroups(session.user.role)) {
    return;
  }

  const parsed = assignmentSchema.safeParse({
    groupId: String(formData.get("groupId") ?? ""),
    userId: String(formData.get("userId") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Eingaben");
  }

  await prisma.trainingGroupAssignment.upsert({
    where: {
      userId_groupId: {
        userId: parsed.data.userId,
        groupId: parsed.data.groupId,
      },
    },
    update: {},
    create: {
      userId: parsed.data.userId,
      groupId: parsed.data.groupId,
    },
  });

  revalidatePath(`/groups/${parsed.data.groupId}`);
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