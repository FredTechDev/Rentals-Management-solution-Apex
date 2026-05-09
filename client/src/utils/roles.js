export const ROLES = Object.freeze({
  TENANT: 'tenant',
  LANDLORD: 'landlord',
  PROPERTY_MANAGER: 'property_manager',
  SUPER_ADMIN: 'super_admin'
});

export const MANAGEMENT_ROLES = [
  ROLES.LANDLORD,
  ROLES.PROPERTY_MANAGER,
  ROLES.SUPER_ADMIN
];

export const SELF_SERVICE_REGISTRATION_OPTIONS = [
  {
    value: ROLES.TENANT,
    label: 'Tenant',
    description: 'Apply for a vacant unit'
  }
];

export const isManagementRole = (role) => MANAGEMENT_ROLES.includes(role);
export const isTenantRole = (role) => role === ROLES.TENANT;

export const formatRoleLabel = (role) => (
  role
    ? role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    : 'User'
);
