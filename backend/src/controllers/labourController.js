const Labour = require("../models/Labour");
const Skill = require("../models/Skill");

const createLabour = async (req, res) => {
  try {
    const {
      supervisorId,
      skillId,
      name,
      mobile,
      gender,
      dob,
      address,
      dailyWage,
    } = req.body;

    if (!skillId || !name || !mobile || !gender) {
      return res.status(400).json({
        success: false,
        message: "Skill, name, mobile and gender are required",
      });
    }

    const contractorId =
      req.user.role === "CONTRACTOR"
        ? req.user._id
        : req.user.parentUserId;

    // Skill Validation
    const skill = await Skill.findOne({
      _id: skillId,
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
      status: "ACTIVE",
    });

    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill not found or inactive",
      });
    }

    // Duplicate Mobile Check
    const existingLabour = await Labour.findOne({
      companyId: req.user.companyId,
      contractorId,
      mobile,
      isDeleted: false,
    });

    if (existingLabour) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists.",
      });
    }

    // Generate Labour Code
    const lastLabour = await Labour.findOne({
      companyId: req.user.companyId,
      contractorId,
    }).sort({ createdAt: -1 });

    let nextNumber = 100001;

    if (lastLabour && lastLabour.labourCode) {
      const lastNumber = parseInt(
        lastLabour.labourCode.split("-")[1]
      );

      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const labourCode = `LBR-${nextNumber}`;

    // Create Labour
    const labour = await Labour.create({
      companyId: req.user.companyId,
      contractorId,
      labourCode,
      supervisorId: supervisorId || null,
      skillId,
      name,
      mobile,
      gender,
      dob: dob || null,
      address: address || "",
      dailyWage: dailyWage ?? null,
    });

    res.status(201).json({
      success: true,
      message: "Labour created successfully",
      data: labour,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLabours = async (req, res) => {
  try {
    const labours = await Labour.find({
      companyId: req.user.companyId,
      contractorId: req.user._id,
      isDeleted: false,
    })
      .populate("skillId", "skillName skillCode defaultDailyWage")
      .sort({ createdAt: -1 });

    const data = labours.map((labour) => {
      const obj = labour.toObject();

      obj.finalDailyWage =
        obj.dailyWage ?? obj.skillId?.defaultDailyWage ?? 0;

      obj.wageType = obj.dailyWage ? "CUSTOM" : "SKILL_BASED";

      return obj;
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLabourById = async (req, res) => {
  try {
    const labour = await Labour.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      contractorId: req.user._id,
      isDeleted: false,
    }).populate("skillId", "skillName skillCode defaultDailyWage");

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    const data = labour.toObject();

    data.finalDailyWage =
      data.dailyWage ?? data.skillId?.defaultDailyWage ?? 0;

    data.wageType = data.dailyWage ? "CUSTOM" : "SKILL_BASED";

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLabour = async (req, res) => {
  try {
    if (req.body.skillId) {
      const skill = await Skill.findOne({
        _id: req.body.skillId,
        companyId: req.user.companyId,
        contractorId: req.user._id,
        isDeleted: false,
        status: "ACTIVE",
      });

      if (!skill) {
        return res.status(404).json({
          success: false,
          message: "Skill not found or inactive",
        });
      }
    }

    const labour = await Labour.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId: req.user._id,
        isDeleted: false,
      },
      req.body,
      { new: true, runValidators: true }
    ).populate("skillId", "skillName skillCode defaultDailyWage");

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    const data = labour.toObject();

    data.finalDailyWage =
      data.dailyWage ?? data.skillId?.defaultDailyWage ?? 0;

    data.wageType = data.dailyWage ? "CUSTOM" : "SKILL_BASED";

    res.status(200).json({
      success: true,
      message: "Labour updated successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const changeLabourStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const labour = await Labour.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId: req.user._id,
        isDeleted: false,
      },
      { status },
      { new: true }
    );

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Labour status updated successfully",
      data: labour,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteLabour = async (req, res) => {
  try {
    const labour = await Labour.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId: req.user._id,
        isDeleted: false,
      },
      { isDeleted: true },
      { new: true }
    );

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Labour deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLabour,
  getLabours,
  getLabourById,
  updateLabour,
  changeLabourStatus,
  deleteLabour,
};