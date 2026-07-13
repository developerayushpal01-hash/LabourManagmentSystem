const ExcelJS = require("exceljs");
const Attendance = require("../models/Attendance");
const Labour = require("../models/Labour");
const LabourPayment = require("../models/LabourPayment");
const LabourSite = require("../models/LabourSite");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR"
    ? user._id
    : user.parentUserId;
};

const escapeRegex = (value) =>
  value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");

const exportLabours = async (req, res) => {
  try {
    const { siteId, skillId, status, search = "" } = req.query;
    const contractorId = getContractorId(req.user);
    const baseScope = {
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    };
    const labourFilter = { ...baseScope };

    if (skillId) labourFilter.skillId = skillId;
    if (status && status !== "ALL") {
      if (!["ACTIVE", "INACTIVE", "BLOCKED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid labour status filter",
        });
      }
      labourFilter.status = status;
    }

    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      const pattern = new RegExp(escapeRegex(normalizedSearch), "i");
      labourFilter.$or = [
        { name: pattern },
        { mobile: pattern },
        { labourCode: pattern },
        { address: pattern },
      ];
    }

    if (siteId) {
      const siteAssignments = await LabourSite.find({
        ...baseScope,
        siteId,
        status: "ACTIVE",
      }).select("labourId");
      labourFilter._id = {
        $in: siteAssignments.map((assignment) => assignment.labourId),
      };
    }

    const labours = await Labour.find(labourFilter)
      .populate("skillId", "skillName skillCode defaultDailyWage")
      .sort({ name: 1 });

    const assignments = await LabourSite.find({
      ...baseScope,
      labourId: { $in: labours.map((labour) => labour._id) },
      status: "ACTIVE",
    }).populate("siteId", "siteName siteCode");

    const siteByLabourId = new Map(
      assignments.map((assignment) => [
        assignment.labourId.toString(),
        assignment.siteId,
      ])
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "LMS";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Labours");

    worksheet.columns = [
      { header: "Labour Code", key: "labourCode", width: 18 },
      { header: "Name", key: "name", width: 25 },
      { header: "Mobile", key: "mobile", width: 18 },
      { header: "Site", key: "site", width: 25 },
      { header: "Site Code", key: "siteCode", width: 16 },
      { header: "Skill", key: "skill", width: 22 },
      { header: "Gender", key: "gender", width: 12 },
      { header: "Status", key: "status", width: 14 },
      { header: "Daily Wage", key: "dailyWage", width: 16 },
      { header: "Address", key: "address", width: 35 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    labours.forEach((labour) => {
      const site = siteByLabourId.get(labour._id.toString());
      worksheet.addRow({
        labourCode: labour.labourCode,
        name: labour.name,
        mobile: labour.mobile,
        site: site?.siteName || "",
        siteCode: site?.siteCode || "",
        skill: labour.skillId?.skillName || "",
        gender: labour.gender,
        status: labour.status,
        dailyWage:
          labour.dailyWage ?? labour.skillId?.defaultDailyWage ?? 0,
        address: labour.address || "",
      });
    });

    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = { from: "A1", to: "J1" };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Labours_Filtered.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const exportMonthlyAttendance = async (req, res) => {
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

    const attendance = await Attendance.find({
      companyId: req.user.companyId,
      contractorId,
      attendanceDate: {
        $gte: startDate,
        $lte: endDate,
      },
      isDeleted: false,
    })
      .populate("labourId", "employeeCode name mobile")
      .populate("skillId", "skillName")
      .populate("siteId", "siteName siteCode")
      .sort({ attendanceDate: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "LMS";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Attendance Report");

    // ==========================
    // Title
    // ==========================

    worksheet.mergeCells("A1:K1");
    worksheet.getCell("A1").value = "LABOUR MANAGEMENT SYSTEM";
    worksheet.getCell("A1").font = {
      size: 18,
      bold: true,
    };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
    };

    worksheet.mergeCells("A2:K2");
    worksheet.getCell("A2").value = "MONTHLY ATTENDANCE REPORT";
    worksheet.getCell("A2").font = {
      size: 14,
      bold: true,
    };
    worksheet.getCell("A2").alignment = {
      horizontal: "center",
    };

    worksheet.getCell("A4").value = "Month";
    worksheet.getCell("B4").value = month;

    worksheet.getCell("D4").value = "Year";
    worksheet.getCell("E4").value = year;

    worksheet.getCell("G4").value = "Generated";
    worksheet.getCell("H4").value = new Date().toLocaleString();

    // ==========================
    // Columns
    // ==========================

    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Employee Code", key: "employeeCode", width: 18 },
      { header: "Labour Name", key: "labourName", width: 25 },
      { header: "Mobile", key: "mobile", width: 18 },
      { header: "Skill", key: "skill", width: 20 },
      { header: "Site", key: "site", width: 25 },
      { header: "Status", key: "status", width: 15 },
      { header: "Daily Wage", key: "wage", width: 15 },
      { header: "OT Hours", key: "otHours", width: 12 },
      { header: "OT Amount", key: "otAmount", width: 15 },
      { header: "Total Amount", key: "totalAmount", width: 18 },
      { header: "Remarks", key: "remarks", width: 30 },
    ];

    worksheet.spliceRows(5, 1);

    worksheet.insertRow(6, [
      "Date",
      "Employee Code",
      "Labour Name",
      "Mobile",
      "Skill",
      "Site",
      "Status",
      "Daily Wage",
      "OT Hours",
      "OT Amount",
      "Total Amount",
      "Remarks",
    ]);

    const headerRow = worksheet.getRow(6);

    headerRow.font = {
      bold: true,
      color: {
        argb: "FFFFFF",
      },
    };

    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "1F4E78",
      },
    };

    let grandTotal = 0;

    attendance.forEach((item) => {
      let totalAmount = 0;

      if (item.status === "PRESENT") {
        totalAmount += item.wageAtThatDay;
      }

      if (item.status === "HALF_DAY") {
        totalAmount += item.wageAtThatDay / 2;
      }

      totalAmount += item.overtimeAmount || 0;

      grandTotal += totalAmount;

      worksheet.addRow({
        date: item.attendanceDate.toISOString().split("T")[0],

        employeeCode:
          item.labourId?.employeeCode || "",

        labourName:
          item.labourId?.name || "",

        mobile:
          item.labourId?.mobile || "",

        skill:
          item.skillId?.skillName || "",

        site:
          item.siteId?.siteName || "",

        status:
          item.status,

        wage:
          item.wageAtThatDay,

        otHours:
          item.overtimeHours || 0,

        otAmount:
          item.overtimeAmount || 0,

        totalAmount,

        remarks:
          item.remarks || "",
      });
    });

    // ==========================
    // Grand Total
    // ==========================

    const totalRow = worksheet.addRow([]);

    totalRow.getCell(10).value = "Grand Total";

    totalRow.getCell(11).value = grandTotal;

    totalRow.font = {
      bold: true,
    };

    // ==========================
    // Freeze
    // ==========================

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 6,
      },
    ];

    worksheet.autoFilter = {
      from: "A6",
      to: "L6",
    };

    const fileName = `Attendance_${month}_${year}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const exportSalaryReport = async (req, res) => {
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
    }).sort({ name: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Salary Report");

    worksheet.mergeCells("A1:N1");
    worksheet.getCell("A1").value = "LABOUR MANAGEMENT SYSTEM";
    worksheet.getCell("A1").font = { size: 18, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:N2");
    worksheet.getCell("A2").value = "MONTHLY SALARY REPORT";
    worksheet.getCell("A2").font = { size: 14, bold: true };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    worksheet.getCell("A4").value = "Month";
    worksheet.getCell("B4").value = month;
    worksheet.getCell("D4").value = "Year";
    worksheet.getCell("E4").value = year;
    worksheet.getCell("G4").value = "Generated";
    worksheet.getCell("H4").value = new Date().toLocaleString();

    worksheet.columns = [
      { header: "Employee Code", key: "employeeCode", width: 18 },
      { header: "Labour Name", key: "labourName", width: 25 },
      { header: "Mobile", key: "mobile", width: 18 },
      { header: "Present", key: "presentDays", width: 12 },
      { header: "Half Day", key: "halfDays", width: 12 },
      { header: "Absent", key: "absentDays", width: 12 },
      { header: "Leave", key: "leaveDays", width: 12 },
      { header: "Holiday", key: "holidayDays", width: 12 },
      { header: "Overtime", key: "overtimeAmount", width: 15 },
      { header: "Payable", key: "payableAmount", width: 15 },
      { header: "Advance", key: "advanceAmount", width: 15 },
      { header: "Bonus", key: "bonusAmount", width: 15 },
      { header: "Deduction", key: "deductionAmount", width: 15 },
      { header: "Net Payable", key: "netPayable", width: 15 },
      { header: "Paid", key: "paidAmount", width: 15 },
      { header: "Balance", key: "balanceAmount", width: 15 },
    ];

    worksheet.spliceRows(5, 1);

    worksheet.insertRow(6, [
      "Employee Code",
      "Labour Name",
      "Mobile",
      "Present",
      "Half Day",
      "Absent",
      "Leave",
      "Holiday",
      "Overtime",
      "Payable",
      "Advance",
      "Bonus",
      "Deduction",
      "Net Payable",
      "Paid",
      "Balance",
    ]);

    const headerRow = worksheet.getRow(6);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1F4E78" },
    };

    let grandPayable = 0;
    let grandAdvance = 0;
    let grandBonus = 0;
    let grandDeduction = 0;
    let grandNetPayable = 0;
    let grandPaid = 0;
    let grandBalance = 0;

    for (const labour of labours) {
      const attendance = await Attendance.find({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        attendanceDate: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      });

      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;
      let overtimeAmount = 0;
      let payableAmount = 0;

      attendance.forEach((item) => {
        if (item.status === "PRESENT") {
          presentDays++;
          payableAmount += item.wageAtThatDay;
        }

        if (item.status === "HALF_DAY") {
          halfDays++;
          payableAmount += item.wageAtThatDay / 2;
        }

        if (item.status === "ABSENT") absentDays++;
        if (item.status === "LEAVE") leaveDays++;
        if (item.status === "HOLIDAY") holidayDays++;

        overtimeAmount += item.overtimeAmount || 0;
      });

      payableAmount += overtimeAmount;

      const payments = await LabourPayment.find({
        companyId: req.user.companyId,
        contractorId,
        labourId: labour._id,
        month: Number(month),
        year: Number(year),
        isDeleted: false,
      });

      let advanceAmount = 0;
      let bonusAmount = 0;
      let deductionAmount = 0;
      let paidAmount = 0;

      payments.forEach((item) => {
        if (item.paymentType === "ADVANCE") advanceAmount += item.amount;
        if (item.paymentType === "BONUS") bonusAmount += item.amount;
        if (item.paymentType === "DEDUCTION") deductionAmount += item.amount;
        if (item.paymentType === "SALARY") paidAmount += item.amount;
      });

      const netPayable =
        payableAmount + bonusAmount - advanceAmount - deductionAmount;

      const balanceAmount = netPayable - paidAmount;

      grandPayable += payableAmount;
      grandAdvance += advanceAmount;
      grandBonus += bonusAmount;
      grandDeduction += deductionAmount;
      grandNetPayable += netPayable;
      grandPaid += paidAmount;
      grandBalance += balanceAmount;

      worksheet.addRow({
        employeeCode: labour.employeeCode || "",
        labourName: labour.name || "",
        mobile: labour.mobile || "",
        presentDays,
        halfDays,
        absentDays,
        leaveDays,
        holidayDays,
        overtimeAmount,
        payableAmount,
        advanceAmount,
        bonusAmount,
        deductionAmount,
        netPayable,
        paidAmount,
        balanceAmount,
      });
    }

    const totalRow = worksheet.addRow({
      employeeCode: "",
      labourName: "Grand Total",
      overtimeAmount: grandPayable,
      payableAmount: grandPayable,
      advanceAmount: grandAdvance,
      bonusAmount: grandBonus,
      deductionAmount: grandDeduction,
      netPayable: grandNetPayable,
      paidAmount: grandPaid,
      balanceAmount: grandBalance,
    });

    totalRow.font = { bold: true };

    worksheet.views = [{ state: "frozen", ySplit: 6 }];
    worksheet.autoFilter = { from: "A6", to: "P6" };

    const fileName = `Salary_${month}_${year}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  exportLabours,
  exportMonthlyAttendance,
  exportSalaryReport
};
