import { AnnouncementPriority, EventType, Role } from "@prisma/client";
import { z } from "zod";

const USERNAME_PATTERN = /^[\p{L}\p{N}._@+\-!#$%&=? '\/,:;()]+$/u;
const USERNAME_ERROR_MESSAGE =
  "Benutzername darf Buchstaben, Zahlen, Leerzeichen sowie . _ - @ + ! # $ % & = ? ' / , : ; ( ) enthalten.";

export const loginSchema = z.object({
  username: z.string().trim().min(3, "Benutzername ist zu kurz."),
  password: z.string().min(8, "Passwort ist zu kurz."),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Benutzername muss mindestens 3 Zeichen haben.")
    .max(40, "Benutzername darf maximal 40 Zeichen haben.")
    .regex(USERNAME_PATTERN, USERNAME_ERROR_MESSAGE),
  displayName: z.string().min(2).max(80),
  role: z.nativeEnum(Role),
  password: z.string().min(8),
  active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  id: z.string().cuid(),
  username: z
    .string()
    .trim()
    .min(3, "Benutzername muss mindestens 3 Zeichen haben.")
    .max(40, "Benutzername darf maximal 40 Zeichen haben.")
    .regex(USERNAME_PATTERN, USERNAME_ERROR_MESSAGE),
  displayName: z.string().min(2).max(80),
  role: z.nativeEnum(Role),
  active: z.boolean(),
});

export const resetPasswordSchema = z.object({
  id: z.string().cuid(),
  newPassword: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const trainingGroupSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(2).max(1000),
  active: z.boolean().default(true),
});

export const assignmentSchema = z.object({
  groupId: z.string().min(1, "Ungültige Gruppen-ID."),
  userIds: z.array(z.string().cuid()).default([]),
});

export const athleteSchema = z.object({
  groupId: z.string().min(1, "Ungültige Gruppen-ID."),
  name: z.string().trim().min(2).max(120),
  birthDate: z.coerce.date(),
  active: z.boolean().default(true),
});

export const updateAthleteSchema = athleteSchema.extend({
  id: z.string().cuid(),
});

export const moveAthletesSchema = z.object({
  sourceGroupId: z.string().min(1, "Ungültige Gruppen-ID."),
  targetGroupId: z.string().min(1, "Ungültige Zielgruppen-ID."),
  athleteIds: z.array(z.string().cuid()).min(1, "Bitte mindestens einen Sportler auswählen."),
});

export const athleteTrainingEntrySchema = z.object({
  athleteId: z.string().cuid(),
  trainingDate: z.coerce.date(),
  result: z.string().trim().min(2).max(1000),
});

export const calendarEventSchema = z
  .object({
    title: z.string().min(2).max(180),
    type: z.nativeEnum(EventType),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    location: z.string().min(2).max(180),
    description: z.string().min(2).max(2000),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Enddatum muss nach dem Startdatum liegen.",
    path: ["endDate"],
  });

export const announcementSchema = z
  .object({
    title: z.string().min(2).max(180),
    body: z.string().min(2).max(3000),
    priority: z.nativeEnum(AnnouncementPriority),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
  })
  .refine((data) => data.validTo >= data.validFrom, {
    message: "Gültig-bis muss nach Gültig-von liegen.",
    path: ["validTo"],
  });
