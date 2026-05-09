const fs = require('fs');
const path = require('path');
const { connectDatabase } = require('../config/database');
const { runPublicMigrations } = require('../database');
const { uploadsRoot } = require('../config/env');
const {
  Lease,
  Payment,
  Property,
  Tenant,
  Unit,
  User,
  Organization
} = require('../models');
const { ensureOrganizationForUser } = require('../helpers/organization');
const { createNotification } = require('../helpers/notifications');
const { ROLES } = require('../helpers/rbac');

const tenantEmail = (process.env.TENANT_EMAIL || 'kamau1@gmail.com').trim().toLowerCase();
const landlordEmail = (process.env.LANDLORD_EMAIL || 'kamau3@gmail.com').trim().toLowerCase();
const password = process.env.USER_PASSWORD || '123456789';
const tenantName = process.env.TENANT_NAME || 'Kamau Tenant';
const landlordName = process.env.LANDLORD_NAME || 'Kamau Landlord';
const propertyName = process.env.STARTER_PROPERTY_NAME || 'Kamau Heights';
const propertyAddress = process.env.STARTER_PROPERTY_ADDRESS || 'Lumumba Drive, Nairobi';
const occupiedUnitNumber = process.env.STARTER_OCCUPIED_UNIT || 'A1';
const vacantUnitNumber = process.env.STARTER_VACANT_UNIT || 'A2';
const rentAmount = Number(process.env.STARTER_RENT_AMOUNT || 25000);

const buildLeaseFileName = (email) => `${email.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-lease.txt`;

const upsertUser = async ({ email, name, organizationId = null, role, status }) => {
  let user = await User.findByEmail(email);

  if (!user) {
    user = await User.create({
      name,
      email,
      password,
      role,
      status,
      organizationId
    });
  } else {
    user = await User.update(user.id, {
      name,
      password,
      role,
      status,
      is_active: true,
      organization_id: organizationId
    });
  }

  return user;
};

const seedStarterUsers = async () => {
  if (!tenantEmail || !landlordEmail || !password) {
    throw new Error('TENANT_EMAIL, LANDLORD_EMAIL, and USER_PASSWORD must be set.');
  }

  await connectDatabase();
  await runPublicMigrations();

  let landlord = await upsertUser({
    email: landlordEmail,
    name: landlordName,
    role: ROLES.LANDLORD,
    status: 'active'
  });

  const organizationId = await ensureOrganizationForUser(landlord, `${landlordName}'s Portfolio`);
  const organization = await Organization.findById(organizationId);
  const schema = organization.schema_name;
  landlord = await User.findById(landlord.id);

  let property = await Property.findByName(schema, propertyName);
  if (!property) {
    property = await Property.create(schema, {
      name: propertyName,
      address: propertyAddress,
      description: 'Starter property for landlord and tenant testing.',
      type: 'apartment',
      landlordId: landlord.id,
      units: [occupiedUnitNumber, vacantUnitNumber]
    });
  } else {
    property = await Property.update(schema, property.id, {
      address: propertyAddress,
      description: 'Starter property for landlord and tenant testing.',
      type: 'apartment',
      landlord_id: landlord.id,
      units: [occupiedUnitNumber, vacantUnitNumber]
    });
  }

  let tenantUser = await upsertUser({
    email: tenantEmail,
    name: tenantName,
    organizationId,
    role: ROLES.TENANT,
    status: 'active'
  });

  tenantUser = await User.update(tenantUser.id, {
    interested_property_id: property.id,
    interested_property_schema: schema,
    interested_unit: occupiedUnitNumber
  });

  let tenant = await Tenant.findOne(schema, { userId: tenantUser.id });
  if (!tenant) {
    tenant = await Tenant.create(schema, {
      userId: tenantUser.id,
      propertyId: property.id,
      unit: occupiedUnitNumber,
      rentAmount,
      dueDate: 5,
      status: 'active'
    });
  } else {
    tenant = await Tenant.update(schema, tenant.id, {
      property_id: property.id,
      unit: occupiedUnitNumber,
      rent_amount: rentAmount,
      due_date: 5,
      status: 'active'
    });
  }

  await Unit.upsert(schema, {
    propertyId: property.id,
    unitNumber: occupiedUnitNumber,
    rentAmount,
    occupancyStatus: 'occupied',
    tenantAssignment: tenant.id,
    isActive: true
  });

  await Unit.upsert(schema, {
    propertyId: property.id,
    unitNumber: vacantUnitNumber,
    rentAmount: rentAmount + 3000,
    occupancyStatus: 'vacant',
    tenantAssignment: null,
    isActive: true
  });

  fs.mkdirSync(path.join(uploadsRoot, 'leases'), { recursive: true });

  const leaseFileName = buildLeaseFileName(tenantEmail);
  const leaseRelativePath = path.join('uploads', 'leases', leaseFileName);
  const leaseAbsolutePath = path.join(uploadsRoot, 'leases', leaseFileName);

  fs.writeFileSync(
    leaseAbsolutePath,
    [
      'Apex Agencies Starter Lease',
      `Tenant: ${tenantName}`,
      `Landlord: ${landlordName}`,
      `Property: ${propertyName}`,
      `Unit: ${occupiedUnitNumber}`,
      `Monthly Rent: KSh ${rentAmount}`
    ].join('\n'),
    'utf8'
  );

  let lease = await Lease.findByTenantAndUnit(schema, tenantUser.id, property.id, occupiedUnitNumber);
  if (!lease) {
    lease = await Lease.create(schema, {
      tenantId: tenantUser.id,
      propertyId: property.id,
      unit: occupiedUnitNumber,
      filePath: leaseRelativePath,
      fileName: leaseFileName,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      depositAmount: rentAmount,
      penaltyTerms: 'Late payment attracts a 5% penalty after 5 days.'
    });
  }

  const existingPayments = await Payment.findByTenantId(schema, tenant.id);
  let payment = existingPayments[0];
  if (!payment) {
    payment = await Payment.create(schema, {
      tenantId: tenant.id,
      amount: rentAmount,
      currency: 'KSh',
      method: 'mpesa',
      status: 'pending',
      dueDate: new Date('2026-04-05')
    });
  } else {
    await Payment.update(schema, payment.id, {
      amount: rentAmount,
      currency: 'KSh',
      method: 'mpesa',
      status: 'pending',
      due_date: new Date('2026-04-05')
    });
  }

  await createNotification({
    schema,
    userId: tenantUser.id,
    title: 'Welcome to Apex',
    message: `${propertyName} unit ${occupiedUnitNumber} is ready on your dashboard.`
  });

  await createNotification({
    schema,
    userId: landlord.id,
    title: 'Starter data ready',
    message: `${tenantName} has been attached to ${propertyName} unit ${occupiedUnitNumber}.`
  });

  console.log(JSON.stringify({
    message: 'Starter landlord and tenant seeded',
    landlord: {
      email: landlord.email,
      password,
      role: landlord.role
    },
    tenant: {
      email: tenantUser.email,
      password,
      role: tenantUser.role
    },
    property: {
      name: property.name,
      unit: occupiedUnitNumber,
      vacantUnit: vacantUnitNumber
    }
  }, null, 2));
};

seedStarterUsers()
  .catch((error) => {
    console.error('Failed to seed starter users');
    console.error(error);
    process.exitCode = 1;
  })
