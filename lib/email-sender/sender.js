const nodemailer = require("nodemailer");
const axios = require("axios");
const rateLimit = require("express-rate-limit");

const sendEmail = async (body, res, message) => {
  console.log("📧 [EMAIL SERVICE DEBUG] Starting sendEmail function");
  console.log("📧 [EMAIL SERVICE DEBUG] Email body:", {
    from: body.from,
    to: body.to,
    subject: body.subject,
    hasHtml: !!body.html,
    htmlLength: body.html?.length || 0,
    hasAttachments: body.attachments?.length > 0,
    attachmentCount: body.attachments?.length || 0
  });

  // Debug logging for Brevo API key
  const apiKey = process.env.BREVO_API_KEY;
  console.log("🔑 [EMAIL SERVICE DEBUG] Brevo API Key status:", {
    hasApiKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyPrefix: apiKey ? apiKey.substring(0, 8) + "..." : "N/A",
    startsWithXkeys: apiKey ? apiKey.startsWith('xkeys-') : false
  });
  
  // Force API usage on Render (SMTP blocked on free tier)
  const forceApi = process.env.NODE_ENV === 'production' || process.env.BREVO_FORCE_API === 'true';
  console.log("⚙️ [EMAIL SERVICE DEBUG] Configuration:", {
    nodeEnv: process.env.NODE_ENV,
    forceApi: forceApi,
    brevoForceApi: process.env.BREVO_FORCE_API
  });
  
  // If we have any Brevo key and we're on Render (or forced), use API
  if (apiKey && (forceApi || apiKey.startsWith('xkeys-'))) {
    console.log("✅ [EMAIL SERVICE DEBUG] Using Brevo API for email sending");
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

      const sender = normalizeAddress(body.from) || { email: process.env.BREVO_SENDER_EMAIL || "subham.growstara@gmail.com", name: process.env.BREVO_SENDER_NAME || "AR Lashes" };
      const toArray = Array.isArray(body.to) ? body.to : [body.to];
      const recipients = toArray.map(normalizeAddress).filter(Boolean);

      console.log("📤 [EMAIL SERVICE DEBUG] Brevo API Request Details:", {
        url: "https://api.brevo.com/v3/smtp/email",
        sender: sender,
        recipients: recipients,
        subject: body.subject,
        hasApiKey: !!process.env.BREVO_API_KEY,
        senderEmail: process.env.BREVO_SENDER_EMAIL,
        senderName: process.env.BREVO_SENDER_NAME
      });

      const payload = {
        sender,
        to: recipients,
        subject: body.subject || '',
        htmlContent: body.html || body.htmlContent || '',
        textContent: body.text || undefined,
      };

      console.log("📦 [EMAIL SERVICE DEBUG] Payload prepared:", {
        sender: payload.sender,
        toCount: payload.to?.length || 0,
        subject: payload.subject,
        htmlContentLength: payload.htmlContent?.length || 0,
        hasTextContent: !!payload.textContent
      });

      console.log("🚀 [EMAIL SERVICE DEBUG] Sending request to Brevo API...");
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 20000,
      });

      console.log("✅ [EMAIL SERVICE DEBUG] Brevo API response:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        messageId: response.data?.messageId,
        headers: response.headers
      });

      // Additional logging for email delivery tracking
      if (response.data?.messageId) {
        console.log("📧 [EMAIL SERVICE DEBUG] Email sent successfully with messageId:", response.data.messageId);
        console.log("📧 [EMAIL SERVICE DEBUG] Email should be delivered to:", recipients.map(r => r.email).join(", "));
      }

      return res.send({ message });
    } catch (err) {
      console.error("❌ [EMAIL SERVICE DEBUG] Brevo API send error:", {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        config: {
          url: err?.config?.url,
          method: err?.config?.method,
          timeout: err?.config?.timeout
        }
      });
      return res.status(403).send({ message: `Error sending email (Brevo API): ${err?.response?.data?.message || err.message}` });
    }
  }

  // No Brevo API key available - return error
  console.error("❌ [EMAIL SERVICE DEBUG] No valid Brevo API key found. Please set BREVO_API_KEY with a valid API key (starts with xkeys-).");
  console.error("❌ [EMAIL SERVICE DEBUG] Current configuration:", {
    hasApiKey: !!process.env.BREVO_API_KEY,
    keyLength: process.env.BREVO_API_KEY?.length || 0,
    forceApi: process.env.BREVO_FORCE_API,
    nodeEnv: process.env.NODE_ENV
  });
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