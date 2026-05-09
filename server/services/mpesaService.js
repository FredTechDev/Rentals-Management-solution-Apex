const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortCode = process.env.MPESA_SHORTCODE;
const passkey = process.env.MPESA_PASSKEY;
const callbackUrl = process.env.MPESA_CALLBACK_URL;

const getAccessToken = async (credentials = {}) => {
  const cKey = credentials.consumerKey || process.env.MPESA_CONSUMER_KEY;
  const cSecret = credentials.consumerSecret || process.env.MPESA_CONSUMER_SECRET;
  
  const auth = Buffer.from(`${cKey}:${cSecret}`).toString('base64');
  try {
    const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    return res.data.access_token;
  } catch (err) {
    console.error("Mpesa Auth Error:", err.response?.data || err.message);
    throw new Error("Failed to get Mpesa access token");
  }
};

const initiateSTKPush = async (phoneNumber, amount, accountReference, config = {}) => {
  const credentials = {
    consumerKey: config.mpesa_consumer_key,
    consumerSecret: config.mpesa_consumer_secret
  };
  
  const token = await getAccessToken(credentials);
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  
  const sCode = config.mpesa_shortcode || process.env.MPESA_SHORTCODE;
  const pKey = config.mpesa_passkey || process.env.MPESA_PASSKEY;
  const cbUrl = config.mpesa_callback_url || process.env.MPESA_CALLBACK_URL;

  const password = Buffer.from(`${sCode}${pKey}${timestamp}`).toString('base64');

  const data = {
    BusinessShortCode: sCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: sCode,
    PhoneNumber: phoneNumber,
    CallBackURL: cbUrl,
    AccountReference: accountReference,
    TransactionDesc: "Rent Payment"
  };

  try {
    const res = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error("STK Push Error:", err.response?.data || err.message);
    throw new Error("Failed to initiate STK Push");
  }
};

module.exports = { initiateSTKPush };
