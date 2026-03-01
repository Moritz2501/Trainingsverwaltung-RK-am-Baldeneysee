import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { canManageAnnouncements, canManageCalendar, canManageGroups, canManageUsers, hasRequiredRole } from "../lib/rbac";

describe("RBAC helper", () => {
  it("allows ADMIN for user management", () => {
    expect(canManageUsers(Role.ADMIN)).toBe(true);
    expect(canManageUsers(Role.LEITUNG)).toBe(false);
    expect(canManageUsers(Role.TRAINER)).toBe(false);
  });

  it("allows LEITUNG and ADMIN for group/calendar/announcements", () => {
    expect(canManageGroups(Role.ADMIN)).toBe(true);
    expect(canManageGroups(Role.LEITUNG)).toBe(true);
    expect(canManageGroups(Role.TRAINER)).toBe(false);

    expect(canManageCalendar(Role.ADMIN)).toBe(true);
    expect(canManageCalendar(Role.LEITUNG)).toBe(true);
    expect(canManageCalendar(Role.TRAINER)).toBe(false);

    expect(canManageAnnouncements(Role.ADMIN)).toBe(true);
    expect(canManageAnnouncements(Role.LEITUNG)).toBe(true);
    expect(canManageAnnouncements(Role.TRAINER)).toBe(false);
  });

  it("checks role membership", () => {
    expect(hasRequiredRole(Role.ADMIN, [Role.ADMIN, Role.LEITUNG])).toBe(true);
    expect(hasRequiredRole(Role.TRAINER, [Role.ADMIN, Role.LEITUNG])).toBe(false);
  });
});
