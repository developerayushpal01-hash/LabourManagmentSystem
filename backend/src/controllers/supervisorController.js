const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createSupervisor = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
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

    const supervisor = await User.create({
      companyId: req.user.companyId,
      parentUserId: req.user.userId,
      name,
      email,
      mobile,
      password: hashedPassword,
      role: "SUPERVISOR",
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Supervisor created successfully",
      supervisor: {
        id: supervisor._id,
        name: supervisor.name,
        email: supervisor.email,
        mobile: supervisor.mobile,
        role: supervisor.role,
        companyId: supervisor.companyId,
        parentUserId: supervisor.parentUserId,
      },
    });
  } catch (error) {
    console.log("Create Supervisor Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createSupervisor,
};