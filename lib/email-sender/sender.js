const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const { Resend } = require("resend");

// === RESEND CLIENT (free alternative that works on Render) ===
const resend = new Resend(process.env.RESEND_API_KEY);

// === ORIGINAL NODEMAILER VERSION (commented out but kept) ===
/*
const sendEmail = (body, res, message) => {
  const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    // service: process.env.SERVICE, // comment this line if you use custom server/domain
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // comment out this one if you use custom server/domain
    // tls: {
    //   rejectUnauthorized: false,
    // },
  });

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
          res.send({ message: message });
        }
      });
    }
  });
};
*/

// === RESEND VERSION (works on Render free plan) ===
const sendEmail = async (body, res, message) => {
  try {
    const { to, subject, html } = body;

    await resend.emails.send({
      from: "Your App <onboarding@resend.dev>", // change later to your domain
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully!");
    res.send({ message });
  } catch (err) {
    console.error("❌ Error sending email:", err);
    res.status(403).send({
      message: `Error sending email: ${err.message}`,
    });
  }
};

// === RATE LIMITS ===
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




// old code for email sender

// const nodemailer = require("nodemailer");
// const rateLimit = require("express-rate-limit");

// const sendEmail = (body, res, message) => {
//   const transporter = nodemailer.createTransport({
//     host: process.env.HOST,
//     // service: process.env.SERVICE, //comment this line if you use custom server/domain
//     port: process.env.EMAIL_PORT,
//     secure: true,
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },

//     //comment out this one if you usi custom server/domain
//     // tls: {
//     //   rejectUnauthorized: false,
//     // },
//   });

//   transporter.verify((err, success) => {
//     if (err) {
//       console.error("Verification error:", err);
//       res.status(403).send({
//         message: `Error during verification: ${err.message}`,
//       });
//     } else {
//       console.log("Server is ready to take our messages");
//       transporter.sendMail(body, (err, data) => {
//         if (err) {
//           console.error("Error sending email:", err);
//           res.status(403).send({
//             message: `Error sending email: ${err.message}`,
//           });
//         } else {
//           console.log("email sent successfully!");

//           res.send({
//             message: message,
//           });
//         }
//       });
//     }
//   });
// };
// //limit email verification and forget password
// const minutes = 30;
// const emailVerificationLimit = rateLimit({
//   windowMs: minutes * 60 * 1000,
//   max: 3,
//   handler: (req, res) => {
//     res.status(429).send({
//       success: false,
//       message: `You made too many requests. Please try again after ${minutes} minutes.`,
//     });
//   },
// });

// const passwordVerificationLimit = rateLimit({
//   windowMs: minutes * 60 * 1000,
//   max: 3,
//   handler: (req, res) => {
//     res.status(429).send({
//       success: false,
//       message: `You made too many requests. Please try again after ${minutes} minutes.`,
//     });
//   },
// });

// const supportMessageLimit = rateLimit({
//   windowMs: minutes * 60 * 1000,
//   max: 5,
//   handler: (req, res) => {
//     res.status(429).send({
//       success: false,
//       message: `You made too many requests. Please try again after ${minutes} minutes.`,
//     });
//   },
// });

// const phoneVerificationLimit = rateLimit({
//   windowMs: minutes * 60 * 1000,
//   max: 2,
//   handler: (req, res) => {
//     res.status(429).send({
//       success: false,
//       message: `You made too many requests. Please try again after ${minutes} minutes.`,
//     });
//   },
// });

// module.exports = {
//   sendEmail,
//   emailVerificationLimit,
//   passwordVerificationLimit,
//   supportMessageLimit,
//   phoneVerificationLimit,
// };