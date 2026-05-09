const { Property, Tenant, Unit } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { ROLES } = require('../helpers/rbac');

const manageRoles = [ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN];

const canManageProperty = (user, property) => Boolean(property) && (
  user.role === ROLES.SUPER_ADMIN
  || property.landlord_id === user.id
  || property.manager_id === user.id
);

const mapUnit = (unit) => ({
  ...unit,
  property: unit.property_id,
  unitNumber: unit.unit_number,
  rentAmount: unit.rent_amount,
  occupancyStatus: unit.occupancy_status,
  tenantAssignment: unit.tenant_assignment,
  isActive: unit.is_active,
  meterReadings: unit.meter_readings || {}
});

const getUnitsByProperty = async (req, res) => {
  const property = await Property.findById(req.schema, req.params.propertyId);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    const tenant = await Tenant.findOne(req.schema, {
      userId: req.user.id,
      propertyId: property.id,
      status: 'active'
    });

    if (!tenant) {
      sendError(res, 403, 'You do not have permission to view units for this property');
      return;
    }
  }

  const units = await Unit.findByProperty(req.schema, req.params.propertyId);
  res.json(units.map(mapUnit));
};

const createUnit = async (req, res) => {
  if (!manageRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only landlords or managers can create units');
    return;
  }

  const property = await Property.findById(req.schema, req.body.propertyId);

  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'You do not have permission to update this property');
    return;
  }

  const unitNumber = String(req.body.unitNumber || '').trim();
  if (!unitNumber) {
    sendError(res, 400, 'Unit number is required');
    return;
  }

  const unit = await Unit.upsert(req.schema, {
    propertyId: property.id,
    unitNumber,
    rentAmount: Number(req.body.rentAmount || 0),
    occupancyStatus: req.body.occupancyStatus || 'vacant',
    meterReadings: req.body.meterReadings || {},
    isActive: true
  });

  if (!property.units.includes(unitNumber)) {
    const nextUnits = [...property.units, unitNumber];
    await Property.update(req.schema, property.id, { units: nextUnits });
  }

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Unit created',
    entityType: 'unit',
    entityId: unit.id,
    metadata: {
      propertyName: property.name,
      summary: `${property.name} • Unit ${unit.unit_number}`
    }
  });

  res.status(201).json(mapUnit(unit));
};

const updateUnit = async (req, res) => {
  if (!manageRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only landlords or managers can update units');
    return;
  }

  const unit = await Unit.findById(req.schema, req.params.id);
  if (!unit) {
    sendError(res, 404, 'Unit not found');
    return;
  }

  const managedProperty = await Property.findById(req.schema, unit.property_id);
  if (!managedProperty) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (!canManageProperty(req.user, managedProperty)) {
    sendError(res, 403, 'You do not have permission to update this unit');
    return;
  }

  const previousUnitNumber = unit.unit_number;
  const nextUnitNumber = req.body.unitNumber ? String(req.body.unitNumber).trim() : previousUnitNumber;

  const updatedUnit = await Unit.update(req.schema, unit.id, {
    unit_number: nextUnitNumber,
    rent_amount: req.body.rentAmount ?? unit.rent_amount,
    occupancy_status: req.body.occupancyStatus || unit.occupancy_status,
    meter_readings: req.body.meterReadings || unit.meter_readings,
    is_active: req.body.isActive ?? unit.is_active
  });

  const nextUnits = [...new Set(
    managedProperty.units
      .map((propertyUnit) => propertyUnit === previousUnitNumber ? nextUnitNumber : propertyUnit)
      .filter(Boolean)
  )];

  if (!nextUnits.includes(nextUnitNumber)) {
    nextUnits.push(nextUnitNumber);
  }

  await Property.update(req.schema, managedProperty.id, { units: nextUnits });

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Unit updated',
    entityType: 'unit',
    entityId: updatedUnit.id,
    metadata: {
      propertyName: managedProperty.name,
      summary: `${managedProperty.name} • Unit ${updatedUnit.unit_number}`
    }
  });

  res.json(mapUnit(updatedUnit));
};

module.exports = {
  getUnitsByProperty,
  createUnit,
  updateUnit
};
