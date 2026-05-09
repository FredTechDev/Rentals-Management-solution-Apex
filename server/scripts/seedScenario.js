const { User, Organization, Property, Unit, Tenant, Subscription } = require('../models');
const { createTenantSchema } = require('../services/tenantService');
const { transaction } = require('../config/database');
const { ROLES } = require('../helpers/rbac');

async function seed() {
  console.log('--- Starting Demo Seed ---');
  
  try {
    // 1. Create a Landlord
    const landlordData = {
      name: 'Test Landlord',
      email: 'landlord@test.com',
      password: 'password123',
      role: ROLES.LANDLORD,
      status: 'active'
    };

    let org;
    await transaction(async (client) => {
      org = await Organization.create({
        name: 'Prime Portfolios',
        status: 'active',
        pricePerUnit: 500,
        billingCycleMonths: 1
      }, client);

      const user = await User.create({
        ...landlordData,
        organizationId: org.id
      }, client);

      await Organization.update(org.id, { owner_id: user.id }, client);
      await createTenantSchema(org.schema_name);

      await Subscription.create({
        organizationId: org.id,
        status: 'active',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }, client);
    });

    console.log('Landlord and Org created:', org.schema_name);

    // 2. Add a Property and Units to that Org
    const property = await Property.create(org.schema_name, {
      name: 'Sunset Heights',
      address: '123 Tech Lane',
      units: ['A1', 'A2', 'B1']
    });

    for (const u of ['A1', 'A2', 'B1']) {
      await Unit.upsert(org.schema_name, {
        propertyId: property.id,
        unitNumber: u,
        occupancyStatus: 'vacant'
      });
    }

    console.log('Property and Units created.');
    console.log('--- Seed Complete ---');
    console.log('Login with: landlord@test.com / password123');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
