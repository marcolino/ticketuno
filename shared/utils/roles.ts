// utils/roles.ts  — usable on both frontend and backend (pure TS, no dependencies)

const ROLES = ['user', 'operator', 'admin'] as const;
export type Role = typeof ROLES[number];

const ROLE_LEVEL: Record<Role, number> = {
  user:     1,
  operator: 2,
  admin:    3,
};

const level = (role: string): number =>
  ROLE_LEVEL[role as Role] ?? 0;

/** Can `actorRole` manage an account that currently has `targetRole`? */
export const userCanManageAccount = (actorRole: string, targetRole: string): boolean =>
  level(actorRole) >= level(targetRole);

/** Can `actorRole` assign `newRole` to someone? */
export const userCanAssignRole = (actorRole: string, newRole: string): boolean =>
  level(actorRole) >= level(newRole);

/** Full check: can `actorRole` change the role of an account with `targetCurrentRole` to `newRole`? */
export const userCanSetRole = (
  actorRole: string,
  targetCurrentRole: string,
  newRole: string,
): boolean =>
  userCanManageAccount(actorRole, targetCurrentRole) &&
  userCanAssignRole(actorRole, newRole);

/** Returns the list of roles that `actorRole` is allowed to assign */
export const assignableRoles = (actorRole: string): Role[] =>
  ROLES.filter(r => userCanAssignRole(actorRole, r));
