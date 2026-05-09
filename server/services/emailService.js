const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPaymentConfirmation = async (toEmail, tenantName, amount, receiptNumber) => {
  const mailOptions = {
    from: `"Apex Agencies" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Payment Confirmation - Apex Agencies',
    html: `
      <h2>Payment Received</h2>
      <p>Hello ${tenantName},</p>
      <p>We have successfully received your rent payment of <strong>KSh ${amount}</strong>.</p>
      <p>Mpesa Receipt Number: <strong>${receiptNumber}</strong></p>
      <p>Thank you for choosing Apex Agencies.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Email Error:", err);
  }
};

const notifyLandlord = async (landlordEmail, tenantName, amount, unit) => {
  const mailOptions = {
    from: `"Apex Agencies System" <${process.env.EMAIL_USER}>`,
    to: landlordEmail,
    subject: 'Rent Payment Notification',
    html: `
      <h2>New Rent Payment Received</h2>
      <p>Tenant <strong>${tenantName}</strong> from unit <strong>${unit}</strong> has paid <strong>KSh ${amount}</strong>.</p>
      <p>The transaction has been recorded in your dashboard.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Landlord Notification Email Error:", err);
  }
};

const sendAccountCreatedEmail = async (toEmail, userName, password, role) => {
  const mailOptions = {
    from: `"Apex Agencies" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Welcome to Apex Agencies - Account Created',
    html: `
      <h2>Welcome ${userName},</h2>
      <p>Your account on Apex Agencies has been successfully created as a <strong>${role.replace(/_/g, ' ')}</strong>.</p>
      <p>Below are your login credentials:</p>
      <p><strong>Email:</strong> ${toEmail}</p>
      <p><strong>Temporary Password:</strong> ${password}</p>
      <br/>
      <p><strong>Please Note:</strong> You will be required to change this password upon your first login for security purposes.</p>
      <p>Thank you,</p>
      <p>The Apex Agencies Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Account Created Email Error:", err);
  }
};

module.exports = { sendPaymentConfirmation, notifyLandlord, sendAccountCreatedEmail };
