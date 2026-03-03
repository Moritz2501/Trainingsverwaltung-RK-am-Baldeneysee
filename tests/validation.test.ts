import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { assignmentSchema, athleteSchema, athleteTrainingEntrySchema, createUserSchema, trainingGroupSchema } from "../lib/validation";

describe("validation schemas", () => {
  it("validates createUser input", () => {
    const result = createUserSchema.safeParse({
      username: "trainer.max",
      displayName: "Max Trainer",
      role: Role.TRAINER,
      password: "starkesPasswort123!",
      active: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects createUser password shorter than 4 characters", () => {
    const result = createUserSchema.safeParse({
      username: "trainer.min",
      displayName: "Min Trainer",
      role: Role.TRAINER,
      password: "123",
      active: true,
    });

    expect(result.success).toBe(false);
  });

  it("allows umlauts, spaces and special characters in username", () => {
    const result = createUserSchema.safeParse({
      username: "jörg müller+team@rk!'",
      displayName: "Jörg Müller",
      role: Role.TRAINER,
      password: "starkesPasswort123!",
      active: true,
    });

    expect(result.success).toBe(true);
  });

  it("allows additional punctuation in username", () => {
    const result = createUserSchema.safeParse({
      username: "team,leitung:(rk)/essen",
      displayName: "Team Leitung",
      role: Role.LEITUNG,
      password: "starkesPasswort123!",
      active: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid group name", () => {
    const result = trainingGroupSchema.safeParse({
      name: "G",
      description: "Test",
      active: true,
    });

    expect(result.success).toBe(false);
  });

  it("accepts non-cuid group ids for legacy groups", () => {
    const result = assignmentSchema.safeParse({
      groupId: "seed-group-2026",
      userIds: [],
    });

    expect(result.success).toBe(true);
  });

  it("allows creating athlete without birth date", () => {
    const result = athleteSchema.safeParse({
      groupId: "group-legacy-1",
      name: "Max Beispiel",
      birthDate: "",
      active: true,
    });

    expect(result.success).toBe(true);
  });

  it("allows training entry with optional notes", () => {
    const result = athleteTrainingEntrySchema.safeParse({
      athleteId: "cm2kz40ls0000rk7hax9y1n2m",
      trainingDate: "2026-03-01",
      result: "Intervalltraining 6x500m",
      notes: "Gute Technik im Endspurt.",
    });

    expect(result.success).toBe(true);
  });
});
