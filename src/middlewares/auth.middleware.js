const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("DECODED TOKEN:", decoded);

    const userId = decoded.id || decoded._id || decoded.userId;

    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isActive !== true) {
      return res.status(401).json({
        success: false,
        message: "User is not active",
      });
    }

    if (user.role !== "SUPER_ADMIN") {
      const company = await Company.findOne({ _id: user.companyId, isDeleted: { $ne: true } }).select("status");
      if (!company || company.status !== "ACTIVE") return res.status(403).json({ success: false, message: "Company account is not active" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("JWT ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid Token",
    });
  }
};