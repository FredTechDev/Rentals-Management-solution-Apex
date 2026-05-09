#!/usr/bin/env node

const crypto = require('crypto');

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const API_URL = `${BASE_URL}/api`;
const RUN_PROVIDER_TESTS = /^true$/i.test(process.env.RUN_PROVIDER_TESTS || '');
const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin.e2e@example.com';
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

const runId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const defaultPassword = 'Password123!';
const staffPassword = 'StaffPass123!';
const updatedStaffPassword = 'StaffPass456!';

const results = [];

const endpointUrl = (path) => {
  if (path === '/' || path === '/health') return `${BASE_URL}${path}`;
  if (path.startsWith('/api/')) return `${BASE_URL}${path}`;
  return `${API_URL}${path}`;
};

const preview = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text && text.length > 500 ? `${text.slice(0, 500)}...` : text;
};

const parseResponse = async (response) => {
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') && text) {
    try {
      return { data: JSON.parse(text), text };
    } catch {
      return { data: null, text };
    }
  }
  return { data: text || null, text };
};

const request = async (name, options) => {
  const {
    method = 'GET',
    path,
    token,
    body,
    formData,
    headers = {},
    expected = 200,
    assert,
    skip = false,
    note = ''
  } = options;
  const expectedStatuses = Array.isArray(expected) ? expected : [expected];

  if (skip) {
    results.push({ name, method, path, status: 'SKIP', expected: expectedStatuses.join(', '), note });
    console.log(`SKIP ${method} ${path} - ${name}${note ? ` (${note})` : ''}`);
    return { skipped: true, ok: true, status: null, data: null };
  }

  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const init = {
    method,
    headers: finalHeaders,
    redirect: 'manual'
  };

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  } else if (formData) {
    init.body = formData;
  }

  let status = 0;
  let data = null;
  let text = '';

  try {
    const response = await fetch(endpointUrl(path), init);
    status = response.status;
    ({ data, text } = await parseResponse(response));
  } catch (error) {
    text = error.message;
  }

  let ok = expectedStatuses.includes(status);
  let assertionError = '';
  if (ok && assert) {
    try {
      const assertionResult = assert(data);
      if (assertionResult === false) {
        ok = false;
        assertionError = 'response assertion returned false';
      }
    } catch (error) {
      ok = false;
      assertionError = error.message;
    }
  }

  results.push({
    name,
    method,
    path,
    status: ok ? 'PASS' : 'FAIL',
    httpStatus: status,
    expected: expectedStatuses.join(', '),
    note
  });

  console.log(`${ok ? 'PASS' : 'FAIL'} ${method} ${path} - ${name} [${status || 'ERR'}]`);
  if (!ok) {
    console.log(`  expected: ${expectedStatuses.join(', ')}`);
    if (assertionError) console.log(`  assertion: ${assertionError}`);
    console.log(`  response: ${preview(data || text)}`);
  }

  return { ok, status, data, text };
};

const requireValue = (value, label) => {
  if (!value) {
    throw new Error(`Missing required test state: ${label}`);
  }
  return value;
};

const asArray = (value) => Array.isArray(value) ? value : [];

const findByEmail = (items, email) => asArray(items).find((item) => item.email === email);

const makeFormData = (fields, fileField) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(key, String(value));
  }
  if (fileField) {
    form.append(fileField.name, fileField.blob, fileField.filename);
  }
  return form;
};

const main = async () => {
  console.log(`Endpoint E2E base URL: ${BASE_URL}`);
  console.log(`Run id: ${runId}`);

  await request('Root service banner', { path: '/', expected: 200 });
  await request('Health check with database readiness', { path: '/health', expected: 200 });
  await request('Public available properties before setup', { path: '/auth/properties/available', expected: 200 });

  const adminLogin = await request('Super admin login', {
    method: 'POST',
    path: '/auth/login',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    expected: 200
  });
  const adminToken = requireValue(adminLogin.data?.token, 'admin token');

  const landlordEmail = `landlord.${runId}@example.com`;
  const secondLandlordEmail = `landlord.second.${runId}@example.com`;
  const landlordRegister = await request('Register landlord and create organization workspace', {
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'E2E Landlord',
      email: landlordEmail,
      password: defaultPassword,
      role: 'landlord',
      phoneNumber: '+254700000001'
    },
    expected: 201
  });
  const organizationId = requireValue(landlordRegister.data?.organizationId, 'landlord organization id');

  const secondLandlordRegister = await request('Register second landlord and separate organization workspace', {
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'E2E Second Landlord',
      email: secondLandlordEmail,
      password: defaultPassword,
      role: 'landlord',
      phoneNumber: '+254700000099'
    },
    expected: 201
  });
  const secondOrganizationId = requireValue(secondLandlordRegister.data?.organizationId, 'second organization id');

  const landlordLogin = await request('Landlord login', {
    method: 'POST',
    path: '/auth/login',
    body: { email: landlordEmail, password: defaultPassword, organizationId },
    expected: 200
  });
  const landlordToken = requireValue(landlordLogin.data?.token, 'landlord token');
  const landlordUserId = requireValue(landlordLogin.data?.user?.id, 'landlord user id');

  const secondLandlordLogin = await request('Second landlord login', {
    method: 'POST',
    path: '/auth/login',
    body: { email: secondLandlordEmail, password: defaultPassword, organizationId: secondOrganizationId },
    expected: 200
  });
  const secondLandlordToken = requireValue(secondLandlordLogin.data?.token, 'second landlord token');

  await request('First landlord cannot log into second organization context', {
    method: 'POST',
    path: '/auth/login',
    body: { email: landlordEmail, password: defaultPassword, organizationId: secondOrganizationId },
    expected: 403
  });
  await request('Second landlord cannot log into first organization context', {
    method: 'POST',
    path: '/auth/login',
    body: { email: secondLandlordEmail, password: defaultPassword, organizationId },
    expected: 403
  });

  await request('Current landlord user', { path: '/auth/me', token: landlordToken, expected: 200 });
  await request('Initial organization staff list', { path: '/auth/staff', token: landlordToken, expected: 200 });

  const staffEmail = `manager.${runId}@example.com`;
  await request('Create organization staff', {
    method: 'POST',
    path: '/auth/staff',
    token: landlordToken,
    body: {
      name: 'E2E Manager',
      email: staffEmail,
      password: staffPassword,
      role: 'property_manager',
      phoneNumber: '+254700000002'
    },
    expected: 201
  });
  const staffLogin = await request('Staff login with temporary password', {
    method: 'POST',
    path: '/auth/login',
    body: { email: staffEmail, password: staffPassword, organizationId },
    expected: 200
  });
  const staffToken = requireValue(staffLogin.data?.token, 'staff token');
  await request('Staff forced password change', {
    method: 'POST',
    path: '/auth/change-password',
    token: staffToken,
    body: { currentPassword: staffPassword, newPassword: updatedStaffPassword },
    expected: 200
  });

  await request('Admin summary', { path: '/admin/summary', token: adminToken, expected: 200 });
  await request('Admin organizations list', { path: '/admin/organizations', token: adminToken, expected: 200 });
  await request('Admin audit logs', { path: '/admin/logs?limit=20', token: adminToken, expected: 200 });
  await request('Admin update organization billing', {
    method: 'PUT',
    path: `/admin/organizations/${organizationId}/billing`,
    token: adminToken,
    body: { pricePerUnit: 0, billingCycleMonths: 1, status: 'active' },
    expected: 200
  });

  const propertyCreate = await request('Create property with units', {
    method: 'POST',
    path: '/properties',
    token: landlordToken,
    body: {
      name: `E2E Residency ${runId}`,
      address: 'Nairobi Test Avenue',
      description: 'Created by endpoint E2E test',
      type: 'apartment',
      units: ['A1', 'A2', 'B1']
    },
    expected: 201
  });
  const propertyId = requireValue(propertyCreate.data?.id, 'property id');

  const secondPropertyCreate = await request('Create property in second tenant workspace', {
    method: 'POST',
    path: '/properties',
    token: secondLandlordToken,
    body: {
      name: `E2E Other Portfolio ${runId}`,
      address: 'Mombasa Tenant Boundary Avenue',
      units: ['Z1']
    },
    expected: 201
  });
  const secondPropertyId = requireValue(secondPropertyCreate.data?.id, 'second property id');

  await request('Public available properties after setup', { path: '/auth/properties/available', expected: 200 });
  await request('List landlord properties excludes second tenant workspace', {
    path: '/properties',
    token: landlordToken,
    expected: 200,
    assert: (data) => {
      const ids = asArray(data).map((property) => property.id);
      if (!ids.includes(propertyId)) throw new Error('first organization property missing');
      if (ids.includes(secondPropertyId)) throw new Error('second organization property leaked into first organization');
    }
  });
  await request('List second landlord properties excludes first tenant workspace', {
    path: '/properties',
    token: secondLandlordToken,
    expected: 200,
    assert: (data) => {
      const ids = asArray(data).map((property) => property.id);
      if (!ids.includes(secondPropertyId)) throw new Error('second organization property missing');
      if (ids.includes(propertyId)) throw new Error('first organization property leaked into second organization');
    }
  });
  await request('Second landlord cannot read first organization property units', {
    path: `/properties/${propertyId}/units`,
    token: secondLandlordToken,
    expected: 404
  });
  await request('Update property details', {
    method: 'PUT',
    path: `/properties/${propertyId}`,
    token: landlordToken,
    body: {
      name: `E2E Residency Updated ${runId}`,
      address: 'Nairobi Updated Avenue',
      units: ['A1', 'A2', 'B1', 'C1']
    },
    expected: 200
  });
  await request('List units by property', {
    path: `/properties/${propertyId}/units`,
    token: landlordToken,
    expected: 200
  });
  const createdUnit = await request('Create unit', {
    method: 'POST',
    path: '/units',
    token: landlordToken,
    body: {
      propertyId,
      unitNumber: 'D1',
      rentAmount: 15000,
      occupancyStatus: 'vacant',
      meterReadings: { water: 10, electricity: 50 }
    },
    expected: 201
  });
  const unitId = requireValue(createdUnit.data?.id, 'unit id');
  await request('Update unit', {
    method: 'PUT',
    path: `/units/${unitId}`,
    token: landlordToken,
    body: {
      rentAmount: 15500,
      occupancyStatus: 'reserved',
      meterReadings: { water: 12, electricity: 55 },
      isActive: true
    },
    expected: 200
  });

  await request('Billing summary before chargeable subscription payment', {
    path: '/billing/my-billing',
    token: landlordToken,
    expected: 200
  });
  await request('Billing subscription payment with zero balance', {
    method: 'POST',
    path: '/billing/pay-subscription',
    token: landlordToken,
    expected: 200
  });

  const tenantEmail = `tenant.${runId}@example.com`;
  const approveTenantEmail = `tenant.approve.${runId}@example.com`;
  const rejectTenantEmail = `tenant.reject.${runId}@example.com`;
  const inquiryEmail = `inquiry.${runId}@example.com`;

  await request('Register tenant application for direct assignment', {
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'E2E Tenant Direct',
      email: tenantEmail,
      password: defaultPassword,
      role: 'tenant',
      phoneNumber: '+254700000003',
      interestedProperty: propertyId,
      interestedUnit: 'A1',
      organizationId
    },
    expected: 201
  });
  await request('Register tenant application for approval flow', {
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'E2E Tenant Approval',
      email: approveTenantEmail,
      password: defaultPassword,
      role: 'tenant',
      phoneNumber: '+254700000004',
      interestedProperty: propertyId,
      interestedUnit: 'A2',
      organizationId
    },
    expected: 201
  });
  await request('Register tenant application for rejection flow', {
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'E2E Tenant Reject',
      email: rejectTenantEmail,
      password: defaultPassword,
      role: 'tenant',
      phoneNumber: '+254700000005',
      interestedProperty: propertyId,
      interestedUnit: 'B1',
      organizationId
    },
    expected: 201
  });
  await request('Submit guest inquiry', {
    method: 'POST',
    path: '/auth/inquiry',
    body: {
      name: 'E2E Inquiry',
      email: inquiryEmail,
      phoneNumber: '+254700000006',
      interestedProperty: propertyId,
      interestedUnit: 'C1',
      organizationId
    },
    expected: 201
  });
  await request('Tenant registration rejects property from another organization context', {
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'E2E Cross Tenant',
      email: `tenant.cross.${runId}@example.com`,
      password: defaultPassword,
      role: 'tenant',
      interestedProperty: propertyId,
      interestedUnit: 'A1',
      organizationId: secondOrganizationId
    },
    expected: 404
  });

  const adminPending = await request('Admin pending users', {
    path: '/admin/users/pending',
    token: adminToken,
    expected: 200
  });
  const inquiryUser = requireValue(findByEmail(adminPending.data, inquiryEmail), 'inquiry pending user');
  await request('Admin approve pending user', {
    method: 'POST',
    path: `/admin/users/${inquiryUser.id}/approve`,
    token: adminToken,
    expected: 200
  });

  const pendingRegistrations = await request('Landlord pending registrations', {
    path: '/pending-registrations',
    token: landlordToken,
    expected: 200
  });
  const directTenantUser = requireValue(findByEmail(pendingRegistrations.data, tenantEmail), 'direct tenant pending user');
  const approveTenantUser = requireValue(findByEmail(pendingRegistrations.data, approveTenantEmail), 'approval tenant pending user');
  const rejectTenantUser = requireValue(findByEmail(pendingRegistrations.data, rejectTenantEmail), 'reject tenant pending user');

  await request('Reject tenant registration', {
    method: 'POST',
    path: `/reject-registration/${rejectTenantUser.id}`,
    token: landlordToken,
    expected: 200
  });

  const directTenant = await request('Create tenant profile directly', {
    method: 'POST',
    path: '/tenants',
    token: landlordToken,
    body: {
      user: directTenantUser.id,
      property: propertyId,
      unit: 'A1',
      rentAmount: 12000,
      dueDate: 1,
      status: 'active',
      leaseStart: '2026-01-01',
      leaseEnd: '2026-12-31'
    },
    expected: 201
  });
  const tenantProfileId = requireValue(directTenant.data?.id, 'tenant profile id');

  await request('Approve tenant registration and generate lease entry', {
    method: 'POST',
    path: `/approve-registration/${approveTenantUser.id}`,
    token: landlordToken,
    body: {
      rentAmount: 13000,
      depositAmount: 13000,
      dueDate: 1,
      leaseStart: '2026-01-01',
      leaseEnd: '2026-12-31'
    },
    expected: 200
  });
  await request('List property tenants', {
    path: `/properties/${propertyId}/tenants`,
    token: landlordToken,
    expected: 200
  });

  const tenantLogin = await request('Tenant login', {
    method: 'POST',
    path: '/auth/login',
    body: { email: tenantEmail, password: defaultPassword, organizationId },
    expected: 200
  });
  const tenantToken = requireValue(tenantLogin.data?.token, 'tenant token');
  await request('Current tenant user', { path: '/auth/me', token: tenantToken, expected: 200 });

  await request('Toggle global chat on', {
    method: 'POST',
    path: '/messages/toggle-global',
    token: landlordToken,
    body: { enabled: true },
    expected: 200
  });
  await request('Post global message', {
    method: 'POST',
    path: '/messages',
    token: landlordToken,
    body: { content: `Global E2E message ${runId}` },
    expected: 201
  });
  await request('Get global messages', { path: '/messages', token: landlordToken, expected: 200 });
  await request('Post property message as landlord', {
    method: 'POST',
    path: '/messages',
    token: landlordToken,
    body: { content: `Property E2E message ${runId}`, propertyId },
    expected: 201
  });
  await request('Get property messages as tenant default chat', {
    path: '/messages',
    token: tenantToken,
    expected: 200
  });
  await request('Post property message as tenant default chat', {
    method: 'POST',
    path: '/messages',
    token: tenantToken,
    body: { content: `Tenant E2E reply ${runId}` },
    expected: 201
  });

  const repairCreate = await request('Create repair request as tenant', {
    method: 'POST',
    path: '/repairs',
    token: tenantToken,
    body: {
      propertyId,
      unit: 'A1',
      category: 'plumbing',
      description: 'Kitchen sink leak from endpoint E2E test'
    },
    expected: 201
  });
  const repairId = requireValue(repairCreate.data?.id, 'repair request id');
  await request('List repair requests as landlord', { path: '/repairs', token: landlordToken, expected: 200 });
  await request('Update repair request', {
    method: 'PUT',
    path: `/repairs/${repairId}`,
    token: landlordToken,
    body: {
      status: 'in-progress',
      landlordResponse: 'Technician assigned',
      technicianDetails: 'E2E plumber',
      assignedTo: landlordUserId,
      cost: 500
    },
    expected: 200
  });

  const tenantNotifications = await request('List tenant notifications', {
    path: '/notifications',
    token: tenantToken,
    expected: 200
  });
  const notificationId = asArray(tenantNotifications.data)[0]?.id;
  await request('Mark tenant notification read', {
    method: 'PATCH',
    path: `/notifications/${notificationId || crypto.randomUUID()}/read`,
    token: tenantToken,
    expected: notificationId ? 200 : 404
  });

  await request('Create anonymous suggestion as tenant', {
    method: 'POST',
    path: '/suggestions',
    token: tenantToken,
    body: { content: `Please add hallway lighting ${runId}` },
    expected: 201
  });
  await request('List suggestions as landlord', { path: '/suggestions', token: landlordToken, expected: 200 });

  await request('Get landlord payment settings', {
    path: '/payments/settings',
    token: landlordToken,
    expected: 200
  });
  await request('Update landlord payment settings', {
    method: 'PUT',
    path: '/payments/settings',
    token: landlordToken,
    body: {
      mpesaShortcode: '174379',
      mpesaConsumerKey: 'test-consumer-key',
      mpesaConsumerSecret: 'test-consumer-secret',
      mpesaPasskey: 'test-passkey',
      bankDetails: {
        bankName: 'E2E Bank',
        accountNumber: '1234567890',
        accountName: 'Apex E2E'
      },
      paymentMethods: ['mpesa', 'bank_transfer']
    },
    expected: 200
  });
  await request('Get landlord payment methods', {
    path: '/payments/methods',
    token: tenantToken,
    expected: 200
  });
  await request('List payments as landlord', { path: '/payments', token: landlordToken, expected: 200 });
  await request('STK push rejects unknown tenant before provider call', {
    method: 'POST',
    path: '/payments/stkpush',
    token: landlordToken,
    body: {
      amount: 1,
      phoneNumber: '254712345678',
      tenantId: crypto.randomUUID()
    },
    expected: 404
  });
  await request('Live STK push through Safaricom sandbox', {
    method: 'POST',
    path: '/payments/stkpush',
    token: landlordToken,
    body: {
      amount: 1,
      phoneNumber: process.env.E2E_MPESA_PHONE || '254712345678',
      tenantId: tenantProfileId
    },
    expected: 200,
    skip: !RUN_PROVIDER_TESTS,
    note: 'set RUN_PROVIDER_TESTS=true with valid M-Pesa credentials'
  });
  await request('M-Pesa callback rejects invalid payload', {
    method: 'POST',
    path: '/payments/callback',
    body: { invalid: true },
    expected: 400
  });

  await request('Toggle auto reminders', {
    method: 'POST',
    path: '/reminders/toggle',
    token: landlordToken,
    body: { enabled: true },
    expected: 200
  });
  await request('Update reminder settings', {
    method: 'POST',
    path: '/reminders/settings',
    token: landlordToken,
    body: { beforeDays: 3, afterDays: 3 },
    expected: 200
  });
  await request('Trigger manual reminder', {
    method: 'POST',
    path: '/reminders/manual',
    token: landlordToken,
    body: { tenantId: tenantProfileId },
    expected: 200
  });
  await request('Trigger all reminders', {
    method: 'POST',
    path: '/reminders/trigger-all',
    token: landlordToken,
    expected: 200
  });

  await request('Tenant lease lookup', { path: '/leases/tenant', token: tenantToken, expected: 200 });
  const landlordLeases = await request('Landlord leases list', {
    path: '/leases/landlord',
    token: landlordToken,
    expected: 200
  });
  const leaseId = asArray(landlordLeases.data)[0]?.id;
  await request('View generated non-Cloudinary lease entry', {
    path: `/leases/view/${leaseId || crypto.randomUUID()}`,
    token: landlordToken,
    expected: leaseId ? 400 : 404
  });
  await request('Lease upload rejects missing multipart file', {
    method: 'POST',
    path: '/leases/upload',
    token: landlordToken,
    body: {
      tenantId: directTenantUser.id,
      propertyId,
      unit: 'A1',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      depositAmount: 12000,
      penaltyTerms: 'Standard terms'
    },
    expected: 400
  });

  const leaseForm = makeFormData({
    tenantId: directTenantUser.id,
    propertyId,
    unit: 'A1',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    depositAmount: 12000,
    penaltyTerms: 'Standard terms'
  }, {
    name: 'lease',
    blob: new Blob(['E2E lease document'], { type: 'application/pdf' }),
    filename: 'e2e-lease.pdf'
  });
  await request('Live Cloudinary lease upload', {
    method: 'POST',
    path: '/leases/upload',
    token: landlordToken,
    formData: leaseForm,
    expected: 201,
    skip: !RUN_PROVIDER_TESTS,
    note: 'set RUN_PROVIDER_TESTS=true with valid Cloudinary credentials'
  });

  if (leaseId) {
    await request('Delete generated lease entry', {
      method: 'DELETE',
      path: `/leases/${leaseId}`,
      token: landlordToken,
      expected: 200
    });
  }
  await request('Delete repair request', {
    method: 'DELETE',
    path: `/repairs/${repairId}`,
    token: landlordToken,
    expected: 200
  });

  await request('Paystack webhook rejects bad signature', {
    method: 'POST',
    path: '/webhooks/paystack',
    headers: { 'x-paystack-signature': 'invalid-signature' },
    body: {
      event: 'charge.success',
      data: {
        amount: 100,
        reference: `bad-${runId}`,
        metadata: { organizationId, type: 'subscription_payment' }
      }
    },
    expected: 401
  });
  await request('Live Paystack checkout with billable balance', {
    method: 'POST',
    path: '/billing/pay-subscription',
    token: landlordToken,
    expected: 200,
    skip: !RUN_PROVIDER_TESTS,
    note: 'set RUN_PROVIDER_TESTS=true with valid Paystack credentials and nonzero billing'
  });

  await request('Delete property and tenant-scoped records', {
    method: 'DELETE',
    path: `/properties/${propertyId}`,
    token: landlordToken,
    expected: 200
  });
  await request('Delete second tenant workspace property', {
    method: 'DELETE',
    path: `/properties/${secondPropertyId}`,
    token: secondLandlordToken,
    expected: 200
  });

  const passCount = results.filter((result) => result.status === 'PASS').length;
  const failCount = results.filter((result) => result.status === 'FAIL').length;
  const skipCount = results.filter((result) => result.status === 'SKIP').length;

  console.log('');
  console.log(`Endpoint E2E summary: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  if (failCount > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(`FATAL ${error.message}`);
  process.exitCode = 1;
});
