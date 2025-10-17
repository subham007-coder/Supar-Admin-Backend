const nodemailer = require("nodemailer");
const axios = require("axios");
const rateLimit = require("express-rate-limit");

const sendEmail = async (body, res, message) => {
  // Debug logging for Brevo API key
  const apiKey = process.env.BREVO_API_KEY;
  console.log("Using Brevo Key:", apiKey ? "✅ Found" : "❌ Missing");
  console.log("Brevo Key length:", apiKey ? apiKey.length : 0);
  console.log("Brevo Key starts with:", apiKey ? apiKey.substring(0, 8) + "..." : "N/A");
  const smtpKey = process.env.BREVO_SMTP_KEY; // optional explicit SMTP key
  const transportPreference = (process.env.BREVO_TRANSPORT || '').toUpperCase(); // API | SMTP | ""
  const looksLikeApiKey = !!apiKey && apiKey.startsWith('xkeys-');
  const looksLikeSmtpKey = (apiKey && apiKey.startsWith('xsmtpsib')) || (smtpKey && smtpKey.startsWith('xsmtpsib'));
  console.log("Brevo transport preference:", transportPreference || 'AUTO');
  console.log("Brevo key types → API:", looksLikeApiKey, ", SMTP:", looksLikeSmtpKey);
  
  // If explicitly forced to API and we have a valid API key, or auto-detected API key
  if ((transportPreference === 'API' && looksLikeApiKey) || (!transportPreference && looksLikeApiKey)) {
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

  // Use SMTP either explicitly requested, auto-detected Brevo SMTP key, or legacy SMTP env
  let transporterOptions;
  if ((transportPreference === 'SMTP' && (looksLikeSmtpKey || process.env.BREVO_SMTP_HOST)) || looksLikeSmtpKey) {
    // Brevo SMTP configuration
    const brevoHost = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
    const brevoPort = Number(process.env.BREVO_SMTP_PORT || 587); // 587 STARTTLS by default, 465 also supported
    const brevoSecure = brevoPort === 465;
    const brevoPass = smtpKey || apiKey; // allow BREVO_SMTP_KEY or BREVO_API_KEY (xsmtpsib...)
    transporterOptions = {
      host: brevoHost,
      port: brevoPort,
      secure: brevoSecure,
      auth: {
        user: 'apikey',
        pass: brevoPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: brevoSecure ? undefined : { rejectUnauthorized: false },
    };
  } else {
    // Legacy custom SMTP config
    transporterOptions = {
      host: process.env.HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };
  }

  const transporter = nodemailer.createTransport(transporterOptions);

  transporter.verify(async (err, success) => {
    if (err) {
      console.error("Verification error:", err);
      // If SMTP failed due to connection timeout and we have a valid Brevo API key, fallback to HTTP API
      try {
        const apiKeyFallback = process.env.BREVO_API_KEY;
        const forceApi = (process.env.BREVO_TRANSPORT || '').toUpperCase() === 'API';
        const hasApiKey = !!apiKeyFallback && apiKeyFallback.startsWith('xkeys-');
        if ((err?.code === 'ETIMEDOUT' || forceApi) && hasApiKey) {
          const normalizeAddress = (addr) => {
            if (!addr) return null;
            if (typeof addr === 'string') {
              const match = addr.match(/^(.*)<(.+@.+)>$/);
              if (match) {
                return { name: match[1].trim().replace(/"/g, ''), email: match[2].trim() };
              }
              return { email: addr.trim() };
            }
            if (typeof addr === 'object') {
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

          console.log("SMTP failed; falling back to Brevo HTTP API...");
          await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
              'api-key': apiKeyFallback,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            timeout: 20000,
          });

          return res.send({ message });
        }
      } catch (apiErr) {
        console.error('Brevo API fallback error:', apiErr?.response?.data || apiErr?.message);
        return res.status(403).send({ message: `Error during verification: ${err.message}` });
      }

      return res.status(403).send({ message: `Error during verification: ${err.message}` });
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