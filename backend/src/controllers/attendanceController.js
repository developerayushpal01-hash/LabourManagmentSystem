const Attendance = require("../models/Attendance");
const Labour = require("../models/Labour");

const getContractorId = (user) => user.role === "CONTRACTOR" ? user._id : user.parentUserId;

const markAttendance = async (req, res) => {
  try {
   const { labourId, siteId, attendanceDate, status, overtimeHours, overtimeAmount, remarks } = req.body;

    if (!labourId || !attendanceDate) {
      return res.status(400).json({
        success: false,
        message: "Labour and attendance date are required",
      });
    }

    const numericOvertimeHours = Number(overtimeHours ?? 0);
    const numericOvertimeAmount = overtimeAmount === null || overtimeAmount === undefined || overtimeAmount === "" ? null : Number(overtimeAmount);
    if (!Number.isFinite(numericOvertimeHours) || numericOvertimeHours < 0 || (numericOvertimeAmount !== null && (!Number.isFinite(numericOvertimeAmount) || numericOvertimeAmount < 0))) {
      return res.status(400).json({ success: false, message: "Overtime hours and amount cannot be negative" });
    }

    const selectedAttendanceDate = new Date(attendanceDate);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (Number.isNaN(selectedAttendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date",
      });
    }

    if (selectedAttendanceDate > todayEnd) {
      return res.status(400).json({
        success: false,
        message: "Future date attendance cannot be marked",
      });
    }

    const labour = await Labour.findOne({
      _id: labourId,
      companyId: req.user.companyId,
      contractorId: getContractorId(req.user),
      isDeleted: false,
    }).populate("skillId", "defaultDailyWage");

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    const wageType = labour.dailyWage !== null && labour.dailyWage !== undefined ? "CUSTOM" : "SKILL_BASED";
    const wageAtThatDay = labour.dailyWage ?? labour.skillId.defaultDailyWage;

    const existingDeleted = await Attendance.findOne({
  labourId: labour._id,
  attendanceDate,
  isDeleted: true,
});

if (existingDeleted) {
  existingDeleted.isDeleted = false;
  existingDeleted.status = status || "PRESENT";
  existingDeleted.siteId = siteId;
  existingDeleted.overtimeHours = numericOvertimeHours;
  existingDeleted.overtimeAmount = numericOvertimeAmount;
  existingDeleted.remarks = remarks || "";
  existingDeleted.markedBy = req.user._id;

  await existingDeleted.save();

  return res.status(200).json({
    success: true,
    message: "Attendance restored successfully",
    data: existingDeleted,
  });
}

    const attendance = await Attendance.create({
      companyId: req.user.companyId,
      contractorId: getContractorId(req.user),
      supervisorId: labour.supervisorId,
      labourId: labour._id,
      skillId: labour.skillId._id,
      siteId ,
      attendanceDate,
      status: status || "PRESENT",
      wageType,
      wageAtThatDay,
      overtimeHours: numericOvertimeHours,
      overtimeAmount: numericOvertimeAmount,
      remarks,
      markedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this labour on this date",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();

    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId: getContractorId(req.user),
      attendanceDate: { $gte: start, $lte: end },
      isDeleted: false,
    })
      .populate("labourId", "name mobile")
      .populate("skillId", "skillName defaultDailyWage")
      .populate("siteId", "siteName siteCode location")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMonthlyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId: getContractorId(req.user),
      attendanceDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    })
      .populate("labourId", "name mobile")
      .populate("skillId", "skillName defaultDailyWage")
      .sort({ attendanceDate: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const allowedFields = [
      "status",
      "overtimeHours",
      "overtimeAmount",
      "overtimeRate",
      "remarks",
    ];

    for (const field of ["overtimeHours", "overtimeAmount", "overtimeRate"]) {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "") {
        const value = Number(req.body[field]);
        if (!Number.isFinite(value) || value < 0) return res.status(400).json({ success: false, message: "Overtime values cannot be negative" });
        req.body[field] = value;
      } else if (field === "overtimeAmount" && (req.body[field] === "" || req.body[field] === null)) {
        req.body[field] = null;
      }
    }

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const attendance = await Attendance.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId: getContractorId(req.user),
        isDeleted: false,
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
        contractorId: getContractorId(req.user),
        isDeleted: false,
      },
      { isDeleted: true },
      { new: true }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  markAttendance,
  getTodayAttendance,
  getMonthlyAttendance,
  updateAttendance,
  deleteAttendance,
};
