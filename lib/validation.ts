import { AnnouncementPriority, EventType, Role } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Benutzername ist zu kurz."),
  password: z.string().min(8, "Passwort ist zu kurz."),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Benutzername muss mindestens 3 Zeichen haben.")
    .max(40, "Benutzername darf maximal 40 Zeichen haben.")
    .regex(
      /^[\p{L}\p{N}._@+\-!#$%&=?]+$/u,
      "Benutzername darf Buchstaben, Zahlen sowie . _ - @ + ! # $ % & = ? enthalten.",
    ),
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
    .regex(
      /^[\p{L}\p{N}._@+\-!#$%&=?]+$/u,
      "Benutzername darf Buchstaben, Zahlen sowie . _ - @ + ! # $ % & = ? enthalten.",
    ),
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
  season: z.coerce.number().int().min(2000).max(2100),
  active: z.boolean().default(true),
});

export const assignmentSchema = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
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
