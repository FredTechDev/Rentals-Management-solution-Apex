const { Organization, User, Property, Tenant, Invoice, Notification } = require('../models');
const { generateReminder } = require('./aiService');
const { createNotification } = require('../helpers/notifications');
const { sendAccountCreatedEmail } = require('./emailService'); // I might need a more generic email sender
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmailReminder = async (toEmail, subject, text) => {
  const mailOptions = {
    from: `"Apex Agencies" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Email Reminder Error:", err);
  }
};

const processTenantReminder = async (schema, tenant, organization) => {
  const today = new Date();
  const todayDay = today.getDate();
  const settings = organization.reminder_settings || { before_days: 3, after_days: 3 };
  
  const property = await Property.findById(schema, tenant.property_id);
  const user = await User.findById(tenant.user_id);
  
  if (!property || !user) return;

  let shouldSend = false;
  let type = '';
  
  // 1. Check if rent is due in X days
  if (tenant.due_date - settings.before_days === todayDay) {
    shouldSend = true;
    type = 'Upcoming Rent';
  }
  
  // 2. Check if rent is due TODAY
  if (tenant.due_date === todayDay) {
    shouldSend = true;
    type = 'Rent Due Today';
  }
  
  // 3. Check if rent is overdue by X days (and unpaid)
  if (tenant.due_date + settings.after_days === todayDay) {
    // Check for unpaid invoices for this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const invoices = await Invoice.find(schema, { 
      tenantId: tenant.id, 
      status: 'sent' // assuming 'sent' means unpaid
    });
    
    if (invoices.length > 0) {
      shouldSend = true;
      type = 'Overdue Rent';
    }
  }

  if (shouldSend) {
    const reminderText = await generateReminder(user.name, property.name || property.address, tenant.rent_amount, tenant.due_date);
    
    // Send In-App Notification
    await createNotification({
      schema,
      userId: user.id,
      title: `${type} Reminder`,
      message: reminderText,
      type: 'rent_due'
    });
    
    // Send Email
    await sendEmailReminder(user.email, `${type} - ${property.name || 'Apex Agencies'}`, reminderText);
    
    return true;
  }
  return false;
};

const runAutoReminders = async () => {
  console.log('--- Starting Auto-Reminders Job ---');
  const organizations = await Organization.findAll();
  
  for (const org of organizations) {
    if (!org.auto_reminders_enabled || !org.schema_name) continue;
    
    try {
      const tenants = await Tenant.find(org.schema_name, { status: 'active' });
      for (const tenant of tenants) {
        await processTenantReminder(org.schema_name, tenant, org);
      }
    } catch (error) {
      console.error(`Error processing reminders for ${org.name}:`, error.message);
    }
  }
  console.log('--- Finished Auto-Reminders Job ---');
};

module.exports = {
  processTenantReminder,
  runAutoReminders
};
