import { ROLES } from './roles';

const ROUTE_RULES = {
  '/': { roles: [ROLES.TENANT, ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN] },
  '/community': { roles: [ROLES.TENANT, ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN] },
  '/settings': { roles: [ROLES.TENANT, ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN] },
  '/change-password': { roles: [ROLES.TENANT, ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN] },
};

export function canAccessPath(session, pathname) {
  if (!session?.user) return false;
  
  // Super admin bypass or specific rule
  if (session.user.role === ROLES.SUPER_ADMIN) return true;

  const rule = ROUTE_RULES[pathname];
  if (!rule) return true; // Default allow if no rule defined

  const currentRole = session.user.role;
  return rule.roles.includes(currentRole);
}
