export const ROLES = Object.freeze({
  TENANT: 'tenant',
  LANDLORD: 'landlord',
  PROPERTY_MANAGER: 'property_manager',
  CARETAKER: 'caretaker',
  AGENT: 'agent',
  SUPER_ADMIN: 'super_admin'
});

export const MANAGEMENT_ROLES = [
  ROLES.LANDLORD,
  ROLES.PROPERTY_MANAGER,
  ROLES.SUPER_ADMIN
];

export const STAFF_ROLES = [
  ROLES.CARETAKER,
  ROLES.AGENT
];

export const SELF_SERVICE_REGISTRATION_OPTIONS = [
  {
    value: ROLES.TENANT,
    label: 'Tenant',
    description: 'Vacant unit'
  },
  {
    value: ROLES.LANDLORD,
    label: 'Landlord',
    description: 'Own portfolio'
  },
  {
    value: ROLES.PROPERTY_MANAGER,
    label: 'Property Manager',
    description: 'Managed portfolio'
  }
];

export const isManagementRole = (role) => MANAGEMENT_ROLES.includes(role);
export const isStaffRole = (role) => STAFF_ROLES.includes(role);
export const isTenantRole = (role) => role === ROLES.TENANT;

export const formatRoleLabel = (role) => (
  role
    ? role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    : 'User'
);
