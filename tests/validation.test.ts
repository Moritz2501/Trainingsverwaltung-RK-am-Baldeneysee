import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { createUserSchema, trainingGroupSchema } from "../lib/validation";

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

  it("allows umlauts and special characters in username", () => {
    const result = createUserSchema.safeParse({
      username: "jörg.müller+team@rk!",
      displayName: "Jörg Müller",
      role: Role.TRAINER,
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
});
