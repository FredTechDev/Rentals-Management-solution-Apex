const { Lease, Property, Tenant, User } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { createNotification } = require('../helpers/notifications');
const { deleteFromCloudinary } = require('../helpers/upload');
const { ROLES } = require('../helpers/rbac');

const buildManagedPropertyFilter = (user) => {
  if (user.role === ROLES.SUPER_ADMIN) {
    return {};
  }

  return {
    landlordId: user.id,
    managerId: user.id
  };
};

const uploadLease = async (req, res) => {
  const { tenantId, propertyId, unit, startDate, endDate, depositAmount, penaltyTerms } = req.body;

  if (!req.file) {
    sendError(res, 400, 'Lease file is required');
    return;
  }

  const property = await Property.findById(req.schema, propertyId);

  if (!property) {
    sendError(res, 403, 'Unauthorized to upload a lease for this property');
    return;
  }

  if (
    req.user.role !== ROLES.SUPER_ADMIN
    && property.landlord_id !== req.user.id
    && property.manager_id !== req.user.id
  ) {
    sendError(res, 403, 'Unauthorized to upload a lease for this property');
    return;
  }

  const tenantProfile = await Tenant.findOne(req.schema, {
    userId: tenantId,
    propertyId,
    unit,
    status: 'active'
  });
  if (!tenantProfile) {
    sendError(res, 404, 'Tenant profile not found for this organization');
    return;
  }

  const lease = await Lease.create(req.schema, {
    tenantId,
    propertyId,
    unit,
    filePath: req.file.path, // req.file.path is the Cloudinary URL
    fileName: req.file.originalname,
    startDate,
    endDate,
    depositAmount: Number(depositAmount || 0),
    penaltyTerms
  });

  await createNotification({
    schema: req.schema,
    userId: tenantId,
    title: 'New lease uploaded',
    message: `A lease agreement has been uploaded for unit ${unit}.`,
    type: 'lease_expiry'
  });

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Lease uploaded',
    entityType: 'lease',
    entityId: lease.id,
    metadata: {
      propertyName: property.name,
      summary: `${property.name} • Unit ${unit}`
    }
  });

  res.status(201).json(lease);
};

const getTenantLease = async (req, res) => {
  const lease = await Lease.findByTenant(req.schema, req.user.id);
  if (!lease) {
    res.json(null);
    return;
  }
  const property = await Property.findById(req.schema, lease.property_id);
  res.json({
    ...lease,
    property: property ? { id: property.id, name: property.name, address: property.address } : null
  });
};

const getLandlordLeases = async (req, res) => {
  const properties = await Property.find(req.schema, buildManagedPropertyFilter(req.user));
  const propertyIds = properties.map((property) => property.id);
  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  const leases = await Lease.findByPropertyIds(req.schema, propertyIds);
  const tenantIds = leases.map((lease) => lease.tenant_id);
  const users = await User.findByIds(tenantIds);
  const userMap = new Map(users.map((user) => [user.id, user]));

  res.json(leases.map((lease) => ({
    ...lease,
    tenant: userMap.get(lease.tenant_id)
      ? { id: userMap.get(lease.tenant_id).id, name: userMap.get(lease.tenant_id).name, email: userMap.get(lease.tenant_id).email }
      : null,
    property: propertyMap.get(lease.property_id)
      ? { id: propertyMap.get(lease.property_id).id, name: propertyMap.get(lease.property_id).name }
      : null
  })));
};

const viewLease = async (req, res) => {
  const lease = await Lease.findById(req.schema, req.params.id);
  if (!lease) {
    sendError(res, 404, 'Lease not found');
    return;
  }

  const property = await Property.findById(req.schema, lease.property_id);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (req.user.role === ROLES.TENANT && lease.tenant_id !== req.user.id) {
    sendError(res, 403, 'Unauthorized');
    return;
  }

  if (
    ![ROLES.TENANT, ROLES.SUPER_ADMIN].includes(req.user.role)
    && property.landlord_id !== req.user.id
    && property.manager_id !== req.user.id
  ) {
    sendError(res, 403, 'Unauthorized');
    return;
  }

  // With Cloudinary, we just redirect to the URL
  if (lease.file_path.startsWith('http')) {
    return res.redirect(lease.file_path);
  }

  // Fallback for any old local files if they exist (though unlikely in new setup)
  res.status(400).json({ error: 'Legacy local files not supported with Cloudinary redirect' });
};

const deleteLease = async (req, res) => {
  const lease = await Lease.findById(req.schema, req.params.id);
  if (!lease) {
    return sendError(res, 404, 'Lease not found');
  }

  const property = await Property.findById(req.schema, lease.property_id);
  if (
    req.user.role !== ROLES.SUPER_ADMIN
    && property.landlord_id !== req.user.id
    && property.manager_id !== req.user.id
  ) {
    return sendError(res, 403, 'Unauthorized to delete this lease');
  }

  // Delete from Cloudinary
  if (lease.file_path) {
    await deleteFromCloudinary(lease.file_path);
  }

  await Lease.delete(req.schema, req.params.id);

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Lease deleted',
    entityType: 'lease',
    entityId: req.params.id
  });

  res.json({ message: 'Lease deleted successfully' });
};

module.exports = {
  uploadLease,
  getTenantLease,
  getLandlordLeases,
  viewLease,
  deleteLease
};
