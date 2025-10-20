require("dotenv").config();
const stripe = require("stripe");
const Razorpay = require("razorpay");
const MailChecker = require("mailchecker");
// const stripe = require("stripe")(`${process.env.STRIPE_KEY}` || null); /// use hardcoded key if env not work

const mongoose = require("mongoose");

const Order = require("../models/Order");
const Setting = require("../models/Setting");
const { sendEmail } = require("../lib/email-sender/sender");
const { formatAmountForStripe } = require("../lib/stripe/stripe");
const { handleCreateInvoice } = require("../lib/email-sender/create");
const { handleProductQuantity } = require("../lib/stock-controller/others");
const customerInvoiceEmailBody = require("../lib/email-sender/templates/order-to-customer");

// Helper function to send order confirmation email
const sendOrderConfirmationEmail = async (order) => {
  console.log("🚀 [EMAIL DEBUG] Starting sendOrderConfirmationEmail function");
  console.log("📦 [EMAIL DEBUG] Order data:", {
    orderId: order._id,
    invoice: order.invoice,
    userEmail: order.user_info?.email,
    userName: order.user_info?.name,
    paymentMethod: order.paymentMethod,
    total: order.total,
    status: order.status
  });

  try {
    // Get company settings
    console.log("🔍 [EMAIL DEBUG] Fetching store settings...");
    const storeSetting = await Setting.findOne({ name: "storeSetting" });
    const companyInfo = storeSetting?.setting || {};
    
    console.log("🏢 [EMAIL DEBUG] Store settings found:", {
      hasStoreSetting: !!storeSetting,
      companyInfo: {
        company: companyInfo.company,
        email: companyInfo.email,
        from_email: companyInfo.from_email,
        currency: companyInfo.currency,
        address: companyInfo.address,
        phone: companyInfo.phone
      }
    });

    // If store settings are empty, use fallback values
    if (!companyInfo.company || !companyInfo.email || !companyInfo.from_email) {
      console.log("⚠️ [EMAIL DEBUG] Store settings incomplete, using fallback values");
      companyInfo.company = companyInfo.company || "AR Lashes";
      companyInfo.email = companyInfo.email || "subham.growstara@gmail.com";
      companyInfo.from_email = companyInfo.from_email || "subham.growstara@gmail.com";
      companyInfo.currency = companyInfo.currency || "INR";
      companyInfo.address = companyInfo.address || "Ashoknager, India";
      companyInfo.phone = companyInfo.phone || "+91 7867675646";
      companyInfo.website = companyInfo.website || "https://ar-lashes.com";
      
      console.log("🔄 [EMAIL DEBUG] Updated company info with fallbacks:", {
        company: companyInfo.company,
        email: companyInfo.email,
        from_email: companyInfo.from_email,
        currency: companyInfo.currency,
        address: companyInfo.address,
        phone: companyInfo.phone
      });
    }
    
    // Validate email using MailChecker
    console.log("📧 [EMAIL DEBUG] Validating email address:", order.user_info?.email);
    if (!MailChecker.isValid(order.user_info?.email)) {
      console.error("❌ [EMAIL DEBUG] Invalid email address for order:", order.user_info?.email);
      return;
    }
    console.log("✅ [EMAIL DEBUG] Email address is valid");

    // Create PDF invoice
    console.log("📄 [EMAIL DEBUG] Creating PDF invoice...");
    const pdf = await handleCreateInvoice(order, `${order.invoice}.pdf`);
    console.log("✅ [EMAIL DEBUG] PDF invoice created, size:", pdf ? pdf.length : 0, "bytes");

    const option = {
      date: order.createdAt,
      invoice: order.invoice,
      status: order.status,
      method: order.paymentMethod,
      subTotal: order.subTotal,
      total: order.total,
      discount: order.discount,
      shipping: order.shippingCost,
      currency: companyInfo.currency || "INR",
      company_name: companyInfo.company || "AR Lashes",
      company_address: companyInfo.address || "",
      company_phone: companyInfo.phone || "",
      company_email: companyInfo.email || "",
      company_website: companyInfo.website || "",
      vat_number: companyInfo.vat_number || "695897456321",
      name: order.user_info?.name,
      email: order.user_info?.email,
      phone: order.user_info?.contact,
      address: order.user_info?.address,
      cart: order.cart,
    };

    console.log("📝 [EMAIL DEBUG] Email template options:", {
      invoice: option.invoice,
      company_name: option.company_name,
      company_email: option.company_email,
      from_email: companyInfo.from_email,
      currency: option.currency,
      cartItems: option.cart?.length || 0
    });

    // Debug cart data structure
    console.log("🛒 [EMAIL DEBUG] Cart data structure:", {
      cartLength: option.cart?.length || 0,
      cartItems: option.cart?.map((item, index) => ({
        index: index,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        selectedLength: item.selectedLength,
        selectedCurl: item.selectedCurl,
        selectedColor: item.selectedColor
      })) || []
    });

    const emailBody = {
      from: companyInfo.from_email || "subham.growstara@gmail.com",
      to: order.user_info.email,
      subject: `Your Order Confirmation - ${order.invoice} at ${companyInfo.company || "AR Lashes"}`,
      html: customerInvoiceEmailBody(option),
      attachments: [
        {
          filename: `${order.invoice}.pdf`,
          content: pdf,
        },
      ],
    };

    console.log("📨 [EMAIL DEBUG] Email body prepared:", {
      from: emailBody.from,
      to: emailBody.to,
      subject: emailBody.subject,
      hasHtml: !!emailBody.html,
      htmlLength: emailBody.html?.length || 0,
      hasAttachments: emailBody.attachments?.length > 0,
      attachmentSize: emailBody.attachments?.[0]?.content?.length || 0
    });

    // Send email using the existing sendEmail function
    console.log("📤 [EMAIL DEBUG] Attempting to send email...");
    return new Promise((resolve, reject) => {
      sendEmail(emailBody, { send: resolve }, "Order confirmation email sent successfully");
    });

  } catch (error) {
    console.error("❌ [EMAIL DEBUG] Error in sendOrderConfirmationEmail:", error);
    console.error("❌ [EMAIL DEBUG] Error stack:", error.stack);
    throw error;
  }
};

const addOrder = async (req, res) => {
  console.log("🛒 [ORDER DEBUG] Starting addOrder function");
  console.log("📋 [ORDER DEBUG] Request body:", {
    user_info: req.body.user_info,
    paymentMethod: req.body.paymentMethod,
    total: req.body.total,
    cartItems: req.body.cart?.length || 0
  });
  console.log("👤 [ORDER DEBUG] User ID:", req.user._id);

  try {
    // 1️⃣ Get the latest invoice number
    console.log("🔢 [ORDER DEBUG] Getting latest invoice number...");
    const lastOrder = await Order.findOne({})
      .sort({ invoice: -1 }) // get the order with highest invoice
      .select("invoice")
      .lean();

    const nextInvoice = lastOrder ? lastOrder.invoice + 1 : 10000; // start from 10000 if no orders
    console.log("📄 [ORDER DEBUG] Next invoice number:", nextInvoice);

    const newOrder = new Order({
      ...req.body,
      user: req.user._id,
      invoice: nextInvoice,
    });

    console.log("💾 [ORDER DEBUG] Saving order to database...");
    const order = await newOrder.save();
    console.log("✅ [ORDER DEBUG] Order saved successfully:", {
      orderId: order._id,
      invoice: order.invoice,
      userEmail: order.user_info?.email,
      total: order.total
    });

    // 2️⃣ Send order confirmation email to customer
    console.log("📧 [ORDER DEBUG] Attempting to send order confirmation email...");
    try {
      await sendOrderConfirmationEmail(order);
      console.log("✅ [ORDER DEBUG] Order confirmation email sent successfully");
    } catch (emailError) {
      console.error("❌ [ORDER DEBUG] Failed to send order confirmation email:", emailError);
      console.error("❌ [ORDER DEBUG] Email error details:", {
        message: emailError.message,
        stack: emailError.stack
      });
      // Don't fail the order creation if email fails
    }

    console.log("📦 [ORDER DEBUG] Updating product quantities...");
    handleProductQuantity(order.cart);
    
    console.log("🎉 [ORDER DEBUG] Order creation completed successfully");
    res.status(201).send(order);
  } catch (err) {
    console.error("❌ [ORDER DEBUG] Error in addOrder:", err);
    console.error("❌ [ORDER DEBUG] Error details:", {
      message: err.message,
      stack: err.stack
    });

    res.status(500).send({
      message: err.message,
    });
  }
};

//create payment intent for stripe
const createPaymentIntent = async (req, res) => {
  const { total: amount, cardInfo: payment_intent, email } = req.body;
  // console.log("req.body", req.body);
  
  // Get store settings for currency and amount validation
  const storeSetting = await Setting.findOne({ name: "storeSetting" });
  const companyInfo = storeSetting?.setting || {};
  const currency = companyInfo.currency || "INR";
  
  // Set appropriate min/max amounts for INR (in paise for Stripe)
  const minAmount = currency === "INR" ? 100 : (process.env.MIN_AMOUNT || 50); // ₹1.00 minimum
  const maxAmount = currency === "INR" ? 10000000 : (process.env.MAX_AMOUNT || 100000); // ₹100,000.00 maximum
  
  // Validate the amount that was passed from the client.
  if (!(amount >= minAmount && amount <= maxAmount)) {
    return res.status(500).json({ 
      message: `Invalid amount. Amount must be between ${minAmount} and ${maxAmount} ${currency}.` 
    });
  }
  
  const stripeSecret = storeSetting?.setting?.stripe_secret;
  const stripeInstance = stripe(stripeSecret);
  if (payment_intent.id) {
    try {
      const current_intent = await stripeInstance.paymentIntents.retrieve(
        payment_intent.id
      );
      // If PaymentIntent has been created, just update the amount.
      if (current_intent) {
        const updated_intent = await stripeInstance.paymentIntents.update(
          payment_intent.id,
          {
            amount: formatAmountForStripe(amount, currency.toLowerCase()),
          }
        );
        // console.log("updated_intent", updated_intent);
        return res.send(updated_intent);
      }
    } catch (err) {
      // console.log("error", err);

      if (err.code !== "resource_missing") {
        const errorMessage =
          err instanceof Error ? err.message : "Internal server error";
        return res.status(500).send({ message: errorMessage });
      }
    }
  }
  try {
    // Create PaymentIntent from body params.
    const params = {
      amount: formatAmountForStripe(amount, currency.toLowerCase()),
      currency: currency.toLowerCase(),
      description: process.env.STRIPE_PAYMENT_DESCRIPTION || "",
      automatic_payment_methods: {
        enabled: true,
      },
    };
    const payment_intent = await stripeInstance.paymentIntents.create(params);
    // console.log("payment_intent", payment_intent);

    res.send(payment_intent);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    res.status(500).send({ message: errorMessage });
  }
};

const createOrderByRazorPay = async (req, res) => {
  try {
    const storeSetting = await Setting.findOne({ name: "storeSetting" });
    // console.log("createOrderByRazorPay", storeSetting?.setting);

    const instance = new Razorpay({
      key_id: storeSetting?.setting?.razorpay_id,
      key_secret: storeSetting?.setting?.razorpay_secret,
    });

    const options = {
      amount: req.body.amount * 100,
      currency: "INR",
    };
    const order = await instance.orders.create(options);

    if (!order)
      return res.status(500).send({
        message: "Error occurred when creating order!",
      });
    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const addRazorpayOrder = async (req, res) => {
  console.log("💳 [RAZORPAY ORDER DEBUG] Starting addRazorpayOrder function");
  console.log("📋 [RAZORPAY ORDER DEBUG] Request body:", {
    user_info: req.body.user_info,
    paymentMethod: req.body.paymentMethod,
    total: req.body.total,
    cartItems: req.body.cart?.length || 0
  });
  console.log("👤 [RAZORPAY ORDER DEBUG] User ID:", req.user._id);

  try {
    // 1️⃣ Get the latest invoice number
    console.log("🔢 [RAZORPAY ORDER DEBUG] Getting latest invoice number...");
    const lastOrder = await Order.findOne({})
      .sort({ invoice: -1 }) // get the order with highest invoice
      .select("invoice")
      .lean();

    const nextInvoice = lastOrder ? lastOrder.invoice + 1 : 10000; // start from 10000 if no orders
    console.log("📄 [RAZORPAY ORDER DEBUG] Next invoice number:", nextInvoice);

    const newOrder = new Order({
      ...req.body,
      user: req.user._id,
      invoice: nextInvoice,
    });

    console.log("💾 [RAZORPAY ORDER DEBUG] Saving order to database...");
    const order = await newOrder.save();
    console.log("✅ [RAZORPAY ORDER DEBUG] Order saved successfully:", {
      orderId: order._id,
      invoice: order.invoice,
      userEmail: order.user_info?.email,
      total: order.total
    });

    // 2️⃣ Send order confirmation email to customer
    console.log("📧 [RAZORPAY ORDER DEBUG] Attempting to send order confirmation email...");
    try {
      await sendOrderConfirmationEmail(order);
      console.log("✅ [RAZORPAY ORDER DEBUG] Order confirmation email sent successfully");
    } catch (emailError) {
      console.error("❌ [RAZORPAY ORDER DEBUG] Failed to send order confirmation email:", emailError);
      console.error("❌ [RAZORPAY ORDER DEBUG] Email error details:", {
        message: emailError.message,
        stack: emailError.stack
      });
      // Don't fail the order creation if email fails
    }

    console.log("📦 [RAZORPAY ORDER DEBUG] Updating product quantities...");
    handleProductQuantity(order.cart);
    
    console.log("🎉 [RAZORPAY ORDER DEBUG] Razorpay order creation completed successfully");
    res.status(201).send(order);
  } catch (err) {
    console.error("❌ [RAZORPAY ORDER DEBUG] Error in addRazorpayOrder:", err);
    console.error("❌ [RAZORPAY ORDER DEBUG] Error details:", {
      message: err.message,
      stack: err.stack
    });

    res.status(500).send({
      message: err.message,
    });
  }
};

// get all orders user
const getOrderCustomer = async (req, res) => {
  try {
    // console.log("getOrderCustomer", req.user);
    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const userId = new mongoose.Types.ObjectId(req.user._id);

    const totalDoc = await Order.countDocuments({ user: userId });

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: { $regex: `pending`, $options: "i" },
          user: userId,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total padding order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: { $regex: `processing`, $options: "i" },
          user: userId,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: { $regex: `delivered`, $options: "i" },
          user: userId,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // today order amount

    // query for orders
    const orders = await Order.find({ user: req.user._id })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    res.send({
      orders,
      limits,
      pages,
      pending: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count,
      processing:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      delivered:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,

      totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    // console.log("getOrderById");
    const order = await Order.findById(req.params.id);
    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const sendEmailInvoiceToCustomer = async (req, res) => {
  try {
    const user = req.body.user_info;
    // Validate email using MailChecker
    // Validate email using MailChecker
    if (!MailChecker.isValid(user?.email)) {
      // Return a response indicating invalid email instead of using process.exit
      return res.status(400).send({
        message:
          "Invalid or disposable email address. Please provide a valid email.",
      });
    }
    // console.log("sendEmailInvoiceToCustomer");
    const pdf = await handleCreateInvoice(req.body, `${req.body.invoice}.pdf`);

    const option = {
      date: req.body.date,
      invoice: req.body.invoice,
      status: req.body.status,
      method: req.body.paymentMethod,
      subTotal: req.body.subTotal,
      total: req.body.total,
      discount: req.body.discount,
      shipping: req.body.shippingCost,
      currency: req.body.company_info.currency,
      company_name: req.body.company_info.company,
      company_address: req.body.company_info.address,
      company_phone: req.body.company_info.phone,
      company_email: req.body.company_info.email,
      company_website: req.body.company_info.website,
      vat_number: req.body?.company_info?.vat_number,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      address: user?.address,
      cart: req.body.cart,
    };

    const body = {
      from: req.body.company_info?.from_email || "sales@ar-lashes.com",
      to: user.email,
      subject: `Your Order - ${req.body.invoice} at ${req.body.company_info.company}`,
      html: customerInvoiceEmailBody(option),
      attachments: [
        {
          filename: `${req.body.invoice}.pdf`,
          content: pdf,
        },
      ],
    };
    const message = `Invoice successfully sent to the customer ${user.name}`;
    sendEmail(body, res, message);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addOrder,
  getOrderById,
  getOrderCustomer,
  createPaymentIntent,
  createOrderByRazorPay,
  addRazorpayOrder,
  sendEmailInvoiceToCustomer,
};