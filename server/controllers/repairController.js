const { Property, RepairRequest } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { createNotification } = require('../helpers/notifications');
const { ROLES } = require('../helpers/rbac');
const { toStoredUploadPath } = require('../helpers/upload');

const managementRoles = [
  ROLES.LANDLORD,
  ROLES.PROPERTY_MANAGER,
  ROLES.CARETAKER,
  ROLES.AGENT,
  ROLES.SUPER_ADMIN
];

const getRepairRequests = async (req, res) => {
  let requests;

  if ([ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN].includes(req.user.role)) {
    const propertyQuery = req.user.role === ROLES.SUPER_ADMIN
      ? {}
      : { $or: [{ landlord: req.user.id }, { manager: req.user.id }] };

    const properties = await Property.find(propertyQuery);
    const propertyIds = properties.map((property) => property._id);

    requests = await RepairRequest.find({ property: { $in: propertyIds } })
      .populate('tenant', 'name email')
      .populate('property', 'name address')
      .populate('assignedTo', 'name role');
  } else if ([ROLES.CARETAKER, ROLES.AGENT].includes(req.user.role)) {
    requests = await RepairRequest.find({ assignedTo: req.user.id })
      .populate('tenant', 'name email')
      .populate('property', 'name address')
      .populate('assignedTo', 'name role');
  } else {
    requests = await RepairRequest.find({ tenant: req.user.id })
      .populate('property', 'name address')
      .populate('assignedTo', 'name role');
  }

  res.json(requests);
};

const createRepairRequest = async (req, res) => {
  const property = await Property.findById(req.body.propertyId).select('organization landlord');

  const repairRequest = new RepairRequest({
    organization: property?.organization,
    tenant: req.user.id,
    property: req.body.propertyId,
    unit: req.body.unit,
    category: req.body.category || 'general',
    description: req.body.description,
    imagePath: req.file ? toStoredUploadPath(req.file.path) : null
  });

  await repairRequest.save();

  if (property?.landlord) {
    await createNotification({
      organization: property.organization,
      user: property.landlord,
      title: 'New maintenance request',
      message: `A new maintenance request was submitted for unit ${req.body.unit}.`,
      type: 'maintenance_update'
    });
  }

  await logRequestAudit({
    req,
    organization: property?.organization || null,
    action: 'Repair request created',
    entityType: 'repair_request',
    entityId: repairRequest._id,
    metadata: {
      propertyName: property?.name || '',
      summary: `Unit ${req.body.unit} • ${req.body.category || 'general'}`
    }
  });

  res.status(201).json(repairRequest);
};

const updateRepairRequest = async (req, res) => {
  if (!managementRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only management staff can update repair requests');
    return;
  }

  const repairRequest = await RepairRequest.findByIdAndUpdate(req.params.id, {
    status: req.body.status,
    landlordResponse: req.body.landlordResponse,
    technicianDetails: req.body.technicianDetails,
    assignedTo: req.body.assignedTo,
    cost: req.body.cost
  }, { new: true })
    .populate('tenant', 'name email')
    .populate('property', 'name address');

  if (!repairRequest) {
    sendError(res, 404, 'Repair request not found');
    return;
  }

  await createNotification({
    organization: repairRequest.organization,
    user: repairRequest.tenant?._id || repairRequest.tenant,
    title: 'Maintenance request updated',
    message: `Your maintenance request for unit ${repairRequest.unit} is now ${repairRequest.status}.`,
    type: 'maintenance_update'
  });

  await logRequestAudit({
    req,
    organization: repairRequest.organization,
    action: 'Repair request updated',
    entityType: 'repair_request',
    entityId: repairRequest._id,
    metadata: {
      propertyName: repairRequest.property?.name || '',
      summary: `Unit ${repairRequest.unit} • ${repairRequest.status}`,
      status: repairRequest.status
    }
  });

  res.json(repairRequest);
};

module.exports = {
  getRepairRequests,
  createRepairRequest,
  updateRepairRequest
};
