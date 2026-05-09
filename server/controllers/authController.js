const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Organization, OrganizationMembership, Property, Tenant, User, Subscription } = require('../models');
const { logAudit } = require('../helpers/audit');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { sendError } = require('../helpers/apiResponse');
const { ROLES } = require('../helpers/rbac');
const { transaction } = require('../config/database');
const { sendPaymentConfirmation, notifyLandlord, sendAccountCreatedEmail } = require('../services/emailService');
const { createTenantSchema } = require('../services/tenantService');

const managerRoles = [ROLES.LANDLORD, ROLES.PROPERTY_MANAGER];

const buildUserResponse = (user, organizationId = user?.organization_id || null) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  phoneNumber: user.phone_number,
  interestedProperty: user.interested_property_id,
  interestedUnit: user.interested_unit,
  organization: organizationId,
  requiresPasswordChange: user.requires_password_change
});

const resolveOrganizationContext = async (user, requestedOrganizationId = null) => {
  let memberships = await OrganizationMembership.listByUser(user.id);

  if (!memberships.length && user.organization_id) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organization_id,
      isDefault: true
    });
    memberships = await OrganizationMembership.listByUser(user.id);
  }

  let activeOrganization = null;
  if (requestedOrganizationId) {
    activeOrganization = memberships.find((membership) =>
      membership.organization_id === requestedOrganizationId || membership.id === requestedOrganizationId
    );
    if (!activeOrganization) {
      throw new Error('This account does not belong to the selected organization');
    }
  } else {
    activeOrganization = memberships.find((membership) =>
      membership.is_default && ['trial', 'active'].includes(membership.status)
    ) || memberships.find((membership) =>
      ['trial', 'active'].includes(membership.status)
    ) || memberships.find((membership) => membership.is_default) || memberships[0] || null;
  }

  if (!activeOrganization) {
    throw new Error('No organization membership found for this account');
  }

  if (!['trial', 'active'].includes(activeOrganization.status)) {
    throw new Error('Selected organization account is not active');
  }

  await OrganizationMembership.setDefault(user.id, activeOrganization.organization_id);
  memberships = await OrganizationMembership.listByUser(user.id);
  activeOrganization = memberships.find((membership) =>
    membership.organization_id === activeOrganization.organization_id
  ) || activeOrganization;

  return {
    activeOrganization,
    organizations: memberships
  };
};

const getAvailableProperties = async (req, res) => {
  const organizations = await Organization.findAll();
  const availableProperties = [];

  for (const organization of organizations) {
    if (!organization.schema_name || !['trial', 'active'].includes(organization.status)) continue;
    
    // If user is logged in as a tenant/manager, only show properties from their organization
    if (req.organizationId && organization.id !== req.organizationId) {
      continue;
    }

    let properties = [];
    try {
      properties = await Property.find(organization.schema_name);
    } catch (error) {
      continue;
    }

    for (const property of properties) {
      const activeTenants = await Tenant.find(organization.schema_name, {
        propertyId: property.id,
        status: 'active'
      });
      const occupiedUnits = activeTenants.map((tenant) => tenant.unit);
      const unoccupiedUnits = (property.units || []).filter((unit) => !occupiedUnits.includes(unit));

      if (unoccupiedUnits.length) {
        availableProperties.push({
          _id: property.id,
          name: property.name,
          address: property.address,
          units: unoccupiedUnits,
          organizationId: organization.id
        });
      }
    }
  }

  res.json(availableProperties);
};

const submitInquiry = async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    interestedProperty,
    interestedUnit,
    organizationId
  } = req.body;

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    sendError(res, 400, 'User with this email already exists. Please login to apply or use a different email.');
    return;
  }

  let resolvedOrganizationId = organizationId;
  let resolvedSchema = null;

  if (interestedProperty) {
    const orgs = await Organization.findAll();
    for (const org of orgs) {
      if (!['trial', 'active'].includes(org.status)) continue;
      const property = await Property.findById(org.schema_name, interestedProperty);
      if (property) {
        resolvedOrganizationId = org.id;
        resolvedSchema = org.schema_name;
        break;
      }
    }
  }

  if (!resolvedOrganizationId) {
    sendError(res, 404, 'The selected property was not found or is no longer available.');
    return;
  }

  // Generate a random placeholder password
  const placeholderPassword = crypto.randomBytes(16).toString('hex');

  const user = await User.create({
    organizationId: resolvedOrganizationId,
    name,
    email,
    password: placeholderPassword,
    phoneNumber,
    role: ROLES.TENANT,
    status: 'pending',
    interestedPropertyId: interestedProperty,
    interestedPropertySchema: resolvedSchema,
    interestedUnit,
    requiresPasswordChange: true
  });

  await logAudit({
    organization: resolvedOrganizationId,
    actor: user.id,
    action: 'Tenant inquiry submitted',
    entityType: 'user',
    entityId: user.id,
    metadata: {
      summary: `Unit ${interestedUnit || 'pending'} request from ${name}`,
      propertyId: interestedProperty,
      unit: interestedUnit
    }
  });

  res.status(201).json({
    message: 'Inquiry submitted successfully. The landlord will review your request and contact you with further instructions.',
    status: user.status
  });
};

const register = async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    interestedProperty,
    interestedUnit,
    phoneNumber,
    organizationId
  } = req.body;

  if (!name || !email || !password || !role) {
    sendError(res, 400, 'Name, email, password and role are required');
    return;
  }

  if (!Object.values(ROLES).includes(role)) {
    sendError(res, 400, 'Unsupported role selected');
    return;
  }

  if (role === ROLES.SUPER_ADMIN) {
    sendError(res, 403, 'Super admin accounts cannot be self-registered');
    return;
  }

  const existingUser = await User.findByEmail(email);
  const canCreateAdditionalPortfolio = existingUser
    && managerRoles.includes(role)
    && managerRoles.includes(existingUser.role);

  if (existingUser && !canCreateAdditionalPortfolio) {
    sendError(res, 400, 'User with this email already exists');
    return;
  }

  if (canCreateAdditionalPortfolio) {
    if (!existingUser.is_active || existingUser.status !== 'active') {
      sendError(res, 403, 'Existing account is not active');
      return;
    }

    const validExistingPassword = await User.verifyPassword(existingUser, password);
    if (!validExistingPassword) {
      sendError(res, 409, 'This email is already linked to an account. Sign in with the same password to add another portfolio.');
      return;
    }
  }

  let organization = null;
  let resolvedOrganizationId = null;
  let resolvedSchema = null;
  let user = existingUser || null;

  if (managerRoles.includes(role)) {
    await transaction(async (client) => {
      organization = await Organization.create({
        name: `${name}'s Portfolio`,
        status: 'trial',
        subscriptionPlan: 'basic',
        billingCycle: 'monthly'
      }, client);

      await Subscription.create({
        organizationId: organization.id,
        plan: 'basic',
        billingCycle: 'monthly',
        status: 'trial'
      }, client);

      if (user) {
        user = await User.update(user.id, {
          organization_id: organization.id
        }, client);
      } else {
        user = await User.create({
          organizationId: organization.id,
          name,
          email,
          password,
          phoneNumber,
          role,
          status: 'active'
        }, client);
      }

      await Organization.update(organization.id, { owner_id: user.id }, client);
      await OrganizationMembership.create({
        userId: user.id,
        organizationId: organization.id,
        isDefault: true
      }, client);
    });

    await createTenantSchema(organization.schema_name);
    resolvedOrganizationId = organization.id;
    resolvedSchema = organization.schema_name;
  } else if (interestedProperty) {
    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (!org) {
        sendError(res, 404, 'Organization not found');
        return;
      }
      if (!['trial', 'active'].includes(org.status)) {
        sendError(res, 403, 'Organization account is not active');
        return;
      }
      const property = await Property.findById(org.schema_name, interestedProperty);
      if (!property) {
        sendError(res, 404, 'Property not found');
        return;
      }
      resolvedOrganizationId = org.id;
      resolvedSchema = org.schema_name;
    } else {
      const organizations = await Organization.findAll();
      for (const org of organizations) {
        if (!['trial', 'active'].includes(org.status)) continue;
        const property = await Property.findById(org.schema_name, interestedProperty);
        if (property) {
          resolvedOrganizationId = org.id;
          resolvedSchema = org.schema_name;
          break;
        }
      }
    }
  }

  if (role === ROLES.TENANT && interestedProperty && !resolvedOrganizationId) {
    sendError(res, 404, 'Property not found');
    return;
  }

  const status = 'pending';
  if (!user) {
    user = await User.create({
      organizationId: resolvedOrganizationId,
      name,
      email,
      password,
      phoneNumber,
      role,
      status,
      interestedPropertyId: role === ROLES.TENANT ? interestedProperty : null,
      interestedPropertySchema: role === ROLES.TENANT ? resolvedSchema : null,
      interestedUnit: role === ROLES.TENANT ? interestedUnit : null
    });
  }

  const message = 'Registration request submitted. Waiting for approval.';

  await logAudit({
    organization: resolvedOrganizationId,
    actor: user.id,
    action: managerRoles.includes(role) ? 'Account registered' : 'Tenant application submitted',
    entityType: 'user',
    entityId: user.id,
    metadata: {
      role,
      status,
      summary: managerRoles.includes(role)
        ? `${role.replace(/_/g, ' ')} account`
        : `Unit ${interestedUnit || 'pending'} request`,
      propertyId: interestedProperty || null,
      unit: interestedUnit || null
    }
  });

  res.status(201).json({
    message,
    status: user.status,
    organizationId: resolvedOrganizationId
  });
};

const login = async (req, res) => {
  const { email, password, organizationId } = req.body;

  const user = await User.findByEmail(email);
  if (!user) {
    sendError(res, 401, 'Invalid email or password');
    return;
  }

  const validPassword = await User.verifyPassword(user, password);
  if (!validPassword) {
    sendError(res, 401, 'Invalid email or password');
    return;
  }

  if (user.status !== 'active' || !user.is_active) {
    sendError(res, 403, 'Account is not active');
    return;
  }

  let activeOrganizationId = user.organization_id;
  let activeOrganization = null;
  let organizations = [];
  if (user.role !== ROLES.SUPER_ADMIN) {
    try {
      const context = await resolveOrganizationContext(user, organizationId || null);
      activeOrganization = context.activeOrganization;
      organizations = context.organizations;
      activeOrganizationId = activeOrganization.organization_id;
    } catch (error) {
      sendError(res, 403, error.message);
      return;
    }
  } else {
    activeOrganizationId = null;
  }

  await User.update(user.id, { last_login_at: new Date() });

  await logAudit({
    organization: activeOrganizationId || null,
    actor: user.id,
    action: 'User signed in',
    entityType: 'session',
    entityId: user.id,
    metadata: {
      role: user.role,
      summary: user.email
    }
  });

  const token = jwt.sign({
    id: user.id,
    role: user.role,
    organizationId: activeOrganizationId || null
  }, jwtSecret, { expiresIn: jwtExpiresIn });

  res.json({
    token,
    user: buildUserResponse(user, activeOrganizationId),
    organizationId: activeOrganizationId,
    organization: activeOrganization,
    organizations
  });
};

const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    sendError(res, 404, 'User not found');
    return;
  }

  const organizations = user.role === ROLES.SUPER_ADMIN
    ? []
    : await OrganizationMembership.listByUser(user.id);
  const organization = req.organizationId
    ? organizations.find((membership) => membership.organization_id === req.organizationId) || null
    : null;

  res.json({
    user: buildUserResponse(user, req.organizationId),
    organization,
    organizations
  });
};

const getOrganizationStaff = async (req, res) => {
  const staff = await OrganizationMembership.listByOrganization(req.organizationId);
  res.json(staff.map((s) => ({
    id: s.user_id,
    name: s.name,
    email: s.email,
    role: s.role,
    status: s.status,
    phoneNumber: s.phone_number
  })));
};

const addOrganizationStaff = async (req, res) => {
  const { name, email, password, role, phoneNumber } = req.body;

  if (role === ROLES.SUPER_ADMIN || role === ROLES.LANDLORD) {
    sendError(res, 403, 'Cannot add another landlord or super admin to the organization');
    return;
  }

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    sendError(res, 400, 'User with this email already exists');
    return;
  }

  const user = await User.create({
    organizationId: req.organizationId,
    name,
    email,
    password,
    phoneNumber,
    role,
    status: 'active', // Staff added by landlord are active immediately
    requiresPasswordChange: true
  });

  await OrganizationMembership.create({
    userId: user.id,
    organizationId: req.organizationId,
    isDefault: true
  });

  // Send the welcome email with the password
  await sendAccountCreatedEmail(email, name, password, role);

  res.status(201).json(buildUserResponse(user));
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    sendError(res, 400, 'Both current and new passwords are required');
    return;
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    sendError(res, 404, 'User not found');
    return;
  }

  const validPassword = await User.verifyPassword(user, currentPassword);
  if (!validPassword) {
    sendError(res, 401, 'Current password is incorrect');
    return;
  }

  await User.update(user.id, {
    password: newPassword,
    requires_password_change: false
  });

  await logAudit({
    organization: req.organizationId || null,
    actor: user.id,
    action: 'Password changed',
    entityType: 'user',
    entityId: user.id,
    metadata: {
      summary: 'Forced password change completed'
    }
  });

  res.json({ message: 'Password updated successfully' });
};

module.exports = {
  getAvailableProperties,
  getCurrentUser,
  getOrganizationStaff,
  addOrganizationStaff,
  register,
  login,
  changePassword,
  submitInquiry
};
