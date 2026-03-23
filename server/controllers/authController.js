const jwt = require('jsonwebtoken');
const { Organization, Property, Tenant, User } = require('../models');
const { logAudit } = require('../helpers/audit');
const { jwtSecret } = require('../config/env');
const { sendError } = require('../helpers/apiResponse');
const { ROLES } = require('../helpers/rbac');

const managerRoles = [ROLES.LANDLORD, ROLES.PROPERTY_MANAGER];

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  phoneNumber: user.phoneNumber,
  interestedProperty: user.interestedProperty,
  interestedUnit: user.interestedUnit,
  organization: user.organization
});

const getAvailableProperties = async (req, res) => {
  const properties = await Property.find();

  const availableProperties = await Promise.all(properties.map(async (property) => {
    const activeTenants = await Tenant.find({ property: property._id, status: 'active' });
    const occupiedUnits = activeTenants.map((tenant) => tenant.unit);
    const unoccupiedUnits = (property.units || []).filter((unit) => !occupiedUnits.includes(unit));

    return {
      _id: property._id,
      name: property.name,
      address: property.address,
      units: unoccupiedUnits
    };
  }));

  res.json(availableProperties.filter((property) => property.units.length > 0));
};

const register = async (req, res) => {
  const { name, email, password, role, interestedProperty, interestedUnit, phoneNumber } = req.body;

  if (!name || !email || !password || !role) {
    sendError(res, 400, 'Name, email, password and role are required');
    return;
  }

  if (!Object.values(ROLES).includes(role)) {
    sendError(res, 400, 'Unsupported role selected');
    return;
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    sendError(res, 400, 'User with this email already exists');
    return;
  }

  let organization = null;
  let organizationId = null;

  if (managerRoles.includes(role)) {
    organization = await Organization.create({
      name: `${name}'s Portfolio`,
      status: 'trial',
      subscriptionPlan: 'basic',
      billingCycle: 'monthly'
    });
    organizationId = organization._id;
  } else if (interestedProperty) {
    const property = await Property.findById(interestedProperty).select('organization');
    organizationId = property?.organization || null;
  }

  const status = managerRoles.includes(role) ? 'active' : 'pending';
  const user = new User({
    organization: organizationId,
    name,
    email,
    password,
    phoneNumber,
    role,
    status,
    interestedProperty: role === ROLES.TENANT ? interestedProperty : undefined,
    interestedUnit: role === ROLES.TENANT ? interestedUnit : undefined
  });

  await user.save();

  if (organization) {
    organization.owner = user._id;
    await organization.save();
  }

  const message = managerRoles.includes(role)
    ? 'Account created successfully'
    : 'Registration request submitted. Waiting for approval.';

  await logAudit({
    organization: organizationId,
    actor: user._id,
    action: managerRoles.includes(role) ? 'Account registered' : 'Tenant application submitted',
    entityType: 'user',
    entityId: user._id,
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
    organizationId
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password })
    .populate('interestedProperty', 'name address')
    .populate('organization', 'name subscriptionPlan status');

  if (!user) {
    sendError(res, 401, 'Invalid email or password');
    return;
  }

  user.lastLoginAt = new Date();
  await user.save();

  await logAudit({
    organization: user.organization?._id || user.organization || null,
    actor: user._id,
    action: 'User signed in',
    entityType: 'session',
    entityId: user._id,
    metadata: {
      role: user.role,
      summary: user.email
    }
  });

  const token = jwt.sign({
    id: user._id.toString(),
    role: user.role,
    organizationId: user.organization?._id?.toString() || user.organization?.toString() || null
  }, jwtSecret);

  res.json({
    token,
    user: buildUserResponse(user)
  });
};

const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('interestedProperty', 'name address')
    .populate('organization', 'name subscriptionPlan status');

  if (!user) {
    sendError(res, 404, 'User not found');
    return;
  }

  res.json({
    user: buildUserResponse(user)
  });
};

module.exports = {
  getAvailableProperties,
  getCurrentUser,
  register,
  login
};
