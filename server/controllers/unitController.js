const { Property, Unit } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { ROLES } = require('../helpers/rbac');

const manageRoles = [ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN];

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

const getUnitsByProperty = async (req, res) => {
  const units = await Unit.find({
    property: req.params.propertyId,
    isActive: { $ne: false }
  }).sort({ unitNumber: 1 });

  res.json(units);
};

const createUnit = async (req, res) => {
  if (!manageRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only landlords or managers can create units');
    return;
  }

  const property = await Property.findOne({
    _id: req.body.propertyId,
    ...buildManagedPropertyQuery(req.user)
  });

  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  const unitNumber = String(req.body.unitNumber || '').trim();
  if (!unitNumber) {
    sendError(res, 400, 'Unit number is required');
    return;
  }

  const unit = await Unit.findOneAndUpdate({
    property: property._id,
    unitNumber
  }, {
    organization: property.organization,
    property: property._id,
    unitNumber,
    rentAmount: Number(req.body.rentAmount || 0),
    occupancyStatus: req.body.occupancyStatus || 'vacant',
    meterReadings: req.body.meterReadings || {},
    isActive: true
  }, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });

  if (!property.units.includes(unitNumber)) {
    property.units.push(unitNumber);
    await property.save();
  }

  await logRequestAudit({
    req,
    organization: property.organization,
    action: 'Unit created',
    entityType: 'unit',
    entityId: unit._id,
    metadata: {
      propertyName: property.name,
      summary: `${property.name} • Unit ${unit.unitNumber}`
    }
  });

  res.status(201).json(unit);
};

const updateUnit = async (req, res) => {
  if (!manageRoles.includes(req.user.role)) {
    sendError(res, 403, 'Only landlords or managers can update units');
    return;
  }

  const unit = await Unit.findById(req.params.id).populate('property');
  if (!unit) {
    sendError(res, 404, 'Unit not found');
    return;
  }

  const managedProperty = await Property.findOne({
    _id: unit.property._id,
    ...buildManagedPropertyQuery(req.user)
  });

  if (!managedProperty) {
    sendError(res, 403, 'You do not have permission to update this unit');
    return;
  }

  const previousUnitNumber = unit.unitNumber;
  const nextUnitNumber = req.body.unitNumber ? String(req.body.unitNumber).trim() : previousUnitNumber;

  unit.unitNumber = nextUnitNumber;
  unit.rentAmount = req.body.rentAmount ?? unit.rentAmount;
  unit.occupancyStatus = req.body.occupancyStatus || unit.occupancyStatus;
  unit.meterReadings = req.body.meterReadings || unit.meterReadings;
  unit.isActive = req.body.isActive ?? unit.isActive;
  await unit.save();

  managedProperty.units = [...new Set(
    managedProperty.units
      .map((propertyUnit) => propertyUnit === previousUnitNumber ? nextUnitNumber : propertyUnit)
      .filter(Boolean)
  )];

  if (!managedProperty.units.includes(nextUnitNumber)) {
    managedProperty.units.push(nextUnitNumber);
  }

  await managedProperty.save();

  await logRequestAudit({
    req,
    organization: managedProperty.organization,
    action: 'Unit updated',
    entityType: 'unit',
    entityId: unit._id,
    metadata: {
      propertyName: managedProperty.name,
      summary: `${managedProperty.name} • Unit ${unit.unitNumber}`
    }
  });

  res.json(unit);
};

module.exports = {
  getUnitsByProperty,
  createUnit,
  updateUnit
};
