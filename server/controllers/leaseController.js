const path = require('path');
const { Lease, Property } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { rootDir } = require('../config/env');
const { sendError } = require('../helpers/apiResponse');
const { createNotification } = require('../helpers/notifications');
const { toStoredUploadPath } = require('../helpers/upload');
const { ROLES } = require('../helpers/rbac');

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

const uploadLease = async (req, res) => {
  const { tenantId, propertyId, unit, startDate, endDate, depositAmount, penaltyTerms } = req.body;

  if (!req.file) {
    sendError(res, 400, 'Lease file is required');
    return;
  }

  const property = await Property.findOne({
    _id: propertyId,
    ...buildManagedPropertyQuery(req.user)
  });

  if (!property) {
    sendError(res, 403, 'Unauthorized to upload a lease for this property');
    return;
  }

  const lease = new Lease({
    organization: property.organization,
    tenant: tenantId,
    property: propertyId,
    unit,
    filePath: toStoredUploadPath(req.file.path),
    fileName: req.file.originalname,
    startDate,
    endDate,
    depositAmount: Number(depositAmount || 0),
    penaltyTerms
  });

  await lease.save();

  await createNotification({
    organization: property.organization,
    user: tenantId,
    title: 'New lease uploaded',
    message: `A lease agreement has been uploaded for unit ${unit}.`,
    type: 'lease_expiry'
  });

  await logRequestAudit({
    req,
    organization: property.organization,
    action: 'Lease uploaded',
    entityType: 'lease',
    entityId: lease._id,
    metadata: {
      propertyName: property.name,
      summary: `${property.name} • Unit ${unit}`
    }
  });

  res.status(201).json(lease);
};

const getTenantLease = async (req, res) => {
  const lease = await Lease.findOne({ tenant: req.user.id }).populate('property', 'name address');
  res.json(lease);
};

const getLandlordLeases = async (req, res) => {
  const properties = await Property.find(buildManagedPropertyQuery(req.user));
  const propertyIds = properties.map((property) => property._id);

  const leases = await Lease.find({ property: { $in: propertyIds } })
    .populate('tenant', 'name email')
    .populate('property', 'name');

  res.json(leases);
};

const viewLease = async (req, res) => {
  const lease = await Lease.findById(req.params.id);
  if (!lease) {
    sendError(res, 404, 'Lease not found');
    return;
  }

  const property = await Property.findById(lease.property);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (req.user.role === ROLES.TENANT && lease.tenant.toString() !== req.user.id) {
    sendError(res, 403, 'Unauthorized');
    return;
  }

  if (
    ![ROLES.TENANT, ROLES.SUPER_ADMIN].includes(req.user.role)
    && property.landlord.toString() !== req.user.id
    && property.manager?.toString() !== req.user.id
  ) {
    sendError(res, 403, 'Unauthorized');
    return;
  }

  const filePath = path.isAbsolute(lease.filePath)
    ? lease.filePath
    : path.join(rootDir, lease.filePath);

  res.sendFile(filePath);
};

module.exports = {
  uploadLease,
  getTenantLease,
  getLandlordLeases,
  viewLease
};
