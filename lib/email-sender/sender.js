const nodemailer = require("nodemailer");
const axios = require("axios");
const rateLimit = require("express-rate-limit");

const sendEmail = async (body, res, message) => {
  // If Brevo API key present, prefer HTTP API to avoid SMTP egress/port restrictions
  if (process.env.BREVO_API_KEY) {
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

  // Fallback to SMTP (legacy)
  const transporterOptions = {
    host: process.env.HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };

  const transporter = nodemailer.createTransport(transporterOptions);

  transporter.verify((err, success) => {
    if (err) {
      console.error("Verification error:", err);
      res.status(403).send({
        message: `Error during verification: ${err.message}`,
      });
    } else {
      console.log("Server is ready to take our messages");
      transporter.sendMail(body, (err, data) => {
        if (err) {
          console.error("Error sending email:", err);
          res.status(403).send({
            message: `Error sending email: ${err.message}`,
          });
        } else {
          console.log("email sent successfully!");

          res.send({
            message: message,
          });
        }
      });
    }
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