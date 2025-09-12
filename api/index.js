require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
// const path = require("path");
// const http = require("http");
// const { Server } = require("socket.io");

const { connectDB } = require("../config/db");
const productRoutes = require("../routes/productRoutes");
const reviewRoutes = require("../routes/reviewRoutes");
const customerRoutes = require("../routes/customerRoutes");
const adminRoutes = require("../routes/adminRoutes");
const orderRoutes = require("../routes/orderRoutes");
const customerOrderRoutes = require("../routes/customerOrderRoutes");
const categoryRoutes = require("../routes/categoryRoutes");
const couponRoutes = require("../routes/couponRoutes");
const attributeRoutes = require("../routes/attributeRoutes");
const settingRoutes = require("../routes/settingRoutes");
const currencyRoutes = require("../routes/currencyRoutes");
const languageRoutes = require("../routes/languageRoutes");
const notificationRoutes = require("../routes/notificationRoutes");
const bannerRoutes = require("../routes/bannerRoutes");
const instaPostRoutes = require("../routes/instaPostRoutes");
const contactRoutes = require("../routes/contactRoutes");
const contactSubmissionRoutes = require("../routes/contactSubmissionRoutes");
const appointmentSubmissionRoutes = require("../routes/appointmentSubmissionRoutes");
const { isAuth, isAdmin } = require("../config/auth");
// const {
//   getGlobalSetting,
//   getStoreCustomizationSetting,
// } = require("../lib/notification/setting");

connectDB();
const app = express();

// We are using this for the express-rate-limit middleware
// See: https://github.com/nfriedly/express-rate-limit
// app.enable('trust proxy');
app.set("trust proxy", 1);

app.use(express.json({ limit: "4mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Simple CORS configuration - allows all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`Handling OPTIONS request for ${req.path}`);
    res.sendStatus(200);
  } else {
    next();
  }
});

// Also use cors() as backup
app.use(cors());
app.use(helmet());

//root route
app.get("/", (req, res) => {
  res.json({ 
    message: "App works properly!", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

//this for route will need for store front, also for admin dashboard
app.use("/v1/products/", productRoutes);
app.use("/v1/reviews/", isAuth, reviewRoutes);
app.use("/v1/category/", categoryRoutes);
app.use("/v1/coupon/", couponRoutes);
app.use("/v1/customer/", customerRoutes);
app.use("/v1/order/", isAuth, customerOrderRoutes);
app.use("/v1/attributes/", attributeRoutes);
app.use("/v1/setting/", settingRoutes);
app.use("/v1/currency/", isAuth, currencyRoutes);
app.use("/v1/language/", languageRoutes);
app.use("/v1/notification/", isAuth, notificationRoutes);
app.use("/v1/banners/", bannerRoutes);
app.use("/v1/insta-posts/", instaPostRoutes);
app.use("/v1/contacts/", contactRoutes);
app.use("/v1/contact-submissions/", contactSubmissionRoutes);
app.use("/v1/appointment-submissions/", appointmentSubmissionRoutes);

//if you not use admin dashboard then these two route will not needed.
app.use("/v1/admin/", adminRoutes);
app.use("/v1/orders/", isAuth, orderRoutes);

// Use express's default error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(400).json({ message: err.message });
});

// Serve static files from the "dist" directory
app.use("/static", express.static("public"));

// Serve the index.html file for all routes
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "build", "index.html"));
// });

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Required for Render deployment

// const server = http.createServer(app);

app.listen(PORT, HOST, () => {
  console.log(`Server running on host ${HOST} and port ${PORT}`);
});

// app.listen(PORT, () => console.log(`server running on port ${PORT}`));

// set up socket
// const io = new Server(server, {
//   cors: {
//     origin: [
//       "http://localhost:3000",
//       "http://localhost:4100",
//       "https://admin-ar-lashes.vercel.app",
//       "https://dashtar-admin.vercel.app",
//       "https://ar-lashes-store.vercel.app",
//       "https://ar-lashes-admin.netlify.app",
//       "https://dashtar-admin.netlify.app",
//       "https://ar-lashes-store-nine.vercel.app",
//     ], //add your origin here instead of this
//     methods: ["PUT", "GET", "POST", "DELETE", "PATCH", "OPTIONS"],
//     credentials: false,
//     transports: ["websocket"],
//   },
// });

// io.on("connection", (socket) => {
//   // console.log(`Socket ${socket.id} connected!`);

//   socket.on("notification", async (data) => {
//     console.log("data", data);
//     try {
//       let updatedData = data;

//       if (data?.option === "storeCustomizationSetting") {
//         const storeCustomizationSetting = await getStoreCustomizationSetting(
//           data
//         );
//         updatedData = {
//           ...data,
//           storeCustomizationSetting: storeCustomizationSetting,
//         };
//       }
//       if (data?.option === "globalSetting") {
//         const globalSetting = await getGlobalSetting(data);
//         updatedData = {
//           ...data,
//           globalSetting: globalSetting,
//         };
//       }
//       io.emit("notification", updatedData);
//     } catch (error) {
//       console.error("Error handling notification:", error);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log(`Socket ${socket.id} disconnected!`);
//   });
// });
// server.listen(PORT, () => console.log(`server running on port ${PORT}`));
