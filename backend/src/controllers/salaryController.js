const Attendance = require("../models/Attendance");
const Labour = require("../models/Labour");
const LabourPayment = require("../models/LabourPayment");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const getSalarySummary = (attendance) => {
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;

  let attendanceSalary = 0;
  let overtimeAmount = 0;

  attendance.forEach((item) => {
    const wage = item.wageAtThatDay || 0;
    const overtime = item.overtimeAmount || 0;

    if (item.status === "PRESENT") {
      presentDays += 1;
      attendanceSalary += wage;
    }

    if (item.status === "HALF_DAY") {
      halfDays += 1;
      attendanceSalary += wage / 2;
    }

    if (item.status === "ABSENT") absentDays += 1;
    if (item.status === "LEAVE") leaveDays += 1;
    if (item.status === "HOLIDAY") holidayDays += 1;

    overtimeAmount += overtime;
  });

  const payableAmount = attendanceSalary + overtimeAmount;

  return {
    presentDays,
    halfDays,
    absentDays,
    leaveDays,
    holidayDays,
    attendanceSalary,
    overtimeAmount,
    payableAmount,
  };
};

const getPaymentSummary = (payments) => {
  let paidAmount = 0;
  let advanceAmount = 0;
  let bonusAmount = 0;
  let deductionAmount = 0;

  payments.forEach((item) => {
    const amount = item.amount || 0;

    if (item.paymentType === "SALARY") paidAmount += amount;
    if (item.paymentType === "ADVANCE") advanceAmount += amount;
    if (item.paymentType === "BONUS") bonusAmount += amount;
    if (item.paymentType === "DEDUCTION") deductionAmount += amount;
  });

  return {
    paidAmount,
    advanceAmount,
    bonusAmount,
    deductionAmount,
  };
};

const calculateSalary = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const contractorId = getContractorId(req.user);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const labours = await Labour.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const result = [];

    for (const labour of labours) {
      const attendance = await Attendance.find({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        attendanceDate: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      });

      const salarySummary = getSalarySummary(attendance);

      const payments = await LabourPayment.find({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        month: Number(month),
        year: Number(year),
        isDeleted: false,
      });

      const paymentSummary = getPaymentSummary(payments);

      const netPayable =
        salarySummary.payableAmount +
        paymentSummary.bonusAmount -
        paymentSummary.advanceAmount -
        paymentSummary.deductionAmount;

      const balanceAmount = netPayable - paymentSummary.paidAmount;

      result.push({
        labourId: labour._id,
        name: labour.name,
        mobile: labour.mobile,
        month: Number(month),
        year: Number(year),

        presentDays: salarySummary.presentDays,
        halfDays: salarySummary.halfDays,
        absentDays: salarySummary.absentDays,
        leaveDays: salarySummary.leaveDays,
        holidayDays: salarySummary.holidayDays,

        attendanceSalary: salarySummary.attendanceSalary,
        overtimeAmount: salarySummary.overtimeAmount,
        payableAmount: salarySummary.payableAmount,

        advanceAmount: paymentSummary.advanceAmount,
        bonusAmount: paymentSummary.bonusAmount,
        deductionAmount: paymentSummary.deductionAmount,

        netPayable,
        paidAmount: paymentSummary.paidAmount,
        balanceAmount,
      });
    }

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const calculateLabourSalary = async (req, res) => {
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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      attendanceDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    }).sort({ attendanceDate: 1 });

    const salarySummary = getSalarySummary(attendance);

    const payments = await LabourPayment.find({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
      isDeleted: false,
    }).sort({ paymentDate: 1 });

    const paymentSummary = getPaymentSummary(payments);

    const netPayable =
      salarySummary.payableAmount +
      paymentSummary.bonusAmount -
      paymentSummary.advanceAmount -
      paymentSummary.deductionAmount;

    const balanceAmount = netPayable - paymentSummary.paidAmount;

    res.status(200).json({
      success: true,
      data: {
        labourId: labour._id,
        name: labour.name,
        mobile: labour.mobile,
        month: Number(month),
        year: Number(year),

        presentDays: salarySummary.presentDays,
        halfDays: salarySummary.halfDays,
        absentDays: salarySummary.absentDays,
        leaveDays: salarySummary.leaveDays,
        holidayDays: salarySummary.holidayDays,

        attendanceSalary: salarySummary.attendanceSalary,
        overtimeAmount: salarySummary.overtimeAmount,
        payableAmount: salarySummary.payableAmount,

        advanceAmount: paymentSummary.advanceAmount,
        bonusAmount: paymentSummary.bonusAmount,
        deductionAmount: paymentSummary.deductionAmount,

        netPayable,
        paidAmount: paymentSummary.paidAmount,
        balanceAmount,

        attendance,
        payments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const paySalary = async (req, res) => {
  try {
    const {
      labourId,
      month,
      year,
      paidAmount,
      paymentMode,
      remarks,
    } = req.body;

    if (!labourId || !month || !year || !paidAmount) {
      return res.status(400).json({
        success: false,
        message: "Labour, month, year and paid amount are required",
      });
    }

    if (Number(paidAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Paid amount must be greater than 0",
      });
    }

    const contractorId = getContractorId(req.user);

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

    // Attendance
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      attendanceDate: {
        $gte: startDate,
        $lte: endDate,
      },
      isDeleted: false,
    });

    const salarySummary = getSalarySummary(attendance);

    // Previous Payments
    const payments = await LabourPayment.find({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
      isDeleted: false,
    });

    const paymentSummary = getPaymentSummary(payments);

    const netPayable =
      salarySummary.payableAmount +
      paymentSummary.bonusAmount -
      paymentSummary.advanceAmount -
      paymentSummary.deductionAmount;

    const balanceAmount = netPayable - paymentSummary.paidAmount;

    // Validation
    if (Number(paidAmount) > balanceAmount) {
      return res.status(400).json({
        success: false,
        message: `You can pay a maximum of ₹${balanceAmount}.`,
      });
    }

    // Create Payment
    const payment = await LabourPayment.create({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
      amount: Number(paidAmount),
      paymentType: "SALARY",
      paymentMode,
      remarks,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Salary payment added successfully",
      data: payment,
      remainingBalance: balanceAmount - Number(paidAmount),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  calculateSalary,
  calculateLabourSalary,
  paySalary,
};