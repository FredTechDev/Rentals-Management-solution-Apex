const { connectDatabase, pool } = require('../config/database');
const { runPublicMigrations } = require('../database');
const { User } = require('../models');
const { ROLES } = require('../helpers/rbac');

const adminName = process.env.SUPER_ADMIN_NAME || 'Apex Super Admin';
const adminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin.e2e@example.com').trim().toLowerCase();
const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

const seedSuperAdmin = async () => {
  if (!adminEmail || !adminPassword) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set.');
  }

  await connectDatabase();
  await runPublicMigrations();

  let user = await User.findByEmail(adminEmail);
  const existed = Boolean(user);

  if (!user) {
    user = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: ROLES.SUPER_ADMIN,
      status: 'active'
    });
  } else {
    user = await User.update(user.id, {
      name: adminName,
      password: adminPassword,
      role: ROLES.SUPER_ADMIN,
      status: 'active',
      is_active: true,
      organization_id: null
    });
  }
  console.log(JSON.stringify({
    message: existed ? 'Super admin updated' : 'Super admin created',
    email: user.email,
    password: adminPassword,
    role: user.role
    }, null, 2));
};

seedSuperAdmin()
  .catch((error) => {
    console.error('Failed to seed super admin');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
