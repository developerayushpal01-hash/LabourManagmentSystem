const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateEmployeeCode = require("../utils/generateEmployeeCode");

const createUser = async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    if (!name || !email || !mobile || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    const loggedInUser = req.user;

    if (loggedInUser.role === "SUPER_ADMIN" && role !== "CONTRACTOR") {
      return res.status(403).json({
        success: false,
        message: "Super Admin can create only Contractor",
      });
    }

    if (
      loggedInUser.role === "CONTRACTOR" &&
      !["SUPERVISOR", "ACCOUNTANT"].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Contractor can create only Supervisor or Accountant",
      });
    }

    if (["SUPERVISOR", "ACCOUNTANT"].includes(loggedInUser.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to create users",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
      isDeleted: false,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeCode = await generateEmployeeCode(role);

    const userData = {
      employeeCode,
      name,
      email,
      mobile,
      password: hashedPassword,
      role,
      createdBy: loggedInUser._id,
      parentUserId: loggedInUser._id,
    };

    if (loggedInUser.role === "SUPER_ADMIN" && role === "CONTRACTOR") {
      userData.companyId = null;
    }

    if (loggedInUser.role === "CONTRACTOR") {
      userData.companyId = loggedInUser.companyId;
    }

    const user = await User.create(userData);

    return res.status(201).json({
      success: true,
      message: `${role} created successfully`,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const loggedInUser = req.user;

    let filter = { isDeleted: false };

    if (loggedInUser.role === "SUPER_ADMIN") {
      filter.role = "CONTRACTOR";
    }

    if (loggedInUser.role === "CONTRACTOR") {
      filter.companyId = loggedInUser.companyId;
      filter.role = { $in: ["SUPERVISOR", "ACCOUNTANT"] };
    }

    const users = await User.find(filter)
      .select("-password -resetOtp -resetOtpExpire")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).select("-password -resetOtp -resetOtpExpire");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.mobile = mobile || user.mobile;
    user.updatedBy = req.user._id;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isDeleted = true;
    user.isActive = false;
    user.status = "INACTIVE";
    user.deletedBy = req.user._id;
    user.deletedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const changeUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.status = status;
    user.isActive = status === "ACTIVE";
    user.updatedBy = req.user._id;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeUserStatus,
};