const Attendance = require("../models/Attendance");
const Labour = require("../models/Labour");
const LabourPayment = require("../models/LabourPayment");
const PayrollSetting = require("../models/PayrollSetting");
const SalarySlip = require("../models/SalarySlip");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const roundValue = (value, roundOffSalary = true) => {
  return roundOffSalary ? Math.round(value) : Number(value.toFixed(2));
};

const getMonthlyAttendanceSummary = async ({
  companyId,
  contractorId,
  labourId,
  month,
  year,
}) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const attendance = await Attendance.find({
    companyId,
    contractorId,
    labourId,
    attendanceDate: { $gte: startDate, $lte: endDate },
    isDeleted: false,
  }).sort({ attendanceDate: 1 });

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
    if (item.status === "HOLIDAY") holidayDays++;

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

const getPaymentSummary = async ({
  companyId,
  contractorId,
  labourId,
  month,
  year,
}) => {
  const payments = await LabourPayment.find({
    companyId,
    contractorId,
    labourId,
    month: Number(month),
    year: Number(year),
    isDeleted: false,
  }).sort({ paymentDate: 1 });

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

const calculatePayrollBreakup = ({
  basicSalary,
  overtimeAmount,
  bonus,
  incentive,
  advance,
  otherDeduction,
  payrollSetting,
}) => {
  const setting = payrollSetting || {};

  const roundOffSalary = setting.roundOffSalary !== false;

  const hra =
    setting.hraType === "FIXED"
      ? setting.hraValue || 0
      : (basicSalary * (setting.hraValue ?? 20)) / 100;

  const otherAllowance =
    setting.otherAllowanceType === "PERCENT"
      ? (basicSalary * (setting.otherAllowanceValue || 0)) / 100
      : setting.otherAllowanceValue || 0;

  const grossSalary =
    basicSalary + hra + otherAllowance + bonus + incentive + overtimeAmount;

  const pfEmployee =
    setting.isPFEnabled === false
      ? 0
      : (basicSalary * (setting.pfEmployeePercent ?? 12)) / 100;

  const esicEmployee =
    setting.isESICEnabled === false
      ? 0
      : (grossSalary * (setting.esicEmployeePercent ?? 0.75)) / 100;

  const netSalary =
    grossSalary - pfEmployee - esicEmployee - advance - otherDeduction;

  const pfEmployer =
    setting.isPFEnabled === false
      ? 0
      : (basicSalary * (setting.pfEmployerPercent ?? 13)) / 100;

  const esicEmployer =
    setting.isESICEnabled === false
      ? 0
      : (grossSalary * (setting.esicEmployerPercent ?? 3.25)) / 100;

  const ctc = grossSalary + pfEmployer + esicEmployer;

  return {
    basicSalary: roundValue(basicSalary, roundOffSalary),
    hra: roundValue(hra, roundOffSalary),
    otherAllowance: roundValue(otherAllowance, roundOffSalary),
    bonus: roundValue(bonus, roundOffSalary),
    incentive: roundValue(incentive, roundOffSalary),
    overtimeAmount: roundValue(overtimeAmount, roundOffSalary),
    grossSalary: roundValue(grossSalary, roundOffSalary),

    pfEmployee: roundValue(pfEmployee, roundOffSalary),
    esicEmployee: roundValue(esicEmployee, roundOffSalary),
    advance: roundValue(advance, roundOffSalary),
    otherDeduction: roundValue(otherDeduction, roundOffSalary),
    netSalary: roundValue(netSalary, roundOffSalary),

    pfEmployer: roundValue(pfEmployer, roundOffSalary),
    esicEmployer: roundValue(esicEmployer, roundOffSalary),
    ctc: roundValue(ctc, roundOffSalary),
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

    const payrollSetting = await PayrollSetting.findOne({
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
      const attendanceSummary = await getMonthlyAttendanceSummary({
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

      const payroll = calculatePayrollBreakup({
        basicSalary: attendanceSummary.basicSalary,
        overtimeAmount: attendanceSummary.overtimeAmount,
        bonus: paymentSummary.bonus,
        incentive: paymentSummary.incentive,
        advance: paymentSummary.advance,
        otherDeduction: paymentSummary.otherDeduction,
        payrollSetting,
      });

      const balanceAmount = payroll.netSalary - paymentSummary.paidAmount;

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

        paidAmount: paymentSummary.paidAmount,
        balanceAmount,
        status:
          paymentSummary.paidAmount <= 0
            ? "PENDING"
            : balanceAmount <= 0
            ? "PAID"
            : "PARTIAL",
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

    const payrollSetting = await PayrollSetting.findOne({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const attendanceSummary = await getMonthlyAttendanceSummary({
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

    const payroll = calculatePayrollBreakup({
      basicSalary: attendanceSummary.basicSalary,
      overtimeAmount: attendanceSummary.overtimeAmount,
      bonus: paymentSummary.bonus,
      incentive: paymentSummary.incentive,
      advance: paymentSummary.advance,
      otherDeduction: paymentSummary.otherDeduction,
      payrollSetting,
    });

    const balanceAmount = payroll.netSalary - paymentSummary.paidAmount;

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

        paidAmount: paymentSummary.paidAmount,
        balanceAmount,
        status:
          paymentSummary.paidAmount <= 0
            ? "PENDING"
            : balanceAmount <= 0
            ? "PAID"
            : "PARTIAL",

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

    const payrollSetting = await PayrollSetting.findOne({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const attendanceSummary = await getMonthlyAttendanceSummary({
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

    const payroll = calculatePayrollBreakup({
      basicSalary: attendanceSummary.basicSalary,
      overtimeAmount: attendanceSummary.overtimeAmount,
      bonus: paymentSummary.bonus,
      incentive: paymentSummary.incentive,
      advance: paymentSummary.advance,
      otherDeduction: paymentSummary.otherDeduction,
      payrollSetting,
    });

    const balanceAmount = payroll.netSalary - paymentSummary.paidAmount;

    const status =
      paymentSummary.paidAmount <= 0
        ? "PENDING"
        : balanceAmount <= 0
        ? "PAID"
        : "PARTIAL";

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

        basicSalary: payroll.basicSalary,
        hra: payroll.hra,
        otherAllowance: payroll.otherAllowance,
        bonus: payroll.bonus,
        incentive: payroll.incentive,
        overtimeAmount: payroll.overtimeAmount,
        grossSalary: payroll.grossSalary,

        pfEmployee: payroll.pfEmployee,
        esicEmployee: payroll.esicEmployee,
        advance: payroll.advance,
        otherDeduction: payroll.otherDeduction,
        netSalary: payroll.netSalary,

        pfEmployer: payroll.pfEmployer,
        esicEmployer: payroll.esicEmployer,
        ctc: payroll.ctc,

        paidAmount: paymentSummary.paidAmount,
        balanceAmount,
        status,
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

    const labours = await Labour.find({
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    });

    const generatedSlips = [];

    for (const labour of labours) {
      const payrollSetting = await PayrollSetting.findOne({
        companyId: req.user.companyId,
        contractorId,
        isDeleted: false,
      });

      const attendanceSummary = await getMonthlyAttendanceSummary({
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

      const payroll = calculatePayrollBreakup({
        basicSalary: attendanceSummary.basicSalary,
        overtimeAmount: attendanceSummary.overtimeAmount,
        bonus: paymentSummary.bonus,
        incentive: paymentSummary.incentive,
        advance: paymentSummary.advance,
        otherDeduction: paymentSummary.otherDeduction,
        payrollSetting,
      });

      const balanceAmount = payroll.netSalary - paymentSummary.paidAmount;

      const status =
        paymentSummary.paidAmount <= 0
          ? "PENDING"
          : balanceAmount <= 0
          ? "PAID"
          : "PARTIAL";

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

          basicSalary: payroll.basicSalary,
          hra: payroll.hra,
          otherAllowance: payroll.otherAllowance,
          bonus: payroll.bonus,
          incentive: payroll.incentive,
          overtimeAmount: payroll.overtimeAmount,
          grossSalary: payroll.grossSalary,

          pfEmployee: payroll.pfEmployee,
          esicEmployee: payroll.esicEmployee,
          advance: payroll.advance,
          otherDeduction: payroll.otherDeduction,
          netSalary: payroll.netSalary,

          pfEmployer: payroll.pfEmployer,
          esicEmployer: payroll.esicEmployer,
          ctc: payroll.ctc,

          paidAmount: paymentSummary.paidAmount,
          balanceAmount,
          status,
          generatedBy: req.user._id,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

      generatedSlips.push(slip);
    }

    res.status(200).json({
      success: true,
      message: "All salary slips generated successfully",
      count: generatedSlips.length,
      data: generatedSlips,
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

    res.status(201).json({
      success: true,
      message: "Salary payment added successfully",
      data: payment,
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