const nodemailer = require("nodemailer");
const axios = require("axios");
const rateLimit = require("express-rate-limit");

const sendEmail = async (body, res, message) => {
  // Debug logging for Brevo API key
  const apiKey = process.env.BREVO_API_KEY;
  console.log("Using Brevo Key:", apiKey ? "✅ Found" : "❌ Missing");
  console.log("Brevo Key length:", apiKey ? apiKey.length : 0);
  console.log("Brevo Key starts with:", apiKey ? apiKey.substring(0, 8) + "..." : "N/A");
  
  // Force API usage on Render (SMTP blocked on free tier)
  const forceApi = process.env.NODE_ENV === 'production' || process.env.BREVO_FORCE_API === 'true';
  console.log("Force API mode:", forceApi);
  
  // If we have any Brevo key and we're on Render (or forced), use API
  if (apiKey && (forceApi || apiKey.startsWith('xkeys-'))) {
    try {
      const normalizeAddress = (addr) => {
        if (!addr) return null;
        if (typeof addr === 'string') {
          // Try to split name and email if in format 'Name <email>'
          const match = addr.match(/^(.*)<(.+@.+)>$/);
          if (match) {
            return { name: match[1].trim().replace(/"/g, ''), email: match[2].trim() };
          }
          return { email: addr.trim() };
        }
        if (typeof addr === 'object') {
          // nodemailer style { name, address }
          return { name: addr.name, email: addr.address || addr.email };
        }
        return null;
      };

      const sender = normalizeAddress(body.from) || { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME };
      const toArray = Array.isArray(body.to) ? body.to : [body.to];
      const recipients = toArray.map(normalizeAddress).filter(Boolean);

      const payload = {
        sender,
        to: recipients,
        subject: body.subject || '',
        htmlContent: body.html || body.htmlContent || '',
        textContent: body.text || undefined,
      };

      console.log("Brevo API Request Details:");
      console.log("- URL: https://api.brevo.com/v3/smtp/email");
      console.log("- Sender:", sender);
      console.log("- Recipients:", recipients);
      console.log("- Subject:", payload.subject);
      console.log("- API Key being used:", process.env.BREVO_API_KEY ? "Present" : "Missing");

      await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 20000,
      });

      return res.send({ message });
    } catch (err) {
      console.error('Brevo API send error:', err?.response?.data || err?.message);
      return res.status(403).send({ message: `Error sending email (Brevo API): ${err?.response?.data?.message || err.message}` });
    }
  }

  // No Brevo API key available - return error
  console.error("No valid Brevo API key found. Please set BREVO_API_KEY with a valid API key (starts with xkeys-).");
  return res.status(403).send({ 
    message: "Email service not configured. Please contact support." 
  });
};
//limit email verification and forget password
const minutes = 30;
const emailVerificationLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const passwordVerificationLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const supportMessageLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const phoneVerificationLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 2,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

module.exports = {
  sendEmail,
  emailVerificationLimit,
  passwordVerificationLimit,
  supportMessageLimit,
  phoneVerificationLimit,
};