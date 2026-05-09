const { Property, Tenant, Unit, User, OrganizationMembership } = require('../models');
const crypto = require('crypto');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { createNotification } = require('../helpers/notifications');
const { sendAccountCreatedEmail } = require('../services/emailService');
const { deleteFromCloudinary } = require('../helpers/upload');
const { ROLES } = require('../helpers/rbac');

const manageRoles = [ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN];

const sanitizeUnits = (units = []) => {
  const input = Array.isArray(units) ? units : [units];
  return [...new Set(input.map((unit) => String(unit).trim()).filter(Boolean))];
};

const buildManagedPropertyFilter = (user) => {
  if (user.role === ROLES.SUPER_ADMIN) {
    return {};
  }

  if (user.role === ROLES.LANDLORD) {
    return { landlordId: user.id };
  }

  // Property Managers only see properties assigned to them via manager_id
  return { managerId: user.id };
};

const canManageProperty = (user, property) => {
  if (!property) return false;
  
  if (user.role === ROLES.SUPER_ADMIN) return true;
  
  if (user.role === ROLES.LANDLORD) {
    // Landlord owns the property OR it belongs to their organization context
    return property.landlord_id === user.id;
  }

  if (user.role === ROLES.PROPERTY_MANAGER) {
    // Property Manager MUST be specifically assigned to this property
    return property.manager_id === user.id;
  }

  return false;
};

const mapProperty = (property) => ({
  ...property,
  landlord: property.landlord_id,
  manager: property.manager_id,
  units: property.units || [],
  images: property.images || []
});

const mapTenant = (tenant, user) => ({
  ...tenant,
  user: user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phone_number,
    role: user.role
  } : null,
  property: tenant.property_id
});

const syncPropertyUnits = async (schema, property, incomingUnits) => {
  const normalizedUnits = sanitizeUnits(incomingUnits ?? property.units);
  await Property.update(schema, property.id, { units: normalizedUnits });

  const [existingUnits, activeTenants] = await Promise.all([
    Unit.findByProperty(schema, property.id, { includeInactive: true }),
    Tenant.find(schema, { propertyId: property.id, status: 'active' })
  ]);

  const occupiedByUnit = new Map(activeTenants.map((tenant) => [tenant.unit, tenant.id]));
  const unitMap = new Map(existingUnits.map((unit) => [unit.unit_number, unit]));

  for (const unitNumber of normalizedUnits) {
    const tenantAssignment = occupiedByUnit.get(unitNumber) || null;
    const occupancyStatus = tenantAssignment ? 'occupied' : 'vacant';
    const existingUnit = unitMap.get(unitNumber);

    if (!existingUnit) {
      await Unit.upsert(schema, {
        propertyId: property.id,
        unitNumber,
        occupancyStatus,
        tenantAssignment
      });
      continue;
    }

    await Unit.upsert(schema, {
      propertyId: property.id,
      unitNumber,
      rentAmount: existingUnit.rent_amount,
      occupancyStatus,
      tenantAssignment,
      meterReadings: existingUnit.meter_readings,
      isActive: true
    });
  }

  await Unit.deactivateMissing(schema, property.id, normalizedUnits);
};

const getProperties = async (req, res) => {
  const properties = await Property.find(req.schema, buildManagedPropertyFilter(req.user));
  res.json(properties.map(mapProperty));
};

const createProperty = async (req, res) => {
  if (!manageRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only landlords or managers can create properties');
    return;
  }

  const property = await Property.create(req.schema, {
    ...req.body,
    landlordId: req.user.role === ROLES.SUPER_ADMIN && req.body.landlord ? req.body.landlord : req.user.id,
    managerId: req.body.manager || (req.user.role === ROLES.PROPERTY_MANAGER ? req.user.id : null),
    units: sanitizeUnits(req.body.units)
  });

  await syncPropertyUnits(req.schema, property, property.units);

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Property created',
    entityType: 'property',
    entityId: property.id,
    metadata: {
      propertyName: property.name,
      summary: `${property.name} • ${property.units.length} units`
    }
  });

  res.status(201).json(mapProperty(property));
};

const updateProperty = async (req, res) => {
  const propertyId = req.params.id;

  const property = await Property.findById(req.schema, propertyId);
  if (!property) {
    sendError(res, 404, 'Property not found in database');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'You do not have permission to edit this property');
    return;
  }

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.address !== undefined) updates.address = req.body.address;
  if (req.body.description !== undefined) updates.description = req.body.description || null;
  if (req.body.type !== undefined) updates.type = req.body.type || 'apartment';
  if (req.body.units !== undefined) updates.units = sanitizeUnits(req.body.units);
  if (req.user.role === ROLES.SUPER_ADMIN && req.body.landlord !== undefined) {
    updates.landlord_id = req.body.landlord || property.landlord_id;
  }
  if (
    req.body.manager !== undefined
    && (req.user.role === ROLES.SUPER_ADMIN || property.landlord_id === req.user.id)
  ) {
    updates.manager_id = req.body.manager || null;
  }

  const updated = await Property.update(req.schema, propertyId, updates);

  if (req.body.units !== undefined) {
    await syncPropertyUnits(req.schema, updated, req.body.units);
  }

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Property updated',
    entityType: 'property',
    entityId: updated.id,
    metadata: {
      propertyName: updated.name,
      summary: `${updated.name} updated`
    }
  });

  res.json(mapProperty(updated));
};

const deleteProperty = async (req, res) => {
  const propertyId = req.params.id;
  const property = await Property.findById(req.schema, propertyId);

  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'You do not have permission to delete this property');
    return;
  }

  // Delete all property images from Cloudinary
  if (property.images && Array.isArray(property.images)) {
    for (const imageUrl of property.images) {
      await deleteFromCloudinary(imageUrl);
    }
  }

  // Find all leases and repair requests for this property to delete their files too
  const { Lease, RepairRequest } = require('../models');
  const [leases, repairs] = await Promise.all([
    Lease.findByPropertyIds(req.schema, [propertyId]),
    RepairRequest.findByPropertyIds(req.schema, [propertyId])
  ]);

  for (const lease of leases) {
    if (lease.file_path) await deleteFromCloudinary(lease.file_path);
  }
  for (const repair of repairs) {
    if (repair.image_path) await deleteFromCloudinary(repair.image_path);
  }

  await Property.delete(req.schema, propertyId);

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Property deleted',
    entityType: 'property',
    entityId: propertyId,
    metadata: {
      propertyName: property.name
    }
  });

  res.json({ message: 'Property and all associated files deleted successfully' });
};

const getPropertyTenants = async (req, res) => {
  const property = await Property.findById(req.schema, req.params.id);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'You do not have permission to view tenants for this property');
    return;
  }

  const tenants = await Tenant.find(req.schema, { propertyId: req.params.id });
  const userIds = tenants.map((tenant) => tenant.user_id);
  const users = await User.findByIds(userIds);
  const userMap = new Map(users.map((user) => [user.id, user]));

  res.json(tenants.map((tenant) => mapTenant(tenant, userMap.get(tenant.user_id))));
};

const createTenant = async (req, res) => {
  if (!manageRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only landlords or managers can add tenants');
    return;
  }

  const property = await Property.findById(req.schema, req.body.property);

  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'You do not have permission to add tenants to this property');
    return;
  }

  const tenantUser = await User.findById(req.body.user);
  if (!tenantUser) {
    sendError(res, 404, 'User not found');
    return;
  }

  if (tenantUser.role !== ROLES.TENANT) {
    sendError(res, 400, 'Only tenant accounts can be assigned to rental units');
    return;
  }

  const existingTenant = await Tenant.findOne(req.schema, {
    propertyId: req.body.property,
    unit: req.body.unit,
    status: 'active'
  });

  if (existingTenant) {
    sendError(res, 400, 'Unit is already occupied');
    return;
  }

  const tenant = await Tenant.create(req.schema, {
    userId: req.body.user,
    propertyId: req.body.property,
    unit: req.body.unit,
    rentAmount: req.body.rentAmount,
    dueDate: req.body.dueDate,
    status: req.body.status || 'active',
    leaseStart: req.body.leaseStart,
    leaseEnd: req.body.leaseEnd
  });

  if (tenant.user_id) {
    await User.update(tenant.user_id, {
      status: 'active',
      organization_id: req.organizationId
    });
    await OrganizationMembership.create({
      userId: tenant.user_id,
      organizationId: req.organizationId,
      isDefault: false
    });
  }

  await Unit.upsert(req.schema, {
    propertyId: property.id,
    unitNumber: tenant.unit,
    occupancyStatus: 'occupied',
    tenantAssignment: tenant.id,
    isActive: true
  });

  if (!property.units.includes(tenant.unit)) {
    const nextUnits = [...property.units, tenant.unit];
    await Property.update(req.schema, property.id, { units: nextUnits });
  }

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Tenant created',
    entityType: 'tenant',
    entityId: tenant.id,
    metadata: {
      propertyName: property.name,
      summary: `Unit ${tenant.unit} assigned`
    }
  });

  res.status(201).json(tenant);
};

const getPendingRegistrations = async (req, res) => {
  const properties = await Property.find(req.schema, buildManagedPropertyFilter(req.user));
  const propertyIds = properties.map((property) => property.id);

  const pendingUsers = await User.findPendingByPropertyIds(propertyIds, req.schema);
  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  res.json(pendingUsers.map((user) => ({
    ...User.sanitize(user),
    interestedProperty: propertyMap.get(user.interested_property_id)
      ? {
        id: propertyMap.get(user.interested_property_id).id,
        name: propertyMap.get(user.interested_property_id).name,
        address: propertyMap.get(user.interested_property_id).address
      }
      : null
  })));
};

const approveRegistration = async (req, res) => {
  const { userId } = req.params;
  const { rentAmount, depositAmount, dueDate, leaseStart, leaseEnd } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    sendError(res, 404, 'User not found');
    return;
  }

  if (user.role !== ROLES.TENANT) {
    sendError(res, 400, 'Only tenant registrations can be approved here');
    return;
  }

  const property = await Property.findById(req.schema, user.interested_property_id);

  if (!property || user.interested_property_schema !== req.schema) {
    sendError(res, 403, 'Unauthorized to approve for this property');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'Unauthorized to approve for this property');
    return;
  }

  const existingTenant = await Tenant.findOne(req.schema, {
    propertyId: property.id,
    unit: user.interested_unit,
    status: 'active'
  });

  if (existingTenant) {
    sendError(res, 400, 'Unit is already occupied');
    return;
  }

  const tenant = await Tenant.create(req.schema, {
    userId: user.id,
    propertyId: property.id,
    unit: user.interested_unit,
    rentAmount,
    dueDate: dueDate || 1,
    leaseStart: leaseStart || null,
    leaseEnd: leaseEnd || null,
    status: 'active'
  });

  // Create a lease record to track the deposit and terms
  const { Lease } = require('../models');
  await Lease.create(req.schema, {
    tenantId: user.id,
    propertyId: property.id,
    unit: user.interested_unit,
    depositAmount: depositAmount || 0,
    startDate: leaseStart || null,
    endDate: leaseEnd || null,
    fileName: 'System Generated Entry',
    filePath: 'N/A'
  });

  // Generate a new temporary password for the tenant
  const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 character hex

  await User.update(user.id, {
    status: 'active',
    organization_id: req.organizationId,
    password: tempPassword,
    requires_password_change: true
  });

  await OrganizationMembership.create({
    userId: user.id,
    organizationId: req.organizationId,
    isDefault: true
  });

  // Send the welcome email with the new credentials and financial summary
  await sendAccountCreatedEmail(user.email, user.name, tempPassword, ROLES.TENANT);

  await Unit.upsert(req.schema, {
    propertyId: property.id,
    unitNumber: user.interested_unit,
    tenantAssignment: tenant.id,
    occupancyStatus: 'occupied',
    rentAmount,
    isActive: true
  });

  if (!property.units.includes(user.interested_unit)) {
    const nextUnits = [...property.units, user.interested_unit];
    await Property.update(req.schema, property.id, { units: nextUnits });
  }

  await createNotification({
    schema: req.schema,
    userId: user.id,
    title: 'Application approved',
    message: `Your application for ${property.name} unit ${user.interested_unit} has been approved.`,
    type: 'system_notice'
  });

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Registration approved',
    entityType: 'tenant',
    entityId: tenant.id,
    metadata: {
      propertyName: property.name,
      summary: `${user.name} • Unit ${user.interested_unit}`,
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

  if (user.role !== ROLES.TENANT) {
    sendError(res, 400, 'Only tenant registrations can be rejected here');
    return;
  }

  const property = await Property.findById(req.schema, user.interested_property_id);

  if (!property || user.interested_property_schema !== req.schema) {
    sendError(res, 403, 'Unauthorized to reject for this property');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'Unauthorized to reject for this property');
    return;
  }

  await User.update(user.id, { status: 'rejected' });

  await createNotification({
    schema: req.schema,
    userId: user.id,
    title: 'Application rejected',
    message: `Your application for ${property.name} unit ${user.interested_unit} was not approved.`,
    type: 'system_notice'
  });

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Registration rejected',
    entityType: 'user',
    entityId: user.id,
    metadata: {
      propertyName: property.name,
      summary: `${user.name} • Unit ${user.interested_unit}`
    }
  });

  res.json({ message: 'User registration rejected' });
};

module.exports = {
  getProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyTenants,
  createTenant,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration
};
