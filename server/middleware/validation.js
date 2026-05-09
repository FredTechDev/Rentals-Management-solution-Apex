const Joi = require('joi');
const { ValidationError } = require('./errorHandler');
const { ROLES } = require('../helpers/rbac');

const validate = (schema, source = 'body') => (req, res, next) => {
  const payload = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
  const { error, value } = schema.validate(payload, { abortEarly: false, stripUnknown: true });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return next(new ValidationError(errors));
  }

  if (source === 'body') req.body = value;
  if (source === 'query') req.query = value;
  next();
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid(...Object.values(ROLES)).required(),
    phoneNumber: Joi.string().optional().allow(''),
    interestedProperty: Joi.when('role', {
      is: ROLES.TENANT,
      then: Joi.string().uuid().required(),
      otherwise: Joi.string().uuid().optional().allow(null, '')
    }),
    interestedUnit: Joi.string().optional().allow(''),
    organizationId: Joi.string().uuid().optional().allow(null, '')
  }),
  inquiry: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().optional().allow(''),
    interestedProperty: Joi.string().uuid().required(),
    interestedUnit: Joi.string().optional().allow(''),
    organizationId: Joi.string().uuid().optional().allow(null, '')
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    organizationId: Joi.string().uuid().optional().allow(null, '')
  }),
  createProperty: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    address: Joi.string().min(2).max(200).required(),
    description: Joi.string().allow('').optional(),
    type: Joi.string().allow('').optional(),
    units: Joi.alternatives().try(
      Joi.array().items(Joi.string().min(1)).default([]),
      Joi.string().allow('')
    ).optional(),
    landlord: Joi.string().uuid().optional().allow(null, ''),
    manager: Joi.string().uuid().optional().allow(null, '')
  }),
  updateProperty: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    address: Joi.string().min(2).max(200).optional(),
    description: Joi.string().allow('').optional(),
    type: Joi.string().allow('').optional(),
    units: Joi.alternatives().try(
      Joi.array().items(Joi.string().min(1)),
      Joi.string().allow('')
    ).optional(),
    landlord: Joi.string().uuid().optional().allow(null, ''),
    manager: Joi.string().uuid().optional().allow(null, '')
  }),
  createTenant: Joi.object({
    user: Joi.string().uuid().required(),
    property: Joi.string().uuid().required(),
    unit: Joi.string().required(),
    rentAmount: Joi.number().min(0).required(),
    dueDate: Joi.number().min(1).max(31).optional(),
    status: Joi.string().valid('active', 'defaulted', 'moved_out', 'pending').optional(),
    leaseStart: Joi.date().optional(),
    leaseEnd: Joi.date().optional()
  }),
  createUnit: Joi.object({
    propertyId: Joi.string().uuid().required(),
    unitNumber: Joi.string().required(),
    rentAmount: Joi.number().min(0).optional(),
    occupancyStatus: Joi.string().valid('vacant', 'occupied', 'reserved', 'maintenance').optional(),
    meterReadings: Joi.object({
      water: Joi.number().min(0).optional(),
      electricity: Joi.number().min(0).optional()
    }).optional()
  }),
  updateUnit: Joi.object({
    unitNumber: Joi.string().optional(),
    rentAmount: Joi.number().min(0).optional(),
    occupancyStatus: Joi.string().valid('vacant', 'occupied', 'reserved', 'maintenance').optional(),
    meterReadings: Joi.object({
      water: Joi.number().min(0).optional(),
      electricity: Joi.number().min(0).optional()
    }).optional(),
    isActive: Joi.boolean().optional()
  }),
  repairRequest: Joi.object({
    propertyId: Joi.string().uuid().required(),
    unit: Joi.string().required(),
    category: Joi.string().valid('plumbing', 'electricity', 'security', 'general').optional(),
    description: Joi.string().min(3).required()
  }),
  repairUpdate: Joi.object({
    status: Joi.string().valid('pending', 'in-progress', 'resolved').optional(),
    landlordResponse: Joi.string().allow('').optional(),
    technicianDetails: Joi.string().allow('').optional(),
    assignedTo: Joi.string().uuid().optional().allow(null, ''),
    cost: Joi.number().min(0).optional()
  }),
  suggestion: Joi.object({
    content: Joi.string().min(3).required()
  }),
  message: Joi.object({
    content: Joi.string().min(1).required(),
    propertyId: Joi.string().uuid().optional().allow(null, '')
  }),
  paymentStk: Joi.object({
    amount: Joi.number().positive().required(),
    phoneNumber: Joi.string().required(),
    tenantId: Joi.string().uuid().required()
    }),
    approveRegistration: Joi.object({
    rentAmount: Joi.number().min(0).required(),
    depositAmount: Joi.number().min(0).optional().default(0),
    dueDate: Joi.number().min(1).max(31).optional().default(1),
    leaseStart: Joi.date().optional(),
    leaseEnd: Joi.date().optional()
    })
    };

module.exports = {
  validate,
  schemas
};
