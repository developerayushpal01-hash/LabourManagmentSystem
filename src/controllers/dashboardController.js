const Labour = require("../models/Labour");
const Site = require("../models/Site");
const Attendance = require("../models/Attendance");
const LabourPayment = require("../models/LabourPayment");
const SalarySlip = require("../models/SalarySlip");
const LabourSite = require("../models/LabourSite");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const contractorDashboard = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const today = new Date();
    const startToday = new Date(today);
    startToday.setHours(0, 0, 0, 0);

    const endToday = new Date(today);
    endToday.setHours(23, 59, 59, 999);

    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const totalLabour = await Labour.countDocuments({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const activeLabour = await Labour.countDocuments({
      companyId: req.user.companyId,
      contractorId,
      status: "ACTIVE",
      isDeleted: false,
    });

    const activeSites = await Site.countDocuments({
      companyId: req.user.companyId,
      contractorId,
      status: "ACTIVE",
      isDeleted: false,
    });

    const todayAttendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      attendanceDate: { $gte: startToday, $lte: endToday },
      isDeleted: false,
    });

    let todayPresent = 0;
    let todayAbsent = 0;
    let todayHalfDay = 0;

    todayAttendance.forEach((item) => {
      if (item.status === "PRESENT") todayPresent++;
      if (item.status === "ABSENT") todayAbsent++;
      if (item.status === "HALF_DAY") todayHalfDay++;
    });

    const payments = await LabourPayment.find({
      companyId: req.user.companyId,
      contractorId,
      month,
      year,
      isDeleted: false,
    });

    let advance = 0;
    let salaryPaid = 0;
    let bonus = 0;
    let incentive = 0;
    let deduction = 0;

    payments.forEach((item) => {
      if (item.paymentType === "ADVANCE") advance += item.amount;
      if (item.paymentType === "SALARY") salaryPaid += item.amount;
      if (item.paymentType === "BONUS") bonus += item.amount;
      if (item.paymentType === "INCENTIVE") incentive += item.amount;
      if (item.paymentType === "DEDUCTION") deduction += item.amount;
    });

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      attendanceDate: { $gte: monthStart, $lte: monthEnd },
      isDeleted: false,
    });

    let monthlyPayable = 0;

    attendance.forEach((item) => {
      if (item.status === "PRESENT") monthlyPayable += item.wageAtThatDay;
      if (item.status === "HALF_DAY") monthlyPayable += item.wageAtThatDay / 2;
      monthlyPayable += item.overtimeAmount || 0;
    });

    const netPayable = monthlyPayable + bonus + incentive - advance - deduction;
    const pendingSalary = netPayable - salaryPaid;

    return res.status(200).json({
      success: true,
      data: {
        totalLabour,
        activeLabour,
        activeSites,
        todayPresent,
        todayAbsent,
        todayHalfDay,
        monthlyPayable,
        advance,
        bonus,
        incentive,
        deduction,
        salaryPaid,
        pendingSalary,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const attendanceChart = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const range = ["daily", "7days", "monthly", "yearly"].includes(req.query.range) ? req.query.range : "monthly";
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    if (range === "7days") startDate.setDate(startDate.getDate() - 6);
    if (range === "monthly") startDate.setDate(1);
    if (range === "yearly") {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      attendanceDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    });

    const count = {
      PRESENT: 0,
      ABSENT: 0,
      HALF_DAY: 0,
      LEAVE: 0,
      HOLIDAY: 0,
    };

    attendance.forEach((item) => {
      count[item.status] = (count[item.status] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: [
        { name: "Present", value: count.PRESENT },
        { name: "Absent", value: count.ABSENT },
        { name: "Half Day", value: count.HALF_DAY },
        { name: "Leave", value: count.LEAVE },
        { name: "Holiday", value: count.HOLIDAY },
      ],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const salaryChart = async (req, res) => {
  try {
    const { year } = req.query;
    const range = req.query.range === "monthly" ? "monthly" : "yearly";

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    const contractorId = getContractorId(req.user);

    const slips = await SalarySlip.find({
      companyId: req.user.companyId,
      contractorId,
      year: Number(year),
      isDeleted: false,
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const selectedMonths = range === "monthly" ? [months[new Date().getMonth()]] : months;
    const data = selectedMonths.map((monthName) => {
      const index = months.indexOf(monthName);
      const monthNo = index + 1;
      const monthSlips = slips.filter((slip) => slip.month === monthNo);

      return {
        month: monthName,
        netSalary: monthSlips.reduce((sum, slip) => sum + (slip.netSalary || 0), 0),
        paidSalary: monthSlips.reduce((sum, slip) => sum + (slip.paidAmount || 0), 0),
        pendingSalary: monthSlips.reduce((sum, slip) => sum + (slip.balanceAmount || 0), 0),
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const paymentChart = async (req, res) => {
  try {
    const range = ["daily", "7days", "monthly", "yearly"].includes(req.query.range) ? req.query.range : "monthly";
    const contractorId = getContractorId(req.user);
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    if (range === "7days") startDate.setDate(startDate.getDate() - 6);
    if (range === "monthly") startDate.setDate(1);
    if (range === "yearly") {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const payments = await LabourPayment.find({
      companyId: req.user.companyId,
      contractorId,
      paymentDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    });

    const summary = {
      SALARY: 0,
      ADVANCE: 0,
      BONUS: 0,
      INCENTIVE: 0,
      DEDUCTION: 0,
    };

    payments.forEach((item) => {
      summary[item.paymentType] = (summary[item.paymentType] || 0) + item.amount;
    });

    return res.status(200).json({
      success: true,
      data: [
        { name: "Salary", value: summary.SALARY },
        { name: "Advance", value: summary.ADVANCE },
        { name: "Bonus", value: summary.BONUS },
        { name: "Incentive", value: summary.INCENTIVE },
        { name: "Deduction", value: summary.DEDUCTION },
      ],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const siteLabourChart = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const sites = await Site.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const data = [];

    for (const site of sites) {
      const labourCount = await LabourSite.countDocuments({
        companyId: req.user.companyId,
        contractorId,
        siteId: site._id,
        status: "ACTIVE",
        isDeleted: false,
      });

      data.push({
        siteName: site.siteName,
        labourCount,
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  contractorDashboard,
  attendanceChart,
  salaryChart,
  paymentChart,
  siteLabourChart,
};