const Attendance = require("../models/Attendance");
const Labour = require("../models/Labour");
const LabourPayment = require("../models/LabourPayment");
const PayrollSetting = require("../models/PayrollSetting");
const SalarySlip = require("../models/SalarySlip");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const roundValue = (value, roundOff = true) => {
  return roundOff ? Math.round(value) : Number(value.toFixed(2));
};

const getAttendanceSummary = async ({ companyId, contractorId, labourId, month, year }) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const attendance = await Attendance.find({
    companyId,
    contractorId,
    labourId,
    attendanceDate: { $gte: startDate, $lte: endDate },
    isDeleted: false,
  });

  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let basicSalary = 0;
  let overtimeAmount = 0;

  attendance.forEach((item) => {
    if (item.status === "PRESENT") {
      presentDays++;
      basicSalary += item.wageAtThatDay;
    }

    if (item.status === "HALF_DAY") {
      halfDays++;
      basicSalary += item.wageAtThatDay / 2;
    }

    if (item.status === "ABSENT") absentDays++;
    if (item.status === "LEAVE") leaveDays++;
    if (item.status === "HOLIDAY") {
      holidayDays++;
      basicSalary += item.wageAtThatDay;
    }

    overtimeAmount += item.overtimeAmount || 0;
  });

  return {
    attendance,
    presentDays,
    halfDays,
    absentDays,
    leaveDays,
    holidayDays,
    basicSalary,
    overtimeAmount,
  };
};

const getPaymentSummary = async ({ companyId, contractorId, labourId, month, year }) => {
  const payments = await LabourPayment.find({
    companyId,
    contractorId,
    labourId,
    month: Number(month),
    year: Number(year),
    isDeleted: false,
  });

  let paidAmount = 0;
  let advance = 0;
  let bonus = 0;
  let incentive = 0;
  let otherDeduction = 0;

  payments.forEach((item) => {
    if (item.paymentType === "SALARY") paidAmount += item.amount;
    if (item.paymentType === "ADVANCE") advance += item.amount;
    if (item.paymentType === "BONUS") bonus += item.amount;
    if (item.paymentType === "INCENTIVE") incentive += item.amount;
    if (item.paymentType === "DEDUCTION") otherDeduction += item.amount;
  });

  return {
    payments,
    paidAmount,
    advance,
    bonus,
    incentive,
    otherDeduction,
  };
};

const calculatePayroll = ({ attendanceSummary, paymentSummary, setting }) => {
  const payrollSetting = setting || {};
  const roundOff = payrollSetting.roundOffSalary !== false;

  const basicSalary = attendanceSummary.basicSalary;
  const overtimeAmount = attendanceSummary.overtimeAmount;

  const hra =
    payrollSetting.hraType === "FIXED"
      ? payrollSetting.hraValue || 0
      : (basicSalary * (payrollSetting.hraValue ?? 20)) / 100;

  const otherAllowance =
    payrollSetting.otherAllowanceType === "PERCENT"
      ? (basicSalary * (payrollSetting.otherAllowanceValue || 0)) / 100
      : payrollSetting.otherAllowanceValue || 0;

  const grossSalary =
    basicSalary +
    hra +
    otherAllowance +
    paymentSummary.bonus +
    paymentSummary.incentive +
    overtimeAmount;

  const pfEmployee =
    payrollSetting.isPFEnabled === false
      ? 0
      : (basicSalary * (payrollSetting.pfEmployeePercent ?? 12)) / 100;

  const esicEmployee =
    payrollSetting.isESICEnabled === false
      ? 0
      : (grossSalary * (payrollSetting.esicEmployeePercent ?? 0.75)) / 100;

  const netSalary =
    grossSalary -
    pfEmployee -
    esicEmployee -
    paymentSummary.advance -
    paymentSummary.otherDeduction;

  const pfEmployer =
    payrollSetting.isPFEnabled === false
      ? 0
      : (basicSalary * (payrollSetting.pfEmployerPercent ?? 13)) / 100;

  const esicEmployer =
    payrollSetting.isESICEnabled === false
      ? 0
      : (grossSalary * (payrollSetting.esicEmployerPercent ?? 3.25)) / 100;

  const ctc = grossSalary + pfEmployer + esicEmployer;

  const balanceAmount = netSalary - paymentSummary.paidAmount;

  const status =
    paymentSummary.paidAmount <= 0
      ? "PENDING"
      : balanceAmount <= 0
      ? "PAID"
      : "PARTIAL";

  return {
    basicSalary: roundValue(basicSalary, roundOff),
    hra: roundValue(hra, roundOff),
    otherAllowance: roundValue(otherAllowance, roundOff),
    bonus: roundValue(paymentSummary.bonus, roundOff),
    incentive: roundValue(paymentSummary.incentive, roundOff),
    overtimeAmount: roundValue(overtimeAmount, roundOff),
    grossSalary: roundValue(grossSalary, roundOff),

    pfEmployee: roundValue(pfEmployee, roundOff),
    esicEmployee: roundValue(esicEmployee, roundOff),
    advance: roundValue(paymentSummary.advance, roundOff),
    otherDeduction: roundValue(paymentSummary.otherDeduction, roundOff),
    netSalary: roundValue(netSalary, roundOff),

    pfEmployer: roundValue(pfEmployer, roundOff),
    esicEmployer: roundValue(esicEmployer, roundOff),
    ctc: roundValue(ctc, roundOff),

    paidAmount: roundValue(paymentSummary.paidAmount, roundOff),
    balanceAmount: roundValue(balanceAmount, roundOff),
    status,
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

    const setting = await PayrollSetting.findOne({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const labours = await Labour.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    }).sort({ name: 1 });

    const result = [];

    for (const labour of labours) {
      const attendanceSummary = await getAttendanceSummary({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        month: Number(month),
        year: Number(year),
      });

      const paymentSummary = await getPaymentSummary({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        month: Number(month),
        year: Number(year),
      });

      const payroll = calculatePayroll({
        attendanceSummary,
        paymentSummary,
        setting,
      });

      result.push({
        labourId: labour._id,
        employeeCode: labour.employeeCode,
        name: labour.name,
        mobile: labour.mobile,
        month: Number(month),
        year: Number(year),

        presentDays: attendanceSummary.presentDays,
        halfDays: attendanceSummary.halfDays,
        absentDays: attendanceSummary.absentDays,
        leaveDays: attendanceSummary.leaveDays,
        holidayDays: attendanceSummary.holidayDays,

        ...payroll,
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

    const setting = await PayrollSetting.findOne({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const attendanceSummary = await getAttendanceSummary({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
    });

    const paymentSummary = await getPaymentSummary({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
    });

    const payroll = calculatePayroll({
      attendanceSummary,
      paymentSummary,
      setting,
    });

    res.status(200).json({
      success: true,
      data: {
        labourId: labour._id,
        employeeCode: labour.employeeCode,
        name: labour.name,
        mobile: labour.mobile,
        month: Number(month),
        year: Number(year),

        presentDays: attendanceSummary.presentDays,
        halfDays: attendanceSummary.halfDays,
        absentDays: attendanceSummary.absentDays,
        leaveDays: attendanceSummary.leaveDays,
        holidayDays: attendanceSummary.holidayDays,

        ...payroll,

        attendance: attendanceSummary.attendance,
        payments: paymentSummary.payments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const generateSalarySlip = async (req, res) => {
  try {
    const { labourId, month, year } = req.body;

    if (!labourId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Labour, month and year are required",
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

    const setting = await PayrollSetting.findOne({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const attendanceSummary = await getAttendanceSummary({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
    });

    const paymentSummary = await getPaymentSummary({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
    });

    const payroll = calculatePayroll({
      attendanceSummary,
      paymentSummary,
      setting,
    });

    const slip = await SalarySlip.findOneAndUpdate(
      {
        companyId: req.user.companyId,
        contractorId,
        labourId,
        month: Number(month),
        year: Number(year),
        isDeleted: false,
      },
      {
        companyId: req.user.companyId,
        contractorId,
        labourId,
        month: Number(month),
        year: Number(year),
        ...payroll,
        generatedBy: req.user._id,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Salary slip generated successfully",
      data: slip,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const generateAllSalarySlips = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const contractorId = getContractorId(req.user);

    const setting = await PayrollSetting.findOne({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const labours = await Labour.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const slips = [];

    for (const labour of labours) {
      const attendanceSummary = await getAttendanceSummary({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        month: Number(month),
        year: Number(year),
      });

      const paymentSummary = await getPaymentSummary({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        month: Number(month),
        year: Number(year),
      });

      const payroll = calculatePayroll({
        attendanceSummary,
        paymentSummary,
        setting,
      });

      const slip = await SalarySlip.findOneAndUpdate(
        {
          companyId: req.user.companyId,
          contractorId,
          labourId: labour._id,
          month: Number(month),
          year: Number(year),
          isDeleted: false,
        },
        {
          companyId: req.user.companyId,
          contractorId,
          labourId: labour._id,
          month: Number(month),
          year: Number(year),
          ...payroll,
          generatedBy: req.user._id,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

      slips.push(slip);
    }

    res.status(200).json({
      success: true,
      message: "All salary slips generated successfully",
      count: slips.length,
      data: slips,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const paySalary = async (req, res) => {
  try {
    const { labourId, month, year, paidAmount, paymentMode, remarks } = req.body;

    if (!labourId || !month || !year || !paidAmount) {
      return res.status(400).json({
        success: false,
        message: "Labour, month, year and paid amount are required",
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

    const payment = await LabourPayment.create({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month,
      year,
      amount: paidAmount,
      paymentType: "SALARY",
      paymentMode,
      remarks,
      createdBy: req.user._id,
    });

    const totalSalaryPaid = await LabourPayment.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          contractorId,
          labourId: labour._id,
          month: Number(month),
          year: Number(year),
          paymentType: "SALARY",
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const paidTotal = totalSalaryPaid[0]?.total || 0;

    const slip = await SalarySlip.findOne({
      companyId: req.user.companyId,
      contractorId,
      labourId,
      month: Number(month),
      year: Number(year),
      isDeleted: false,
    });

    if (slip) {
      slip.paidAmount = paidTotal;
      slip.balanceAmount = slip.netSalary - paidTotal;
      slip.status =
        paidTotal <= 0 ? "PENDING" : slip.balanceAmount <= 0 ? "PAID" : "PARTIAL";

      await slip.save();
    }

    res.status(201).json({
      success: true,
      message: "Salary payment added successfully",
      data: {
        payment,
        salarySlip: slip || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  calculateSalary,
  calculateLabourSalary,
  generateSalarySlip,
  generateAllSalarySlips,
  paySalary,
};