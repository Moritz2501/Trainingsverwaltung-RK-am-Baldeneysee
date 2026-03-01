import { Role } from "@prisma/client";

export function canManageUsers(role: Role) {
  return role === Role.ADMIN;
}

export function canManageGroups(role: Role) {
  return role === Role.ADMIN || role === Role.LEITUNG;
}

export function canManageCalendar(role: Role) {
  return role === Role.ADMIN || role === Role.LEITUNG;
}

export function canManageAnnouncements(role: Role) {
  return role === Role.ADMIN || role === Role.LEITUNG;
}

export function canSeeAllGroups(role: Role) {
  return role === Role.ADMIN || role === Role.LEITUNG;
}

export function hasRequiredRole(userRole: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(userRole);
}
