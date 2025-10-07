require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { verifyToken } = require('@clerk/backend');

const signInToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      address: user.address,
      phone: user.phone,
      image: user.image,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      address: user.address,
      phone: user.phone,
      image: user.image,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_LIFETIME || "15m" } // short-lived
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { _id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_LIFETIME || "7d" } // longer-lived
  );
};

const tokenForVerify = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      password: user.password,
    },
    process.env.JWT_SECRET_FOR_VERIFY,
    { expiresIn: "15m" }
  );
};

const isAuth = async (req, res, next) => {
  const { authorization } = req.headers;
  console.log(`🔍isAuth ${req.method} : ${req.originalUrl}`);
  
  try {
    if (!authorization) {
      return res.status(401).send({
        message: "Authorization header is required",
      });
    }
    
    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Invalid authorization format. Expected 'Bearer <token>'",
      });
    }
    
    const token = authorization.split(" ")[1];
    if (!token) {
      return res.status(401).send({
        message: "Token not provided",
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("error on isAuth", err);
    
    let message = "Authentication failed";
    if (err.name === 'TokenExpiredError') {
      message = "Token has expired";
    } else if (err.name === 'JsonWebTokenError') {
      message = "Invalid token";
    }

    res.status(401).send({
      message: message,
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return res.status(401).send({ message: "Not authenticated" });
    }
    const admin = await Admin.findById(req.user._id).select("role");
    if (!admin) {
      return res.status(401).send({ message: "User not found" });
    }
    const role = (admin.role || '').toLowerCase();
    if (role === 'admin' || role === 'super admin') {
      return next();
    }
    return res.status(401).send({ message: "User is not Admin" });
  } catch (err) {
    return res.status(401).send({ message: "User is not Admin" });
  }
};

const secretKey = process.env.ENCRYPT_PASSWORD;

// Ensure the secret key is exactly 32 bytes (256 bits)
const key = crypto.createHash("sha256").update(secretKey).digest();

// Generate an initialization vector (IV)
const iv = crypto.randomBytes(16); // AES-CBC requires a 16-byte IV

// Helper function to encrypt data
const handleEncryptData = (data) => {
  // Ensure the input is a string or convert it to a string
  const dataToEncrypt = typeof data === "string" ? data : JSON.stringify(data);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encryptedData = cipher.update(dataToEncrypt, "utf8", "hex");
  encryptedData += cipher.final("hex");

  return {
    data: encryptedData,
    iv: iv.toString("hex"),
  };
};


// Middleware to authenticate user using Clerk
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });

    req.user = payload;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};






module.exports = {
  isAuth,
  isAdmin,
  signInToken,
  tokenForVerify,
  handleEncryptData,
  generateAccessToken,
  generateRefreshToken,
  authenticateUser
};
