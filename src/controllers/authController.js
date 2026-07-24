const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const PendingRegistration = require("../models/PendingRegistration");
const { sendOtpEmail } = require("../utils/emailService");
const crypto = require("crypto");
const createOtp = () => crypto.randomInt(100000, 1000000).toString();

// Start registration and email the verification OTP.
const register = async (req, res) => {
  try {
    const { companyName, ownerName, email, mobile, address, gstNumber, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!companyName || !ownerName || !normalizedEmail || !mobile || !password || !address?.street || !address?.city || !address?.state || !address?.pincode) {
      return res.status(400).json({ success: false, message: "All required fields are mandatory" });
    }
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { mobile: mobile.trim() }] });
    if (existing) return res.status(409).json({ success: false, message: "Email or mobile already registered" });

    const otp = createOtp();
    const registrationData = {
      companyName: companyName.trim(), ownerName: ownerName.trim(), email: normalizedEmail,
      mobile: mobile.trim(), address, gstNumber: gstNumber?.trim(), password: await bcrypt.hash(password, 10),
    };
    await sendOtpEmail({ email: normalizedEmail, otp, purpose: "registration" });
    await PendingRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      { email: normalizedEmail, mobile: mobile.trim(), registrationData, otpHash: await bcrypt.hash(otp, 10), otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 },
      { upsert: true, new: true, runValidators: true }
    );
    return res.status(200).json({ success: true, message: `OTP sent to ${normalizedEmail}`, email: normalizedEmail });
  } catch (error) {
    console.log("Register OTP Error:", error);
    const configurationError = error.message?.startsWith("Email service is not configured");
    return res.status(500).json({ success: false, message: configurationError ? "Email service is not configured on the server" : "Unable to send verification OTP. Please try again." });
  }
};

const verifyRegistrationOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();
    if (!email || !/^\d{6}$/.test(otp || "")) return res.status(400).json({ success: false, message: "Email and valid 6-digit OTP are required" });
    const pending = await PendingRegistration.findOne({ email });
    if (!pending) return res.status(400).json({ success: false, message: "OTP expired or registration request not found" });
    if (pending.otpExpiresAt.getTime() < Date.now()) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
    }
    if (pending.attempts >= 5) return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please request a new OTP." });
    if (!(await bcrypt.compare(otp, pending.otpHash))) {
      pending.attempts += 1; await pending.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    const data = pending.registrationData;
    const existing = await User.findOne({ $or: [{ email: data.email }, { mobile: data.mobile }] });
    if (existing) { await PendingRegistration.deleteOne({ _id: pending._id }); return res.status(409).json({ success: false, message: "Email or mobile already registered" }); }

    const isFirstUser = (await User.countDocuments({})) === 0;
    let company = null;
    let user;
    if (isFirstUser) {
      user = await User.create({ companyId: null, name: data.ownerName, email: data.email, mobile: data.mobile, password: data.password, role: "SUPER_ADMIN", status: "ACTIVE", isActive: true });
    } else {
      const lastCompany = await Company.findOne().sort({ createdAt: -1 });
      const lastNumber = lastCompany?.companyCode ? parseInt(lastCompany.companyCode.split("-")[1], 10) : 0;
      const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
      company = await Company.create({ companyCode: `COMP-${String(nextNumber).padStart(4, "0")}`, companyName: data.companyName, ownerName: data.ownerName, email: data.email, mobile: data.mobile, address: { ...data.address, country: data.address.country || "India" }, gstNumber: data.gstNumber });
      user = await User.create({ companyId: company._id, name: data.ownerName, email: data.email, mobile: data.mobile, password: data.password });
      company.createdBy = user._id; await company.save();
    }
    await PendingRegistration.deleteOne({ _id: pending._id });
    const token = jwt.sign({ userId: user._id, role: user.role, companyId: user.companyId }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({ success: true, message: "Email verified and registration completed", company: company ? { id: company._id, companyCode: company.companyCode, companyName: company.companyName } : null, user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, role: user.role, companyId: user.companyId } });
  } catch (error) {
    console.log("Verify Registration OTP Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// Login Users or Company

const login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: "Login ID and password are required",
      });
    }

    let user;

    if (loginId.startsWith("COMP-")) {
      const company = await Company.findOne({
        companyCode: loginId.toUpperCase(),
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Invalid login credentials",
        });
      }

      user = await User.findOne({
        companyId: company._id,
        role: "CONTRACTOR",
        isDeleted: false,
      });
    } else {
      user = await User.findOne({
        $or: [
          { email: loginId.toLowerCase() },
          { mobile: loginId },
        ],
        isDeleted: false,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid login credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        companyId: user.companyId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // React aur backend same domain ho to
    maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const company = await Company.findById(user.companyId);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        companyId: user.companyId,
      },
      company: company
        ? {
            id: company._id,
            companyCode: company.companyCode,
            companyName: company.companyName,
            status: company.status,
          }
        : null,
    });
  } catch (error) {
    console.log("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Logout Users or Company

const logout = async (req, res) => {
  res.clearCookie("token");

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

// find User

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("companyId");

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
        company: user.companyId
          ? {
              id: user.companyId._id,
              companyCode: user.companyId.companyCode,
              companyName: user.companyId.companyName,
              ownerName: user.companyId.ownerName,
              status: user.companyId.status,
            }
          : null,
      },
    });
  } catch (error) {
    console.log("Get Me Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


//Password change 

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.log("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//Forgot Password

const forgotPassword = async (req, res) => {
  try {
    const { loginId } = req.body;

    if (!loginId) {
      return res.status(400).json({
        success: false,
        message: "Email or mobile number is required",
      });
    }

    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { mobile: loginId },
      ],
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.email) return res.status(400).json({ success: false, message: "No email is linked to this account" });

    const otp = createOtp();

    user.resetOtp = otp;
    user.resetOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.isResetOtpVerified = false;

    await user.save();

    await sendOtpEmail({ email: user.email, otp, purpose: "password-reset" });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log("Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//Verify OTP

const verifyOtp = async (req, res) => {
  try {
    const { loginId, otp } = req.body;

    if (!loginId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Login ID and OTP are required",
      });
    }

    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { mobile: loginId },
      ],
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (user.resetOtpExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    user.isResetOtpVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });

  } catch (error) {
    console.log("Verify OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Reset password

const resetPassword = async (req, res) => {
  try {
    const { loginId, newPassword } = req.body;

    if (!loginId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Login ID and new password are required",
      });
    }

    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { mobile: loginId },
      ],
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isResetOtpVerified) {
      return res.status(400).json({
        success: false,
        message: "OTP verification required",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    user.resetOtp = null;
    user.resetOtpExpire = null;
    user.isResetOtpVerified = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.log("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { register, verifyRegistrationOtp, login, logout, getMe, changePassword, forgotPassword, verifyOtp, resetPassword }

