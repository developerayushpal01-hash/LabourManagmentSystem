const Attendance = require("../models/Attendance");
const Labour = require("../models/Labour");
const LabourPayment = require("../models/LabourPayment");
const LabourSite = require("../models/LabourSite");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const getDateRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getMonthRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { start, end };
};

const dailyAttendanceReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const contractorId = getContractorId(req.user);
    const { start, end } = getDateRange(date);

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      attendanceDate: { $gte: start, $lte: end },
      isDeleted: false,
    })
      .populate("labourId", "name mobile")
      .populate("skillId", "skillName")
      .populate("siteId", "siteName siteCode location")
      .sort({ createdAt: -1 });

    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      leave: 0,
      holiday: 0,
    };

    attendance.forEach((item) => {
      if (item.status === "PRESENT") summary.present++;
      if (item.status === "ABSENT") summary.absent++;
      if (item.status === "HALF_DAY") summary.halfDay++;
      if (item.status === "LEAVE") summary.leave++;
      if (item.status === "HOLIDAY") summary.holiday++;
    });

    res.status(200).json({
      success: true,
      date,
      summary,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const monthlyAttendanceReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const contractorId = getContractorId(req.user);
    const { start, end } = getMonthRange(Number(month), Number(year));

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      attendanceDate: { $gte: start, $lte: end },
      isDeleted: false,
    })
      .populate("labourId", "name mobile")
      .populate("skillId", "skillName")
      .populate("siteId", "siteName siteCode location")
      .sort({ attendanceDate: 1 });

    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      leave: 0,
      holiday: 0,
      overtimeAmount: 0,
      wageAmount: 0,
    };

    attendance.forEach((item) => {
      if (item.status === "PRESENT") {
        summary.present++;
        summary.wageAmount += item.wageAtThatDay;
      }

      if (item.status === "HALF_DAY") {
        summary.halfDay++;
        summary.wageAmount += item.wageAtThatDay / 2;
      }

      if (item.status === "ABSENT") summary.absent++;
      if (item.status === "LEAVE") summary.leave++;
      if (item.status === "HOLIDAY") summary.holiday++;

      summary.overtimeAmount += item.overtimeAmount || 0;
    });

    res.status(200).json({
      success: true,
      month: Number(month),
      year: Number(year),
      summary,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const labourWiseReport = async (req, res) => {
  try {
    const { labourId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const contractorId = getContractorId(req.user);
    const { start, end } = getMonthRange(Number(month), Number(year));

    const labour = await Labour.findOne({
      _id: labourId,
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    if (!labour) {
      return res.status(404).json({
        success: false,
        message: "Labour not found",
      });
    }

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      attendanceDate: { $gte: start, $lte: end },
      isDeleted: false,
    })
      .populate("siteId", "siteName siteCode location")
      .populate("skillId", "skillName")
      .sort({ attendanceDate: 1 });

    const payments = await LabourPayment.find({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
      isDeleted: false,
    }).sort({ paymentDate: 1 });

    let payableAmount = 0;
    let overtimeAmount = 0;
    let paidAmount = 0;
    let advanceAmount = 0;
    let bonusAmount = 0;
    let deductionAmount = 0;

    attendance.forEach((item) => {
      if (item.status === "PRESENT") payableAmount += item.wageAtThatDay;
      if (item.status === "HALF_DAY") payableAmount += item.wageAtThatDay / 2;
      overtimeAmount += item.overtimeAmount || 0;
    });

    payableAmount += overtimeAmount;

    payments.forEach((item) => {
      if (item.paymentType === "SALARY") paidAmount += item.amount;
      if (item.paymentType === "ADVANCE") advanceAmount += item.amount;
      if (item.paymentType === "BONUS") bonusAmount += item.amount;
      if (item.paymentType === "DEDUCTION") deductionAmount += item.amount;
    });

    const netPayable =
      payableAmount + bonusAmount - advanceAmount - deductionAmount;

    res.status(200).json({
      success: true,
      data: {
        labour,
        month: Number(month),
        year: Number(year),
        summary: {
          payableAmount,
          overtimeAmount,
          advanceAmount,
          bonusAmount,
          deductionAmount,
          netPayable,
          paidAmount,
          balanceAmount: netPayable - paidAmount,
        },
        attendance,
        payments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const siteWiseReport = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const contractorId = getContractorId(req.user);
    const { start, end } = getMonthRange(Number(month), Number(year));

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      siteId,
      attendanceDate: { $gte: start, $lte: end },
      isDeleted: false,
    })
      .populate("labourId", "name mobile")
      .populate("siteId", "siteName siteCode location")
      .populate("skillId", "skillName")
      .sort({ attendanceDate: 1 });

    let totalWage = 0;
    let overtimeAmount = 0;

    attendance.forEach((item) => {
      if (item.status === "PRESENT") totalWage += item.wageAtThatDay;
      if (item.status === "HALF_DAY") totalWage += item.wageAtThatDay / 2;
      overtimeAmount += item.overtimeAmount || 0;
    });

    res.status(200).json({
      success: true,
      month: Number(month),
      year: Number(year),
      summary: {
        totalRecords: attendance.length,
        totalWage,
        overtimeAmount,
        totalAmount: totalWage + overtimeAmount,
      },
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const paymentReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const contractorId = getContractorId(req.user);

    const payments = await LabourPayment.find({
      companyId: req.user.companyId,
      contractorId,
      month: Number(month),
      year: Number(year),
      isDeleted: false,
    }).populate("createdBy", "name role").sort({ paymentDate: -1 });

    const labourIds = payments.map((item) => item.labourId).filter(Boolean);
    const [paymentLabours, assignments] = await Promise.all([
      Labour.find({ _id: { $in: labourIds }, companyId: req.user.companyId, contractorId }).select("labourCode name mobile status isDeleted").lean(),
      LabourSite.find({ companyId: req.user.companyId, contractorId, labourId: { $in: labourIds }, isDeleted: false }).sort({ createdAt: -1 }).populate("siteId", "siteName siteCode").lean(),
    ]);
    const labourById = new Map(paymentLabours.map((item) => [item._id.toString(), item]));
    const siteByLabour = new Map();
    assignments.forEach((item) => { const key = item.labourId.toString(); if (!siteByLabour.has(key) || item.status === "ACTIVE") siteByLabour.set(key, item.siteId); });
    const reportData = payments.map((item) => {
      const data = item.toObject();
      const rawId = item.labourId?.toString() || "";
      const labour = labourById.get(rawId);
      data.labourId = labour
        ? { ...labour, site: siteByLabour.get(rawId) || null }
        : { _id: rawId, labourCode: item.labourCodeSnapshot || `REF-${rawId.slice(-6).toUpperCase()}`, name: item.labourNameSnapshot || "Deleted Labour", mobile: "", status: "DELETED", site: siteByLabour.get(rawId) || null };
      return data;
    });

    const summary = {
      salary: 0,
      advance: 0,
      bonus: 0,
      deduction: 0,
    };

    payments.forEach((item) => {
      if (item.paymentType === "SALARY") summary.salary += item.amount;
      if (item.paymentType === "ADVANCE") summary.advance += item.amount;
      if (item.paymentType === "BONUS") summary.bonus += item.amount;
      if (item.paymentType === "DEDUCTION") summary.deduction += item.amount;
    });

    res.status(200).json({
      success: true,
      month: Number(month),
      year: Number(year),
      summary,
      count: payments.length,
      data: reportData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  dailyAttendanceReport,
  monthlyAttendanceReport,
  labourWiseReport,
  siteWiseReport,
  paymentReport,
};

