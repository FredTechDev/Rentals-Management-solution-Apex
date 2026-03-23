const { connectDatabase, mongoose } = require('../config/database');
const { mongodbUri } = require('../config/env');
const { User } = require('../models');
const { ensureOrganizationForUser } = require('../helpers/organization');
const { ROLES } = require('../helpers/rbac');

const adminName = process.env.SUPER_ADMIN_NAME || 'Apex Super Admin';
const adminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@apex.local').trim().toLowerCase();
const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

const seedSuperAdmin = async () => {
  if (!adminEmail || !adminPassword) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set.');
  }

  await connectDatabase(mongodbUri);

  let user = await User.findOne({ email: adminEmail });
  const existed = Boolean(user);

  if (!user) {
    user = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: ROLES.SUPER_ADMIN,
      status: 'active'
    });
  } else {
    user.name = adminName;
    user.password = adminPassword;
    user.role = ROLES.SUPER_ADMIN;
    user.status = 'active';
    user.isActive = true;
  }

  await user.save();
  const organizationId = await ensureOrganizationForUser(user, 'Apex Platform Admin');

  console.log(JSON.stringify({
    message: existed ? 'Super admin updated' : 'Super admin created',
    email: user.email,
    password: adminPassword,
    role: user.role,
    organizationId: organizationId.toString()
  }, null, 2));
};

seedSuperAdmin()
  .catch((error) => {
    console.error('Failed to seed super admin');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
