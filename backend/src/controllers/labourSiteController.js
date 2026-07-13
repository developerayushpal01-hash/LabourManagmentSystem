const LabourSite = require("../models/LabourSite");
const Labour = require("../models/Labour");
const Site = require("../models/Site");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const assignLabourToSite = async (req, res) => {
  try {
    const { labourId, siteId, assignedFrom, assignedTo } = req.body;

    if (!labourId || !siteId || !assignedFrom) {
      return res.status(400).json({
        success: false,
        message: "Labour, site and assigned from date are required",
      });
    }

    const contractorId = getContractorId(req.user);

    const labour = await Labour.findOne({
      _id: labourId,
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
      status: "ACTIVE",
    });

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found or inactive",
      });
    }

    const site = await Site.findOne({
      _id: siteId,
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
      status: "ACTIVE",
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found or inactive",
      });
    }

    const alreadyAssigned = await LabourSite.findOne({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      status: "ACTIVE",
      isDeleted: false,
    });

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: "Labour already has a site assigned and it cannot be changed",
      });
    }

    const assignment = await LabourSite.create({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      siteId,
      supervisorId: labour.supervisorId,
      assignedFrom,
      assignedTo,
      assignedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Labour assigned to site successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAssignments = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const assignments = await LabourSite.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    })
      .populate("labourId", "name mobile")
      .populate("siteId", "siteName siteCode location")
      .populate("supervisorId", "name mobile role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAssignmentsBySite = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const assignments = await LabourSite.find({
      companyId: req.user.companyId,
      contractorId,
      siteId: req.params.siteId,
      isDeleted: false,
    })
      .populate("labourId", "name mobile gender status")
      .populate("siteId", "siteName siteCode location")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAssignmentsByLabour = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const assignments = await LabourSite.find({
      companyId: req.user.companyId,
      contractorId,
      labourId: req.params.labourId,
      isDeleted: false,
    })
      .populate("labourId", "name mobile gender status")
      .populate("siteId", "siteName siteCode location status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const changeAssignmentStatus = async (req, res) => {
  try {
    const { status, assignedTo } = req.body;

    if (!["ACTIVE", "COMPLETED", "REMOVED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const contractorId = getContractorId(req.user);

    const assignment = await LabourSite.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      {
        status,
        assignedTo: assignedTo || new Date(),
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Assignment status updated successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const assignment = await LabourSite.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      {
        isDeleted: true,
        status: "REMOVED",
        assignedTo: new Date(),
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Assignment removed successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  assignLabourToSite,
  getAssignments,
  getAssignmentsBySite,
  getAssignmentsByLabour,
  changeAssignmentStatus,
  deleteAssignment,
};
