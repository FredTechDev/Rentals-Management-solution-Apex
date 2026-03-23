const fs = require('fs');
const path = require('path');
const { connectDatabase, mongoose } = require('../config/database');
const { mongodbUri, uploadsRoot } = require('../config/env');
const {
  Lease,
  Notification,
  Payment,
  Property,
  Tenant,
  Unit,
  User
} = require('../models');
const { ensureOrganizationForUser } = require('../helpers/organization');
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

const upsertUser = async ({ email, name, organization = null, role, status }) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = new User({
      name,
      email,
      password,
      role,
      status,
      organization
    });
  } else {
    user.name = name;
    user.password = password;
    user.role = role;
    user.status = status;
    user.isActive = true;
    user.organization = organization;
  }

  await user.save();
  return user;
};

const upsertNotification = async ({ organization, user, title, message, type = 'system_notice' }) => {
  const existing = await Notification.findOne({ user, title });

  if (existing) {
    existing.message = message;
    existing.organization = organization;
    existing.type = type;
    existing.isRead = false;
    await existing.save();
    return existing;
  }

  return Notification.create({
    organization,
    user,
    title,
    message,
    type
  });
};

const seedStarterUsers = async () => {
  if (!tenantEmail || !landlordEmail || !password) {
    throw new Error('TENANT_EMAIL, LANDLORD_EMAIL, and USER_PASSWORD must be set.');
  }

  await connectDatabase(mongodbUri);

  let landlord = await upsertUser({
    email: landlordEmail,
    name: landlordName,
    role: ROLES.LANDLORD,
    status: 'active'
  });

  const organizationId = await ensureOrganizationForUser(landlord, `${landlordName}'s Portfolio`);
  landlord = await User.findById(landlord._id);

  let property = await Property.findOne({
    organization: organizationId,
    name: propertyName
  });

  if (!property) {
    property = new Property({
      organization: organizationId,
      name: propertyName,
      address: propertyAddress,
      description: 'Starter property for landlord and tenant testing.',
      type: 'apartment',
      landlord: landlord._id,
      units: [occupiedUnitNumber, vacantUnitNumber]
    });
  } else {
    property.organization = organizationId;
    property.address = propertyAddress;
    property.description = 'Starter property for landlord and tenant testing.';
    property.type = 'apartment';
    property.landlord = landlord._id;
    property.units = [occupiedUnitNumber, vacantUnitNumber];
  }

  await property.save();

  let tenantUser = await upsertUser({
    email: tenantEmail,
    name: tenantName,
    organization: organizationId,
    role: ROLES.TENANT,
    status: 'active'
  });

  tenantUser.interestedProperty = property._id;
  tenantUser.interestedUnit = occupiedUnitNumber;
  await tenantUser.save();

  let tenant = await Tenant.findOne({ user: tenantUser._id });

  if (!tenant) {
    tenant = new Tenant({
      organization: organizationId,
      user: tenantUser._id,
      property: property._id,
      unit: occupiedUnitNumber,
      rentAmount,
      dueDate: 5,
      status: 'active'
    });
  } else {
    tenant.organization = organizationId;
    tenant.property = property._id;
    tenant.unit = occupiedUnitNumber;
    tenant.rentAmount = rentAmount;
    tenant.dueDate = 5;
    tenant.status = 'active';
  }

  await tenant.save();

  await Unit.findOneAndUpdate({
    property: property._id,
    unitNumber: occupiedUnitNumber
  }, {
    organization: organizationId,
    property: property._id,
    unitNumber: occupiedUnitNumber,
    rentAmount,
    occupancyStatus: 'occupied',
    tenantAssignment: tenant._id,
    isActive: true
  }, {
    upsert: true,
    returnDocument: 'after',
    setDefaultsOnInsert: true
  });

  await Unit.findOneAndUpdate({
    property: property._id,
    unitNumber: vacantUnitNumber
  }, {
    organization: organizationId,
    property: property._id,
    unitNumber: vacantUnitNumber,
    rentAmount: rentAmount + 3000,
    occupancyStatus: 'vacant',
    tenantAssignment: null,
    isActive: true
  }, {
    upsert: true,
    returnDocument: 'after',
    setDefaultsOnInsert: true
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

  let lease = await Lease.findOne({
    tenant: tenantUser._id,
    property: property._id,
    unit: occupiedUnitNumber
  });

  if (!lease) {
    lease = new Lease({
      organization: organizationId,
      tenant: tenantUser._id,
      property: property._id,
      unit: occupiedUnitNumber,
      filePath: leaseRelativePath,
      fileName: leaseFileName,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      depositAmount: rentAmount,
      penaltyTerms: 'Late payment attracts a 5% penalty after 5 days.'
    });
  } else {
    lease.organization = organizationId;
    lease.filePath = leaseRelativePath;
    lease.fileName = leaseFileName;
    lease.startDate = new Date('2026-01-01');
    lease.endDate = new Date('2026-12-31');
    lease.depositAmount = rentAmount;
    lease.penaltyTerms = 'Late payment attracts a 5% penalty after 5 days.';
  }

  await lease.save();

  let payment = await Payment.findOne({ tenant: tenant._id }).sort({ createdAt: -1 });

  if (!payment) {
    payment = new Payment({
      organization: organizationId,
      tenant: tenant._id,
      amount: rentAmount,
      currency: 'KSh',
      method: 'mpesa',
      status: 'pending',
      dueDate: new Date('2026-04-05')
    });
  } else {
    payment.organization = organizationId;
    payment.amount = rentAmount;
    payment.currency = 'KSh';
    payment.method = 'mpesa';
    payment.status = 'pending';
    payment.dueDate = new Date('2026-04-05');
  }

  await payment.save();

  await upsertNotification({
    organization: organizationId,
    user: tenantUser._id,
    title: 'Welcome to Apex',
    message: `${propertyName} unit ${occupiedUnitNumber} is ready on your dashboard.`
  });

  await upsertNotification({
    organization: organizationId,
    user: landlord._id,
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
  .finally(async () => {
    await mongoose.connection.close();
  });
