const ROLES = Object.freeze({
  TENANT: 'tenant',
  LANDLORD: 'landlord',
  PROPERTY_MANAGER: 'property_manager',
  CARETAKER: 'caretaker',
  AGENT: 'agent',
  SUPER_ADMIN: 'super_admin'
});

const hasRole = (user, allowedRoles = []) => allowedRoles.includes(user?.role);

module.exports = {
  ROLES,
  hasRole
};
