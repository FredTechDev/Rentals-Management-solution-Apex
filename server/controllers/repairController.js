const { Property, RepairRequest, Tenant, User } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { createNotification } = require('../helpers/notifications');
const { ROLES } = require('../helpers/rbac');
const { deleteFromCloudinary } = require('../helpers/upload');

const managementRoles = [
  ROLES.LANDLORD,
  ROLES.PROPERTY_MANAGER,
  ROLES.SUPER_ADMIN
];

const canManageProperty = (user, property) => Boolean(property) && (
  user.role === ROLES.SUPER_ADMIN
  || property.landlord_id === user.id
  || property.manager_id === user.id
);

const getRepairRequests = async (req, res) => {
  let requests;

  if (managementRoles.includes(req.user.role)) {
    const filter = req.user.role === ROLES.SUPER_ADMIN
      ? {}
      : { landlordId: req.user.id, managerId: req.user.id };
    const properties = await Property.find(req.schema, filter);
    const propertyIds = properties.map((property) => property.id);
    requests = await RepairRequest.findByPropertyIds(req.schema, propertyIds);
  } else {
    requests = await RepairRequest.findByTenant(req.schema, req.user.id);
  }

  const propertyIds = [...new Set(requests.map((request) => request.property_id))];
  const properties = await Promise.all(propertyIds.map((id) => Property.findById(req.schema, id)));
  const propertyMap = new Map(properties.filter(Boolean).map((property) => [property.id, property]));

  const userIds = [...new Set(requests.flatMap((request) => [
    request.tenant_id,
    request.assigned_to
  ]).filter(Boolean))];
  const users = await User.findByIds(userIds);
  const userMap = new Map(users.map((user) => [user.id, user]));

  res.json(requests.map((request) => ({
    ...request,
    tenant: userMap.get(request.tenant_id)
      ? { id: userMap.get(request.tenant_id).id, name: userMap.get(request.tenant_id).name, email: userMap.get(request.tenant_id).email }
      : null,
    property: propertyMap.get(request.property_id)
      ? { id: propertyMap.get(request.property_id).id, name: propertyMap.get(request.property_id).name, address: propertyMap.get(request.property_id).address }
      : null,
    assignedTo: userMap.get(request.assigned_to)
      ? { id: userMap.get(request.assigned_to).id, name: userMap.get(request.assigned_to).name, role: userMap.get(request.assigned_to).role }
      : null
  })));
};

const createRepairRequest = async (req, res) => {
  const property = await Property.findById(req.schema, req.body.propertyId);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (req.user.role !== ROLES.TENANT) {
    sendError(res, 403, 'Only tenants can create repair requests');
    return;
  }

  const tenant = await Tenant.findOne(req.schema, {
    userId: req.user.id,
    propertyId: req.body.propertyId,
    unit: req.body.unit,
    status: 'active'
  });

  if (!tenant) {
    sendError(res, 403, 'Only the assigned tenant can create a repair request for this unit');
    return;
  }

  const repairRequest = await RepairRequest.create(req.schema, {
    tenantId: req.user.id,
    propertyId: req.body.propertyId,
    unit: req.body.unit,
    category: req.body.category || 'general',
    description: req.body.description,
    imagePath: req.file ? req.file.path : null // req.file.path is the Cloudinary URL
  });

  if (property?.landlord_id) {
    await createNotification({
      schema: req.schema,
      userId: property.landlord_id,
      title: 'New maintenance request',
      message: `A new maintenance request was submitted for unit ${req.body.unit}.`,
      type: 'maintenance_update'
    });
  }

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Repair request created',
    entityType: 'repair_request',
    entityId: repairRequest.id,
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

  const existingRequest = await RepairRequest.findById(req.schema, req.params.id);
  if (!existingRequest) {
    sendError(res, 404, 'Repair request not found');
    return;
  }

  const property = await Property.findById(req.schema, existingRequest.property_id);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'You do not have permission to update this repair request');
    return;
  }

  const updates = {
    status: req.body.status,
    technician_details: req.body.technicianDetails,
    cost: req.body.cost,
    landlord_response: req.body.landlordResponse,
    assigned_to: req.body.assignedTo
  };

  const repairRequest = await RepairRequest.update(req.schema, req.params.id, updates);
  if (!repairRequest) {
    sendError(res, 400, 'No repair request updates provided');
    return;
  }

  await createNotification({
    schema: req.schema,
    userId: repairRequest.tenant_id,
    title: 'Maintenance request updated',
    message: `Your maintenance request for unit ${repairRequest.unit} is now ${repairRequest.status}.`,
    type: 'maintenance_update'
  });

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Repair request updated',
    entityType: 'repair_request',
    entityId: repairRequest.id,
    metadata: {
      propertyName: property?.name || '',
      summary: `Unit ${repairRequest.unit} • ${repairRequest.status}`,
      status: repairRequest.status
    }
  });

  res.json(repairRequest);
};

const deleteRepairRequest = async (req, res) => {
  const existingRequest = await RepairRequest.findById(req.schema, req.params.id);
  if (!existingRequest) {
    sendError(res, 404, 'Repair request not found');
    return;
  }

  const property = await Property.findById(req.schema, existingRequest.property_id);
  if (!canManageProperty(req.user, property) && existingRequest.tenant_id !== req.user.id) {
    sendError(res, 403, 'Unauthorized to delete this request');
    return;
  }

  // Delete from Cloudinary if image exists
  if (existingRequest.image_path) {
    await deleteFromCloudinary(existingRequest.image_path);
  }

  await RepairRequest.delete(req.schema, req.params.id);

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Repair request deleted',
    entityType: 'repair_request',
    entityId: req.params.id
  });

  res.json({ message: 'Repair request deleted successfully' });
};

module.exports = {
  getRepairRequests,
  createRepairRequest,
  updateRepairRequest,
  deleteRepairRequest
};
