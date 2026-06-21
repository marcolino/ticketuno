const ROLE_LEVEL: Record<Role, number> = {
  user: 1,
  operator: 2,
  admin: 3,
};

const level = (role: string): number =>
  ROLE_LEVEL[role as Role] ?? 0;

export const ROLES = ['user', 'operator', 'admin'] as const;

export type Role = typeof ROLES[number];

/** Can `actorRole` manage an account that currently has `targetRole`? */
export const userCanManageAccount = (actorRole: Role, targetRole: Role): boolean =>
  level(actorRole) >= level(targetRole);

/** Can `actorRole` assign `newRole` to someone? */
export const userCanAssignRole = (actorRole: Role, newRole: Role): boolean =>
  level(actorRole) >= level(newRole);

/** Full check: can `actorRole` change the role of an account with `targetCurrentRole` to `newRole`? */
export const userCanSetRole = (
  actorRole: Role,
  targetCurrentRole: Role,
  newRole: Role,
): boolean =>
  userCanManageAccount(actorRole, targetCurrentRole) &&
  userCanAssignRole(actorRole, newRole);

export const userCanManageConsent = (actorRole: Role, targetRole: Role): boolean =>
  //level(actorRole) >= ROLE_LEVEL['admin'];
  level(actorRole) >= ROLE_LEVEL[targetRole];

/** Returns the list of roles that `actorRole` is allowed to assign */
export const assignableRoles = (actorRole: Role): Role[] =>
  ROLES.filter(r => userCanAssignRole(actorRole, r));
