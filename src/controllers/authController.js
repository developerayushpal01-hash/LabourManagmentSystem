const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

// Register Users or Company

const register = async (req, res) => {


  try {

    const lastCompany = await Company.findOne().sort({ createdAt: -1 });

let nextNumber = 1;

if (lastCompany && lastCompany.companyCode) {
  const lastNumber = parseInt(lastCompany.companyCode.split("-")[1]);
  nextNumber = lastNumber + 1;
}

const companyCode = `COMP-${String(nextNumber).padStart(4, "0")}`;


  const {
  companyName,
  ownerName,
  email,
  mobile,
  address,
  gstNumber,
  password,
} = req.body;

   if (
  !companyName ||
  !ownerName ||
  !email ||
  !mobile ||
  !password ||
  !address ||
  !address.street ||
  !address.city ||
  !address.state ||
  !address.pincode
) {
  return res.status(400).json({
    success: false,
    message: "All required fields are mandatory",
  });
}

    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const company = await Company.create({
  companyCode,
  companyName,
  ownerName,
  email,
  mobile,
  address: {
    street: address.street,
    city: address.city,
    district: address.district,
    state: address.state,
    pincode: address.pincode,
    country: address.country || "India",
  },
  gstNumber,
});

    const user = await User.create({
      companyId: company._id,
      name: ownerName,
      email,
      mobile,
      password: hashedPassword,
    });

    company.createdBy = user._id;
    await company.save();

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
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    });

   return res.status(201).json({
      success: true,
      message: "Registration successful",
      company: {
        id: company._id,
        companyCode: company.companyCode,
        companyName: company.companyName,
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    console.log("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = otp;
    user.resetOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.isResetOtpVerified = false;

    await user.save();

    console.log("Forgot Password OTP:", otp);

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

module.exports = {register , login, logout, getMe, changePassword, forgotPassword, verifyOtp, resetPassword}
