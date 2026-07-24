const Labour = require("../models/Labour");
const Skill = require("../models/Skill");
const Site = require("../models/Site");
const LabourSite = require("../models/LabourSite");
const QRCode = require("qrcode");

const getContractorId = (user) =>
  user.role === "CONTRACTOR" ? user._id : user.parentUserId;

const getSitePrefix = (siteName) => {
  const prefix = String(siteName)
    .trim()
    .split(/\s+/)
    .map((word) => word.match(/[A-Z0-9]/i)?.[0] || "")
    .join("")
    .toUpperCase();

  return prefix || "SITE";
};

const generateLabourCode = async (siteName) => {
  const prefix = getSitePrefix(siteName);
  const lastLabour = await Labour.findOne({
    labourCode: { $regex: new RegExp(`^${prefix}-\\d+$`) },
  })
    .sort({ labourCode: -1 })
    .select("labourCode");

  const lastNumber = lastLabour
    ? Number(lastLabour.labourCode.slice(prefix.length + 1))
    : 100000;
  const nextNumber = Number.isFinite(lastNumber)
    ? lastNumber + 1
    : 100001;

  return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
};

const addAssignedSites = async (labours, contractorId, companyId) => {
  const assignments = await LabourSite.find({
    companyId,
    contractorId,
    labourId: { $in: labours.map((labour) => labour._id) },
    status: "ACTIVE",
    isDeleted: false,
  }).populate("siteId", "siteName siteCode location status");

  const siteByLabourId = new Map(
    assignments.map((assignment) => [
      assignment.labourId.toString(),
      assignment.siteId,
    ])
  );

  return Promise.all(labours.map(async (labour) => {
    const data = labour.toObject();
    if (!data.qrCode) data.qrCode = await QRCode.toDataURL(JSON.stringify({ type: "KINETIC_LMS_LABOUR", id: labour._id.toString(), employeeCode: labour.labourCode }));
    data.site = siteByLabourId.get(labour._id.toString()) || null;
    data.finalDailyWage =
      data.dailyWage ?? data.skillId?.defaultDailyWage ?? 0;
    data.wageType = data.dailyWage != null ? "CUSTOM" : "SKILL_BASED";
    return data;
  }));
};

const statutoryDetails = (body, current = {}) => {
  const isPFApplicable = body.isPFApplicable === undefined ? Boolean(current.isPFApplicable) : body.isPFApplicable === true || body.isPFApplicable === "true";
  const isESICApplicable = body.isESICApplicable === undefined ? Boolean(current.isESICApplicable) : body.isESICApplicable === true || body.isESICApplicable === "true";
  const pfUanNumber = isPFApplicable ? String(body.pfUanNumber ?? current.pfUanNumber ?? "").replace(/\D/g, "") : null;
  const esicIpNumber = isESICApplicable ? String(body.esicIpNumber ?? current.esicIpNumber ?? "").replace(/\D/g, "") : null;
  if (isPFApplicable && !/^\d{12}$/.test(pfUanNumber)) return { error: "PF enabled labour requires a valid 12-digit UAN number" };
  if (isESICApplicable && !/^\d{10}$/.test(esicIpNumber)) return { error: "ESIC enabled labour requires a valid 10-digit IP number" };
  return { isPFApplicable, pfUanNumber, isESICApplicable, esicIpNumber };
};


const optionalText = (value) => {
  const text = value == null ? "" : String(value).trim();
  return text || null;
};
const identityDetails = (body, current = {}) => ({
  aadhaarNumber: optionalText(body.aadhaarNumber ?? current.aadhaarNumber)?.replace(/\D/g, "") || null,
  panNumber: optionalText(body.panNumber ?? current.panNumber)?.toUpperCase() || null,
  bankAccountNumber: optionalText(body.bankAccountNumber ?? current.bankAccountNumber)?.replace(/\D/g, "") || null,
  ifscCode: optionalText(body.ifscCode ?? current.ifscCode)?.toUpperCase() || null,
  emergencyContact: {
    name: String(body.emergencyContactName ?? current.emergencyContact?.name ?? "").trim(),
    relation: String(body.emergencyContactRelation ?? current.emergencyContact?.relation ?? "").trim(),
    mobile: String(body.emergencyContactMobile ?? current.emergencyContact?.mobile ?? "").replace(/\D/g, ""),
  },
  joiningDate: body.joiningDate === undefined ? (current.joiningDate || new Date()) : (body.joiningDate || new Date()),
  resignationDate: body.resignationDate === undefined ? (current.resignationDate || null) : (body.resignationDate || null),
});
const createLabour = async (req, res) => {
  try {
    const {
      supervisorId,
      skillId,
      siteId,
      name,
      mobile,
      gender,
      dob,
      address,
      dailyWage,
      isPFApplicable,
      pfUanNumber,
      isESICApplicable,
      esicIpNumber,
    } = req.body;

    if (!skillId || !siteId || !name || !mobile || !gender) {
      return res.status(400).json({
        success: false,
        message:
          "Skill, site, name, mobile and gender are required",
      });
    }

    const normalizedName = String(name).trim();
    const normalizedMobile = String(mobile).trim();

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Labour name is required",
      });
    }

    if (!/^\d+$/.test(normalizedMobile)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must contain digits only",
      });
    }

    const contractorId = getContractorId(req.user);
    const statutory = statutoryDetails({ isPFApplicable, pfUanNumber, isESICApplicable, esicIpNumber });
    const identity = identityDetails(req.body);
    if (statutory.error) return res.status(400).json({ success: false, message: statutory.error });

    // Skill validation
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
    if (skill.gender && skill.gender !== "ALL" && skill.gender !== gender) {
      return res.status(400).json({ success: false, message: "Selected skill rate is not applicable to this labour gender" });
    }

    // Site validation
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

    // Duplicate mobile check
    const existingLabour = await Labour.findOne({
      companyId: req.user.companyId,
      contractorId,
      mobile: normalizedMobile,
      isDeleted: false,
    });

    if (existingLabour) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists",
      });
    }

    // Generate labour code from the selected site's initials.
    const labourCode = await generateLabourCode(site.siteName);

    // Create labour
    const labour = await Labour.create({
      companyId: req.user.companyId,
      contractorId,
      labourCode,
      supervisorId: supervisorId || null,
      skillId,
      name: normalizedName,
      mobile: normalizedMobile,
      gender,
      dob: dob || null,
      address: address || "",
      ...identity,
      photoUrl: req.file ? `/uploads/labours/${req.file.filename}` : null,
      isPFApplicable: statutory.isPFApplicable,
      pfUanNumber: statutory.pfUanNumber,
      isESICApplicable: statutory.isESICApplicable,
      esicIpNumber: statutory.esicIpNumber,
      dailyWage:
        dailyWage !== undefined && dailyWage !== ""
          ? Number(dailyWage)
          : null,
    });

    labour.qrCode = await QRCode.toDataURL(JSON.stringify({ type: "KINETIC_LMS_LABOUR", id: labour._id.toString(), employeeCode: labour.labourCode }));
    await labour.save();

    try {
      // Assign labour to selected site
      await LabourSite.create({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        siteId,
        supervisorId: supervisorId || null,
        assignedFrom: new Date(),
        assignedTo: null,
        status: "ACTIVE",
        assignedBy: req.user._id,
        isDeleted: false,
      });

      const populatedLabour = await Labour.findById(
        labour._id
      )
        .populate(
          "skillId",
          "skillName skillCode defaultDailyWage otRatePerHour"
        )
        .populate("companyId", "companyName companyCode logoUrl")
        .populate(
          "supervisorId",
          "name mobile employeeCode"
        );

      const [data] = await addAssignedSites(
        [populatedLabour],
        contractorId,
        req.user.companyId
      );

      return res.status(201).json({
        success: true,
        message:
          "Labour created and assigned to site successfully",
        data,
      });
    } catch (assignmentError) {
      // Assignment fail ho to labour rollback kar do
      await Labour.findByIdAndDelete(labour._id);

      return res.status(500).json({
        success: false,
        message:
          "Labour site assignment failed. Labour creation rolled back.",
        error: assignmentError.message,
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Employee code, mobile, Aadhaar, PAN, UAN or ESIC number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLabours = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);
    const labours = await Labour.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    })
      .populate("skillId", "skillName skillCode defaultDailyWage")
      .populate("companyId", "companyName companyCode logoUrl")
      .sort({ createdAt: -1 });

    const data = await addAssignedSites(
      labours,
      contractorId,
      req.user.companyId
    );

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
    const contractorId = getContractorId(req.user);
    const labour = await Labour.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    }).populate("skillId", "skillName skillCode defaultDailyWage").populate("companyId", "companyName companyCode logoUrl");

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    const [data] = await addAssignedSites(
      [labour],
      contractorId,
      req.user.companyId
    );

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
    const contractorId = getContractorId(req.user);
    const {
      name,
      mobile,
      gender,
      dob,
      address,
      dailyWage,
      skillId,
      siteId,
      isPFApplicable,
      pfUanNumber,
      isESICApplicable,
      esicIpNumber,
    } = req.body;
    const currentLabour = await Labour.findOne({ _id: req.params.id, companyId: req.user.companyId, contractorId, isDeleted: false });
    if (!currentLabour) return res.status(404).json({ success: false, message: "Labour not found" });
    const statutory = statutoryDetails({ isPFApplicable, pfUanNumber, isESICApplicable, esicIpNumber }, currentLabour);
    const identity = identityDetails(req.body, currentLabour);
    if (statutory.error) return res.status(400).json({ success: false, message: statutory.error });

    if (!name || !mobile || !gender || !skillId) {
      return res.status(400).json({
        success: false,
        message: "Labour name, mobile, skill, site and gender are required",
      });
    }
    const normalizedName = String(name).trim();
    const normalizedMobile = String(mobile).trim();

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Labour name is required",
      });
    }

    if (!/^\d+$/.test(normalizedMobile)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must contain digits only",
      });
    }

    if (skillId) {
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
      if (skill.gender && skill.gender !== "ALL" && skill.gender !== gender) {
        return res.status(400).json({ success: false, message: "Selected skill rate is not applicable to this labour gender" });
      }
    }

    const existingAssignment = await LabourSite.findOne({
      companyId: req.user.companyId,
      contractorId,
      labourId: req.params.id,
      status: "ACTIVE",
      isDeleted: false,
    });

    if (!existingAssignment && !siteId) {
      return res.status(400).json({
        success: false,
        message: "Site is required for an unassigned labour",
      });
    }

    if (existingAssignment && siteId) {
      return res.status(400).json({
        success: false,
        message: "Site is already assigned and cannot be changed",
      });
    }

    const duplicateMobile = await Labour.findOne({
      _id: { $ne: req.params.id },
      companyId: req.user.companyId,
      contractorId,
      mobile: normalizedMobile,
      isDeleted: false,
    });

    if (duplicateMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists",
      });
    }

    let siteToAssign = null;

    if (siteId) {

      siteToAssign = await Site.findOne({
        _id: siteId,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
        status: "ACTIVE",
      });

      if (!siteToAssign) {
        return res.status(404).json({
          success: false,
          message: "Site not found or inactive",
        });
      }
    }

    const assignedLabourCode = siteToAssign
      ? await generateLabourCode(siteToAssign.siteName)
      : undefined;

    const updates = {
      name: normalizedName,
      mobile: normalizedMobile,
      ...(gender !== undefined && { gender }),
      ...(dob !== undefined && { dob: dob || null }),
      ...(address !== undefined && { address }),
      ...identity,
      ...(req.file && { photoUrl: `/uploads/labours/${req.file.filename}` }),
      isPFApplicable: statutory.isPFApplicable,
      pfUanNumber: statutory.pfUanNumber,
      isESICApplicable: statutory.isESICApplicable,
      esicIpNumber: statutory.esicIpNumber,
      ...(dailyWage !== undefined && {
        dailyWage:
          dailyWage === "" || dailyWage === null ? null : Number(dailyWage),
      }),
      ...(skillId !== undefined && { skillId }),
      ...(assignedLabourCode && { labourCode: assignedLabourCode }),
    };

    const labour = await Labour.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      },
      updates,
      { new: true, runValidators: true }
    ).populate("skillId", "skillName skillCode defaultDailyWage");

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    if (siteId) {
      await LabourSite.create({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        siteId,
        supervisorId: labour.supervisorId || null,
        assignedFrom: new Date(),
        assignedTo: null,
        status: "ACTIVE",
        assignedBy: req.user._id,
        isDeleted: false,
      });
    }

    const [data] = await addAssignedSites(
      [labour],
      contractorId,
      req.user.companyId
    );

    res.status(200).json({
      success: true,
      message: siteId
        ? "Labour updated and assigned to site successfully"
        : "Labour updated successfully",
      data,
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "Aadhaar, PAN, UAN or ESIC number already exists" });
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







