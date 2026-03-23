const { Notification, Property, Tenant, Unit, User } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { ensureOrganizationForUser } = require('../helpers/organization');
const { createNotification } = require('../helpers/notifications');
const { ROLES } = require('../helpers/rbac');

const manageRoles = [ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN];

const sanitizeUnits = (units = []) => {
  const input = Array.isArray(units) ? units : [units];
  return [...new Set(input.map((unit) => String(unit).trim()).filter(Boolean))];
};

const buildManagedPropertyQuery = (user) => {
  if (user.role === ROLES.SUPER_ADMIN) {
    return {};
  }

  return {
    $or: [
      { landlord: user.id },
      { manager: user.id }
    ]
  };
};

const syncPropertyUnits = async (property, incomingUnits) => {
  const normalizedUnits = sanitizeUnits(incomingUnits ?? property.units);
  property.units = normalizedUnits;
  await property.save();

  const [existingUnits, activeTenants] = await Promise.all([
    Unit.find({ property: property._id }),
    Tenant.find({ property: property._id, status: 'active' })
  ]);

  const occupiedByUnit = new Map(activeTenants.map((tenant) => [tenant.unit, tenant._id]));
  const unitMap = new Map(existingUnits.map((unit) => [unit.unitNumber, unit]));

  for (const unitNumber of normalizedUnits) {
    const tenantAssignment = occupiedByUnit.get(unitNumber) || null;
    const occupancyStatus = tenantAssignment ? 'occupied' : 'vacant';
    const existingUnit = unitMap.get(unitNumber);

    if (!existingUnit) {
      await Unit.create({
        organization: property.organization,
        property: property._id,
        unitNumber,
        occupancyStatus,
        tenantAssignment
      });
      continue;
    }

    existingUnit.organization = property.organization;
    existingUnit.isActive = true;
    existingUnit.tenantAssignment = tenantAssignment;
    existingUnit.occupancyStatus = occupancyStatus;
    await existingUnit.save();
  }

  await Unit.updateMany({
    property: property._id,
    unitNumber: { $nin: normalizedUnits }
  }, {
    $set: {
      isActive: false,
      occupancyStatus: 'vacant',
      tenantAssignment: null
    }
  });
};

const getProperties = async (req, res) => {
  const properties = await Property.find(buildManagedPropertyQuery(req.user));
  res.json(properties);
};

const createProperty = async (req, res) => {
  if (!manageRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only landlords or managers can create properties');
    return;
  }

  const currentUser = await User.findById(req.user.id);
  const organizationId = await ensureOrganizationForUser(currentUser);

  const property = new Property({
    ...req.body,
    organization: organizationId,
    landlord: req.user.role === ROLES.SUPER_ADMIN && req.body.landlord ? req.body.landlord : req.user.id,
    manager: req.body.manager || (req.user.role === ROLES.PROPERTY_MANAGER ? req.user.id : undefined),
    units: sanitizeUnits(req.body.units)
  });

  await property.save();
  await syncPropertyUnits(property, property.units);

  await logRequestAudit({
    req,
    organization: property.organization,
    action: 'Property created',
    entityType: 'property',
    entityId: property._id,
    metadata: {
      propertyName: property.name,
      summary: `${property.name} • ${property.units.length} units`
    }
  });

  res.status(201).json(property);
};

const updateProperty = async (req, res) => {
  const propertyId = req.params.id;

  const property = await Property.findOneAndUpdate(
    { _id: propertyId, ...buildManagedPropertyQuery(req.user) },
    { ...req.body, units: req.body.units ? sanitizeUnits(req.body.units) : undefined },
    { new: true, runValidators: true }
  );

  if (!property) {
    const exists = await Property.findById(propertyId);
    if (!exists) {
      sendError(res, 404, 'Property not found in database');
      return;
    }

    sendError(res, 403, 'You do not have permission to edit this property');
    return;
  }

  if (req.body.units) {
    await syncPropertyUnits(property, req.body.units);
  }

  await logRequestAudit({
    req,
    organization: property.organization,
    action: 'Property updated',
    entityType: 'property',
    entityId: property._id,
    metadata: {
      propertyName: property.name,
      summary: `${property.name} updated`
    }
  });

  res.json(property);
};

const getPropertyTenants = async (req, res) => {
  const tenants = await Tenant.find({ property: req.params.id }).populate('user', 'name email phoneNumber role');
  res.json(tenants);
};

const createTenant = async (req, res) => {
  if (!manageRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only landlords or managers can add tenants');
    return;
  }

  const property = await Property.findOne({
    _id: req.body.property,
    ...buildManagedPropertyQuery(req.user)
  });

  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  const tenant = new Tenant({
    ...req.body,
    organization: property.organization
  });

  await tenant.save();

  if (tenant.user) {
    await User.findByIdAndUpdate(tenant.user, {
      status: 'active',
      organization: property.organization
    });
  }

  await Unit.findOneAndUpdate({
    property: property._id,
    unitNumber: tenant.unit
  }, {
    $set: {
      organization: property.organization,
      occupancyStatus: 'occupied',
      tenantAssignment: tenant._id,
      isActive: true
    }
  }, { upsert: true, new: true, setDefaultsOnInsert: true });

  if (!property.units.includes(tenant.unit)) {
    property.units.push(tenant.unit);
    await property.save();
  }

  await logRequestAudit({
    req,
    organization: property.organization,
    action: 'Tenant created',
    entityType: 'tenant',
    entityId: tenant._id,
    metadata: {
      propertyName: property.name,
      summary: `Unit ${tenant.unit} assigned`
    }
  });

  res.status(201).json(tenant);
};

const getPendingRegistrations = async (req, res) => {
  const properties = await Property.find(buildManagedPropertyQuery(req.user));
  const propertyIds = properties.map((property) => property._id);

  const pendingUsers = await User.find({
    status: 'pending',
    interestedProperty: { $in: propertyIds }
  }).populate('interestedProperty', 'name address');

  res.json(pendingUsers);
};

const approveRegistration = async (req, res) => {
  const { userId } = req.params;
  const rentAmount = Number(req.body.rentAmount || 0);

  const user = await User.findById(userId);
  if (!user) {
    sendError(res, 404, 'User not found');
    return;
  }

  const property = await Property.findOne({
    _id: user.interestedProperty,
    ...buildManagedPropertyQuery(req.user)
  });

  if (!property) {
    sendError(res, 403, 'Unauthorized to approve for this property');
    return;
  }

  const existingTenant = await Tenant.findOne({
    property: property._id,
    unit: user.interestedUnit,
    status: 'active'
  });

  if (existingTenant) {
    sendError(res, 400, 'Unit is already occupied');
    return;
  }

  const tenant = new Tenant({
    organization: property.organization,
    user: user._id,
    property: property._id,
    unit: user.interestedUnit,
    rentAmount,
    status: 'active'
  });

  await tenant.save();

  user.status = 'active';
  user.organization = property.organization;
  await user.save();

  await Unit.findOneAndUpdate({
    property: property._id,
    unitNumber: user.interestedUnit
  }, {
    $set: {
      organization: property.organization,
      tenantAssignment: tenant._id,
      occupancyStatus: 'occupied',
      rentAmount,
      isActive: true
    }
  }, { upsert: true, new: true, setDefaultsOnInsert: true });

  if (!property.units.includes(user.interestedUnit)) {
    property.units.push(user.interestedUnit);
    await property.save();
  }

  await createNotification({
    organization: property.organization,
    user: user._id,
    title: 'Application approved',
    message: `Your application for ${property.name} unit ${user.interestedUnit} has been approved.`,
    type: 'system_notice'
  });

  await logRequestAudit({
    req,
    organization: property.organization,
    action: 'Registration approved',
    entityType: 'tenant',
    entityId: tenant._id,
    metadata: {
      propertyName: property.name,
      summary: `${user.name} • Unit ${user.interestedUnit}`,
      rentAmount
    }
  });

  res.json({ message: 'User approved and added as tenant', tenant });
};

const rejectRegistration = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    sendError(res, 404, 'User not found');
    return;
  }

  const property = await Property.findOne({
    _id: user.interestedProperty,
    ...buildManagedPropertyQuery(req.user)
  });

  if (!property) {
    sendError(res, 403, 'Unauthorized to reject for this property');
    return;
  }

  user.status = 'rejected';
  await user.save();

  await createNotification({
    organization: property.organization,
    user: user._id,
    title: 'Application rejected',
    message: `Your application for ${property.name} unit ${user.interestedUnit} was not approved.`,
    type: 'system_notice'
  });

  await logRequestAudit({
    req,
    organization: property.organization,
    action: 'Registration rejected',
    entityType: 'user',
    entityId: user._id,
    metadata: {
      propertyName: property.name,
      summary: `${user.name} • Unit ${user.interestedUnit}`
    }
  });

  res.json({ message: 'User registration rejected' });
};

module.exports = {
  getProperties,
  createProperty,
  updateProperty,
  getPropertyTenants,
  createTenant,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration
};
