const Site = require("../models/Site");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const getSitePrefix = (siteName) => {
  const prefix = String(siteName)
    .trim()
    .split(/\s+/)
    .map((word) => word.match(/[A-Z0-9]/i)?.[0] || "")
    .join("")
    .toUpperCase();

  return prefix || "SITE";
};

const generateSiteCode = async (siteName) => {
  const prefix = getSitePrefix(siteName);
  const lastSite = await Site.findOne({
    siteCode: { $regex: new RegExp(`^${prefix}-\\d+$`) },
  })
    .sort({ siteCode: -1 })
    .select("siteCode");

  const lastNumber = lastSite
    ? Number(lastSite.siteCode.slice(prefix.length + 1))
    : 0;
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
};

const validateSiteDetails = ({
  siteName,
  location,
  clientName,
  contactMobile,
  contactEmail,
  projectValue,
  startDate,
}) => {
  if (
    !String(siteName || "").trim() ||
    !String(location || "").trim() ||
    !String(clientName || "").trim() ||
    !String(contactMobile || "").trim() ||
    !String(contactEmail || "").trim() ||
    projectValue === undefined ||
    projectValue === "" ||
    !startDate
  ) {
    return "Site name, location, client name, contact mobile, contact email, project value and start date are required";
  }

  if (!/^\d+$/.test(String(contactMobile).trim())) {
    return "Contact mobile must contain digits only";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contactEmail).trim())) {
    return "Enter a valid contact email";
  }

  const numericProjectValue = Number(projectValue);
  if (!Number.isFinite(numericProjectValue) || numericProjectValue < 0) {
    return "Project value must be a valid non-negative number";
  }

  return null;
};

const createSite = async (req, res) => {
  try {
    const {
      siteName,
      clientName,
      contactMobile,
      contactEmail,
      projectValue,
      location,
      startDate,
      endDate,
      clientGstNumber, addressLine, city, district, state, pincode, billingCycleStartDay, billingCycleEndDay,
    } = req.body;

    const normalizedLocation = String(location || [addressLine, city, district, state, pincode].filter(Boolean).join(", ")).trim();
    const cycleStart = Number(billingCycleStartDay || 1), cycleEnd = Number(billingCycleEndDay || 0);
    if (!Number.isInteger(cycleStart) || cycleStart < 1 || cycleStart > 31 || !Number.isInteger(cycleEnd) || cycleEnd < 0 || cycleEnd > 31) return res.status(400).json({ success: false, message: "Billing cycle days must be between 1 and 31" });
    const validationError = validateSiteDetails({ ...req.body, location: normalizedLocation });
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const contractorId = getContractorId(req.user);
    const normalizedContactMobile = String(contactMobile || "").trim();

    if (normalizedContactMobile && !/^\d+$/.test(normalizedContactMobile)) {
      return res.status(400).json({
        success: false,
        message: "Contact mobile must contain digits only",
      });
    }

    const siteCode = await generateSiteCode(siteName);

    const site = await Site.create({
      companyId: req.user.companyId,
      contractorId,
      siteName: String(siteName).trim(),
      siteCode,
      clientName: String(clientName).trim(),
      contactMobile: normalizedContactMobile,
      contactEmail: String(contactEmail).trim(),
      projectValue: Number(projectValue),
      location: normalizedLocation,
      clientGstNumber: String(clientGstNumber || "").trim(),
      addressLine: String(addressLine || "").trim(),
      city: String(city || "").trim(),
      district: String(district || "").trim(),
      state: String(state || "").trim(),
      pincode: String(pincode || "").trim(),
      billingCycleStartDay: cycleStart,
      billingCycleEndDay: cycleEnd,
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
    const {
      siteName,
      clientName,
      contactMobile,
      contactEmail,
      projectValue,
      location,
      startDate,
      endDate,
      clientGstNumber, addressLine, city, district, state, pincode, billingCycleStartDay, billingCycleEndDay,
      status,
    } = req.body;

    const normalizedLocation = String(location || [addressLine, city, district, state, pincode].filter(Boolean).join(", ")).trim();
    const cycleStart = Number(billingCycleStartDay || 1), cycleEnd = Number(billingCycleEndDay || 0);
    if (!Number.isInteger(cycleStart) || cycleStart < 1 || cycleStart > 31 || !Number.isInteger(cycleEnd) || cycleEnd < 0 || cycleEnd > 31) return res.status(400).json({ success: false, message: "Billing cycle days must be between 1 and 31" });
    const validationError = validateSiteDetails({ ...req.body, location: normalizedLocation });
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (status && !["ACTIVE", "INACTIVE", "COMPLETED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const normalizedContactMobile = String(contactMobile || "").trim();
    if (normalizedContactMobile && !/^\d+$/.test(normalizedContactMobile)) {
      return res.status(400).json({
        success: false,
        message: "Contact mobile must contain digits only",
      });
    }

    const updates = {
      siteName: String(siteName).trim(),
      clientName: String(clientName).trim(),
      contactMobile: normalizedContactMobile,
      contactEmail: String(contactEmail).trim(),
      projectValue: Number(projectValue),
      location: normalizedLocation,
      clientGstNumber: String(clientGstNumber || "").trim(),
      addressLine: String(addressLine || "").trim(),
      city: String(city || "").trim(),
      district: String(district || "").trim(),
      state: String(state || "").trim(),
      pincode: String(pincode || "").trim(),
      billingCycleStartDay: cycleStart,
      billingCycleEndDay: cycleEnd,
      startDate: startDate || null,
      endDate: endDate || null,
      ...(status && { status }),
    };

    const site = await Site.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      updates,
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

