const { Organization, OrganizationMembership, Tenant } = require('../models');
const { ROLES } = require('../helpers/rbac');
const { schemaExists } = require('../services/tenantService');
const { AppError } = require('./errorHandler');

const tenantResolver = async (req, res, next) => {
  try {
    if (!req.organizationId) {
      throw new AppError('Organization context required', 400);
    }

    if (req.userId && req.user?.role !== 'super_admin') {
      let membership = await OrganizationMembership.findByUserAndOrganization(req.userId, req.organizationId);
      if (!membership && req.homeOrganizationId === req.organizationId) {
        membership = await OrganizationMembership.create({
          userId: req.userId,
          organizationId: req.organizationId,
          isDefault: true
        });
      }
      if (!membership) {
        throw new AppError('This account does not belong to the selected organization', 403);
      }
    }

    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    if (!['trial', 'active'].includes(organization.status)) {
      throw new AppError('Organization account is not active', 403);
    }

    if (!organization.schema_name || !(await schemaExists(organization.schema_name))) {
      throw new AppError('Organization workspace is not initialized', 503);
    }

    req.organization = organization;
    req.schema = organization.schema_name;
    req.user = req.user ? { ...req.user, organization_id: organization.id } : req.user;

    if (req.userId && req.user?.role === ROLES.TENANT) {
      const tenant = await Tenant.findOne(req.schema, {
        userId: req.userId,
        status: 'active'
      });
      if (!tenant) {
        throw new AppError('Active tenant profile not found for this organization', 403);
      }
      req.tenant = tenant;
      req.tenantId = tenant.id;
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  tenantResolver
};
