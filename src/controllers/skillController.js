const Skill = require("../models/Skill");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const createSkill = async (req, res) => {
  try {
    const { skillName, skillCode, defaultDailyWage, otRatePerHour } = req.body;

    if (!skillName || !defaultDailyWage) {
      return res.status(400).json({
        success: false,
        message: "Skill name and default daily wage are required",
      });
    }

    const contractorId = getContractorId(req.user);

    const skill = await Skill.create({
      companyId: req.user.companyId,
      contractorId,
      skillName,
      skillCode,
      defaultDailyWage,
      otRatePerHour: otRatePerHour || 0,
    });

    res.status(201).json({
      success: true,
      message: "Skill created successfully",
      data: skill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSkills = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const skills = await Skill.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: skills.length,
      data: skills,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSkill = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const allowedFields = [
      "skillName",
      "skillCode",
      "defaultDailyWage",
      "otRatePerHour",
      "status",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const skill = await Skill.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Skill updated successfully",
      data: skill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSkill = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const skill = await Skill.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      { isDeleted: true },
      { new: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        message: "Skill not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Skill deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSkill,
  getSkills,
  updateSkill,
  deleteSkill,
};