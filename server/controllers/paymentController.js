const { MpesaTransaction, Payment, Property, Tenant, User, Organization } = require('../models');
const { logAudit, logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { createNotification } = require('../helpers/notifications');
const { initiateSTKPush } = require('../services/mpesaService');
const { notifyLandlord, sendPaymentConfirmation } = require('../services/emailService');
const { ROLES } = require('../helpers/rbac');

const canManageProperty = (user, property) => Boolean(property) && (
  user.role === ROLES.SUPER_ADMIN
  || property.landlord_id === user.id
  || property.manager_id === user.id
);

const getPayments = async (req, res) => {
  let payments;

  if ([ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN].includes(req.user.role)) {
    const filter = req.user.role === ROLES.SUPER_ADMIN
      ? {}
      : { landlordId: req.user.id, managerId: req.user.id };
    const properties = await Property.find(req.schema, filter);
    const propertyIds = properties.map((property) => property.id);
    const tenants = await Tenant.find(req.schema, { propertyIds });
    const tenantIds = tenants.map((tenant) => tenant.id);

    payments = await Payment.findByTenantIds(req.schema, tenantIds);
    const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    const users = await User.findByIds(tenants.map((tenant) => tenant.user_id));
    const userMap = new Map(users.map((user) => [user.id, user]));

    payments = payments.map((payment) => {
      const tenant = tenantMap.get(payment.tenant_id);
      const user = tenant ? userMap.get(tenant.user_id) : null;
      return {
        ...payment,
        tenant: tenant ? {
          ...tenant,
          user: user ? { id: user.id, name: user.name, email: user.email } : null
        } : null
      };
    });
  } else {
    const tenant = await Tenant.findOne(req.schema, { userId: req.user.id });
    if (!tenant) {
      res.json([]);
      return;
    }

    payments = await Payment.findByTenantId(req.schema, tenant.id);
    const user = await User.findById(tenant.user_id);
    payments = payments.map((payment) => ({
      ...payment,
      tenant: {
        ...tenant,
        user: user ? { id: user.id, name: user.name, email: user.email } : null
      }
    }));
  }

  res.json(payments);
};

const initiatePaymentStkPush = async (req, res) => {
  const { amount, phoneNumber, tenantId } = req.body;

  let tenant = await Tenant.findById(req.schema, tenantId);
  if (!tenant) {
    tenant = await Tenant.findOne(req.schema, { userId: tenantId });
  }

  if (!tenant) {
    sendError(res, 404, 'Tenant profile not found');
    return;
  }

  const organization = await Organization.findById(req.organizationId);
  const user = await User.findById(tenant.user_id);
  const property = await Property.findById(req.schema, tenant.property_id);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (req.user.role === ROLES.TENANT && tenant.user_id !== req.user.id) {
    sendError(res, 403, 'You can only pay for your own tenant account');
    return;
  }

  if (req.user.role !== ROLES.TENANT && !canManageProperty(req.user, property)) {
    sendError(res, 403, 'You do not have permission to initiate payments for this tenant');
    return;
  }

  const mpesaConfig = {
    mpesa_shortcode: organization.mpesa_shortcode,
    mpesa_consumer_key: organization.mpesa_consumer_key,
    mpesa_consumer_secret: organization.mpesa_consumer_secret,
    mpesa_passkey: organization.mpesa_passkey,
    mpesa_callback_url: process.env.MPESA_CALLBACK_URL // Keep platform callback for unified tracking
  };

  const response = await initiateSTKPush(phoneNumber, amount, `Tenant-${tenant.user_id || tenantId}`, mpesaConfig);

  const transaction = await MpesaTransaction.create(req.schema, {
    tenantId: tenant.id,
    merchantRequestId: response.MerchantRequestID,
    checkoutRequestId: response.CheckoutRequestID,
    phoneNumber,
    amount,
    status: 'pending'
  });

  let payment = await Payment.findPendingByTenant(req.schema, tenant.id);

  if (!payment) {
    payment = await Payment.create(req.schema, {
      tenantId: tenant.id,
      amount,
      dueDate: new Date(),
      status: 'pending',
      method: 'mpesa'
    });
  }

  payment = await Payment.update(req.schema, payment.id, {
    amount,
    reference: response.CheckoutRequestID,
    mpesa_transaction_id: transaction.id,
    method: 'mpesa'
  });

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Payment checkout started',
    entityType: 'payment',
    entityId: payment.id,
    metadata: {
      tenantName: user?.name || '',
      summary: `KSh ${amount} • ${phoneNumber}`,
      checkoutRequestId: response.CheckoutRequestID
    }
  });

  res.json({
    message: 'STK Push initiated',
    checkoutRequestId: response.CheckoutRequestID
  });
};

const getPaymentSettings = async (req, res) => {
  if (req.user.role !== ROLES.LANDLORD && req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Only landlords can access payment settings');
  }

  const organization = await Organization.findById(req.organizationId);
  res.json({
    mpesaShortcode: organization.mpesa_shortcode,
    mpesaConsumerKey: organization.mpesa_consumer_key,
    mpesaConsumerSecret: organization.mpesa_consumer_secret ? '********' : null,
    mpesaPasskey: organization.mpesa_passkey ? '********' : null,
    bankDetails: organization.bank_details || {},
    paymentMethods: organization.payment_methods || ['mpesa']
  });
};

const updatePaymentSettings = async (req, res) => {
  if (req.user.role !== ROLES.LANDLORD && req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Only landlords can update payment settings');
  }

  const { mpesaShortcode, mpesaConsumerKey, mpesaConsumerSecret, mpesaPasskey, bankDetails, paymentMethods } = req.body;
  
  const updates = {};
  if (mpesaShortcode !== undefined) updates.mpesa_shortcode = mpesaShortcode;
  if (mpesaConsumerKey !== undefined) updates.mpesa_consumer_key = mpesaConsumerKey;
  if (mpesaConsumerSecret !== undefined) updates.mpesa_consumer_secret = mpesaConsumerSecret;
  if (mpesaPasskey !== undefined) updates.mpesa_passkey = mpesaPasskey;
  if (bankDetails !== undefined) updates.bank_details = bankDetails;
  if (paymentMethods !== undefined) updates.payment_methods = paymentMethods;

  const organization = await Organization.update(req.organizationId, updates);

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Payment settings updated',
    entityType: 'organization',
    entityId: req.organizationId,
    metadata: {
      summary: 'Payment credentials updated'
    }
  });

  res.json({ 
    message: 'Payment settings updated successfully',
    paymentMethods: organization.payment_methods 
  });
};

const getLandlordPaymentMethods = async (req, res) => {
  const organization = await Organization.findById(req.organizationId);
  res.json({
    paymentMethods: organization.payment_methods || ['mpesa'],
    bankDetails: (organization.payment_methods || []).includes('bank_transfer') 
      ? organization.bank_details 
      : null
  });
};

const handleMpesaCallback = async (req, res) => {
  const callbackData = req.body?.Body?.stkCallback;
  if (!callbackData) {
    sendError(res, 400, 'Invalid callback payload');
    return;
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, MerchantRequestID } = callbackData;
  const organizations = await Organization.findAll();
  let transaction = null;
  let schemaName = null;
  let organizationId = null;

  for (const org of organizations) {
    if (!org.schema_name || !['trial', 'active'].includes(org.status)) continue;
    let match = null;
    try {
      match = await MpesaTransaction.findByCheckoutRequestId(org.schema_name, CheckoutRequestID);
    } catch (error) {
      continue;
    }
    if (match) {
      transaction = match;
      schemaName = org.schema_name;
      organizationId = org.id;
      break;
    }
  }

  if (!transaction || !schemaName) {
    sendError(res, 404, 'Transaction not found');
    return;
  }

  const updates = {
    merchant_request_id: MerchantRequestID,
    result_code: Number(ResultCode),
    result_desc: ResultDesc
  };

  if (Number(ResultCode) === 0) {
    const metadata = callbackData.CallbackMetadata?.Item || [];
    updates.mpesa_receipt_number = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || null;
    updates.transaction_date = new Date();
    updates.status = 'completed';
    transaction = await MpesaTransaction.update(schemaName, transaction.id, updates);

    let payment = await Payment.findByMpesaTransactionId(schemaName, transaction.id);
    if (!payment && transaction.tenant_id) {
      payment = await Payment.findPendingByTenant(schemaName, transaction.tenant_id);
    }

    if (payment) {
      payment = await Payment.update(schemaName, payment.id, {
        status: 'paid',
        payment_date: new Date(),
        mpesa_transaction_id: transaction.id,
        reference: transaction.mpesa_receipt_number || payment.reference
      });

      const tenant = transaction.tenant_id ? await Tenant.findById(schemaName, transaction.tenant_id) : null;
      const tenantUser = tenant ? await User.findById(tenant.user_id) : null;
      const property = tenant ? await Property.findById(schemaName, tenant.property_id) : null;
      const landlord = property?.landlord_id ? await User.findById(property.landlord_id) : null;

      if (tenantUser?.email) {
        await sendPaymentConfirmation(
          tenantUser.email,
          tenantUser.name,
          transaction.amount,
          transaction.mpesa_receipt_number
        );
      }

      if (landlord?.email && tenantUser) {
        await notifyLandlord(landlord.email, tenantUser.name, transaction.amount, tenant?.unit || '');
      }

      if (tenantUser?.id) {
        await createNotification({
          schema: schemaName,
          userId: tenantUser.id,
          title: 'Payment confirmed',
          message: `Payment of KSh ${transaction.amount} has been confirmed.`,
          type: 'payment_confirmation'
        });
      }

      if (landlord?.id && tenantUser) {
        await createNotification({
          schema: schemaName,
          userId: landlord.id,
          title: 'Rent payment received',
          message: `${tenantUser.name} has paid KSh ${transaction.amount} for unit ${tenant?.unit || ''}.`,
          type: 'payment_confirmation'
        });
      }

      await logAudit({
        organization: organizationId,
        actor: tenantUser?.id || null,
        action: 'Payment confirmed',
        entityType: 'payment',
        entityId: payment.id,
        metadata: {
          tenantName: tenantUser?.name || '',
          summary: `KSh ${transaction.amount} • ${tenantUser?.name || 'tenant'}`,
          reference: transaction.mpesa_receipt_number || payment.reference
        }
      });
    }
  } else {
    updates.status = 'failed';
    await MpesaTransaction.update(schemaName, transaction.id, updates);

    await logAudit({
      organization: organizationId,
      action: 'Payment failed',
      entityType: 'payment',
      entityId: transaction.id,
      metadata: {
        summary: ResultDesc || 'M-Pesa callback failed',
        checkoutRequestId: CheckoutRequestID
      }
    });
  }

  res.json({ message: 'Callback processed' });
};

module.exports = {
  getPayments,
  initiatePaymentStkPush,
  handleMpesaCallback,
  getPaymentSettings,
  updatePaymentSettings,
  getLandlordPaymentMethods
};
