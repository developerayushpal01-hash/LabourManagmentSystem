const Site = require("../models/Site");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const createSite = async (req, res) => {
  try {
    const {
      siteName,
      siteCode,
      clientName,
      location,
      startDate,
      endDate,
    } = req.body;

    if (!siteName) {
      return res.status(400).json({
        success: false,
        message: "Site name is required",
      });
    }

    const contractorId = getContractorId(req.user);

    const site = await Site.create({
      companyId: req.user.companyId,
      contractorId,
      siteName,
      siteCode,
      clientName,
      location,
      startDate,
      endDate,
    });

    res.status(201).json({
      success: true,
      message: "Site created successfully",
      data: site,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSites = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const sites = await Site.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sites.length,
      data: sites,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSiteById = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const site = await Site.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    res.status(200).json({
      success: true,
      data: site,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSite = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const site = await Site.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Site updated successfully",
      data: site,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const changeSiteStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE", "COMPLETED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const contractorId = getContractorId(req.user);

    const site = await Site.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      { status },
      { new: true }
    );

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Site status updated successfully",
      data: site,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSite = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const site = await Site.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      { isDeleted: true },
      { new: true }
    );

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Site deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSite,
  getSites,
  getSiteById,
  updateSite,
  changeSiteStatus,
  deleteSite,
};