const { MpesaTransaction, Payment, Property, Tenant, User } = require('../models');
const { logAudit, logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { createNotification } = require('../helpers/notifications');
const { initiateSTKPush } = require('../services/mpesaService');
const { notifyLandlord, sendPaymentConfirmation } = require('../services/emailService');
const { ROLES } = require('../helpers/rbac');

const getPayments = async (req, res) => {
  let payments;

  if ([ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN].includes(req.user.role)) {
    const propertyQuery = req.user.role === ROLES.SUPER_ADMIN
      ? {}
      : { $or: [{ landlord: req.user.id }, { manager: req.user.id }] };

    const properties = await Property.find(propertyQuery);
    const propertyIds = properties.map((property) => property._id);
    const tenants = await Tenant.find({ property: { $in: propertyIds } });
    const tenantIds = tenants.map((tenant) => tenant._id);

    payments = await Payment.find({ tenant: { $in: tenantIds } })
      .populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } })
      .sort({ createdAt: -1 });
  } else {
    const tenant = await Tenant.findOne({ user: req.user.id });
    if (!tenant) {
      res.json([]);
      return;
    }

    payments = await Payment.find({ tenant: tenant._id })
      .populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } })
      .sort({ createdAt: -1 });
  }

  res.json(payments);
};

const initiatePaymentStkPush = async (req, res) => {
  const { amount, phoneNumber, tenantId } = req.body;

  let tenant = await Tenant.findById(tenantId).populate('user property');
  if (!tenant) {
    tenant = await Tenant.findOne({ user: tenantId }).populate('user property');
  }

  if (!tenant) {
    sendError(res, 404, 'Tenant profile not found');
    return;
  }

  const response = await initiateSTKPush(phoneNumber, amount, `Tenant-${tenant.user?._id || tenantId}`);

  const transaction = new MpesaTransaction({
    organization: tenant.organization || tenant.property?.organization,
    tenant: tenant._id,
    merchantRequestId: response.MerchantRequestID,
    checkoutRequestId: response.CheckoutRequestID,
    phoneNumber,
    amount,
    status: 'pending'
  });

  await transaction.save();

  let payment = await Payment.findOne({
    tenant: tenant._id,
    status: 'pending'
  }).sort({ createdAt: -1 });

  if (!payment) {
    payment = new Payment({
      organization: tenant.organization || tenant.property?.organization,
      tenant: tenant._id,
      amount,
      dueDate: new Date(),
      status: 'pending',
      method: 'mpesa'
    });
  }

  payment.amount = amount;
  payment.reference = response.CheckoutRequestID;
  payment.mpesaTransaction = transaction._id;
  payment.method = 'mpesa';
  await payment.save();

  await logRequestAudit({
    req,
    organization: tenant.organization || tenant.property?.organization,
    action: 'Payment checkout started',
    entityType: 'payment',
    entityId: payment._id,
    metadata: {
      tenantName: tenant.user?.name || '',
      summary: `KSh ${amount} • ${phoneNumber}`,
      checkoutRequestId: response.CheckoutRequestID
    }
  });

  res.json({
    message: 'STK Push initiated',
    checkoutRequestId: response.CheckoutRequestID
  });
};

const handleMpesaCallback = async (req, res) => {
  const callbackData = req.body?.Body?.stkCallback;
  if (!callbackData) {
    sendError(res, 400, 'Invalid callback payload');
    return;
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, MerchantRequestID } = callbackData;
  const transaction = await MpesaTransaction.findOne({ checkoutRequestId: CheckoutRequestID });

  if (!transaction) {
    sendError(res, 404, 'Transaction not found');
    return;
  }

  transaction.merchantRequestId = MerchantRequestID;
  transaction.resultCode = Number(ResultCode);
  transaction.resultDesc = ResultDesc;

  if (Number(ResultCode) === 0) {
    const metadata = callbackData.CallbackMetadata?.Item || [];
    transaction.mpesaReceiptNumber = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value;
    transaction.transactionDate = new Date();
    transaction.status = 'completed';
    await transaction.save();

    const payment = await Payment.findOne({ mpesaTransaction: transaction._id })
      || await Payment.findOne({ tenant: transaction.tenant, status: 'pending' }).sort({ createdAt: -1 });

    if (payment) {
      payment.status = 'paid';
      payment.paymentDate = new Date();
      payment.mpesaTransaction = transaction._id;
      payment.reference = transaction.mpesaReceiptNumber || payment.reference;
      await payment.save();

      const tenant = await Tenant.findById(payment.tenant).populate('user property');
      const landlord = tenant?.property?.landlord ? await User.findById(tenant.property.landlord) : null;

      if (tenant?.user?.email) {
        await sendPaymentConfirmation(
          tenant.user.email,
          tenant.user.name,
          transaction.amount,
          transaction.mpesaReceiptNumber
        );
      }

      if (landlord?.email) {
        await notifyLandlord(landlord.email, tenant.user.name, transaction.amount, tenant.unit);
      }

      if (tenant?.user?._id) {
        await createNotification({
          organization: tenant.organization || tenant.property?.organization,
          user: tenant.user._id,
          title: 'Payment confirmed',
          message: `Payment of KSh ${transaction.amount} has been confirmed.`,
          type: 'payment_confirmation'
        });
      }

      if (landlord?._id) {
        await createNotification({
          organization: tenant.organization || tenant.property?.organization,
          user: landlord._id,
          title: 'Rent payment received',
          message: `${tenant.user.name} has paid KSh ${transaction.amount} for unit ${tenant.unit}.`,
          type: 'payment_confirmation'
        });
      }

      await logAudit({
        organization: tenant?.organization || tenant?.property?.organization || transaction.organization || null,
        actor: tenant?.user?._id || null,
        action: 'Payment confirmed',
        entityType: 'payment',
        entityId: payment._id,
        metadata: {
          tenantName: tenant?.user?.name || '',
          summary: `KSh ${transaction.amount} • ${tenant?.user?.name || 'tenant'}`,
          reference: transaction.mpesaReceiptNumber || payment.reference
        }
      });
    }
  } else {
    transaction.status = 'failed';
    await transaction.save();

    await logAudit({
      organization: transaction.organization || null,
      action: 'Payment failed',
      entityType: 'payment',
      entityId: transaction._id,
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
  handleMpesaCallback
};
