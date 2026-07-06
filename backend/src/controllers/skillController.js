const Skill = require("../models/Skill");

const createSkill = async (req, res) => {
  try {
    const { skillName, skillCode, defaultDailyWage } = req.body;

    if (!skillName || !defaultDailyWage) {
      return res.status(400).json({
        success: false,
        message: "Skill name and default daily wage are required",
      });
    }

    const skill = await Skill.create({
      companyId: req.user.companyId,
      contractorId: req.user._id,
      skillName,
      skillCode,
      defaultDailyWage,
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
    const skills = await Skill.find({
      companyId: req.user.companyId,
      contractorId: req.user._id,
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
    const skill = await Skill.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId: req.user._id,
        isDeleted: false,
      },
      req.body,
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
    const skill = await Skill.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId: req.user._id,
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