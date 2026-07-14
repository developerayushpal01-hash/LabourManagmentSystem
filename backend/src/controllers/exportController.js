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
    const { month, year, siteId, search = "" } = req.query;
    const monthNumber = Number(month);
    const yearNumber = Number(year);

    if (
      !Number.isInteger(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12 ||
      !Number.isInteger(yearNumber)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid month and year are required",
      });
    }

    const contractorId = getContractorId(req.user);
    const baseScope = {
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    };
    const labourFilter = { ...baseScope };

    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      const pattern = new RegExp(escapeRegex(normalizedSearch), "i");
      labourFilter.$or = [
        { name: pattern },
        { mobile: pattern },
        { labourCode: pattern },
      ];
    }

    if (siteId) {
      const selectedAssignments = await LabourSite.find({
        ...baseScope,
        siteId,
        status: "ACTIVE",
      }).select("labourId");
      labourFilter._id = {
        $in: selectedAssignments.map((assignment) => assignment.labourId),
      };
    }

    const labours = await Labour.find(labourFilter)
      .select("labourCode name mobile")
      .sort({ name: 1 });

    const labourIds = labours.map((labour) => labour._id);
    const assignments = await LabourSite.find({
      ...baseScope,
      labourId: { $in: labourIds },
      status: "ACTIVE",
    }).populate("siteId", "siteName siteCode");

    const siteByLabourId = new Map(
      assignments.map((assignment) => [
        assignment.labourId.toString(),
        assignment.siteId,
      ])
    );

    const startDate = new Date(yearNumber, monthNumber - 1, 1);
    const endDate = new Date(
      yearNumber,
      monthNumber,
      0,
      23,
      59,
      59,
      999
    );
    const attendanceFilter = {
      ...baseScope,
      labourId: { $in: labourIds },
      attendanceDate: { $gte: startDate, $lte: endDate },
    };
    if (siteId) attendanceFilter.siteId = siteId;

    const attendance = await Attendance.find(attendanceFilter).sort({
      attendanceDate: 1,
    });

    const attendanceByLabourAndDay = new Map();
    attendance.forEach((item) => {
      const day = item.attendanceDate.getUTCDate();
      attendanceByLabourAndDay.set(
        `${item.labourId.toString()}-${day}`,
        item.status
      );
    });

    const daysInMonth = new Date(
      yearNumber,
      monthNumber,
      0
    ).getDate();
    const monthName = new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
    }).format(new Date(yearNumber, monthNumber - 1, 1));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kinetic LMS";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Monthly Attendance", {
      views: [{ state: "frozen", xSplit: 4, ySplit: 6 }],
    });

    const summaryHeaders = [
      "Month Days",
      "Present",
      "Absent",
      "Half Day",
      "Leave",
      "Paid Holiday",
    ];
    const firstSummaryColumn = 5 + daysInMonth;
    const lastColumn = firstSummaryColumn + summaryHeaders.length - 1;

    worksheet.mergeCells(1, 1, 1, lastColumn);
    worksheet.getCell(1, 1).value = "KINETIC LMS - MONTHLY ATTENDANCE";
    worksheet.getCell(1, 1).font = {
      size: 18,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    worksheet.getCell(1, 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3730D4" },
    };
    worksheet.getCell(1, 1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells(2, 1, 2, lastColumn);
    worksheet.getCell(2, 1).value =
      `${monthName}${siteId ? " - Filtered Site" : " - All Sites"}`;
    worksheet.getCell(2, 1).font = { bold: true, color: { argb: "FF475569" } };
    worksheet.getCell(2, 1).alignment = { horizontal: "center" };

    worksheet.mergeCells(3, 1, 3, lastColumn);
    worksheet.getCell(3, 1).value =
      "P = Present | A = Absent | HD = Half Day | L = Leave | PH = Paid Holiday | - = Not Marked";
    worksheet.getCell(3, 1).font = {
      italic: true,
      size: 10,
      color: { argb: "FF64748B" },
    };
    worksheet.getCell(3, 1).alignment = { horizontal: "center" };

    worksheet.getCell(4, 1).value = "Generated";
    worksheet.getCell(4, 2).value = new Date();
    worksheet.getCell(4, 2).numFmt = "dd-mmm-yyyy hh:mm";

    const headerValues = [
      "Labour Code",
      "Labour Name",
      "Mobile",
      "Site",
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
      ...summaryHeaders,
    ];
    const headerRow = worksheet.getRow(6);
    headerRow.values = headerValues;
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E78" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 24;
    worksheet.getColumn(3).width = 16;
    worksheet.getColumn(4).width = 24;
    for (let day = 1; day <= daysInMonth; day++) {
      worksheet.getColumn(4 + day).width = 5;
    }
    for (let column = firstSummaryColumn; column <= lastColumn; column++) {
      worksheet.getColumn(column).width = 13;
    }

    const statusShort = {
      PRESENT: "P",
      ABSENT: "A",
      HALF_DAY: "HD",
      LEAVE: "L",
      HOLIDAY: "PH",
    };
    const statusColor = {
      PRESENT: "FF10B981",
      ABSENT: "FFEF4444",
      HALF_DAY: "FFF59E0B",
      LEAVE: "FF0EA5E9",
      HOLIDAY: "FF7C3AED",
    };
    const grand = {
      PRESENT: 0,
      ABSENT: 0,
      HALF_DAY: 0,
      LEAVE: 0,
      HOLIDAY: 0,
    };

    labours.forEach((labour) => {
      const labourId = labour._id.toString();
      const counts = {
        PRESENT: 0,
        ABSENT: 0,
        HALF_DAY: 0,
        LEAVE: 0,
        HOLIDAY: 0,
      };
      const dailyValues = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const status = attendanceByLabourAndDay.get(`${labourId}-${day}`);
        dailyValues.push(status ? statusShort[status] : "-");
        if (status) {
          counts[status]++;
          grand[status]++;
        }
      }

      const site = siteByLabourId.get(labourId);
      const row = worksheet.addRow([
        labour.labourCode,
        labour.name,
        labour.mobile,
        site?.siteName || "Not assigned",
        ...dailyValues,
        daysInMonth,
        counts.PRESENT,
        counts.ABSENT,
        counts.HALF_DAY,
        counts.LEAVE,
        counts.HOLIDAY,
      ]);
      row.height = 24;
      row.eachCell((cell, columnNumber) => {
        cell.alignment = {
          horizontal: columnNumber <= 4 ? "left" : "center",
          vertical: "middle",
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });

      for (let day = 1; day <= daysInMonth; day++) {
        const status = attendanceByLabourAndDay.get(`${labourId}-${day}`);
        const cell = row.getCell(4 + day);
        if (status) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: statusColor[status] },
          };
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
        } else {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5F9" },
          };
          cell.font = { color: { argb: "FF94A3B8" } };
        }
      }
    });

    const totalRow = worksheet.addRow([
      "",
      "ALL LABOURS TOTAL",
      "",
      "",
      ...Array(daysInMonth).fill(""),
      daysInMonth,
      grand.PRESENT,
      grand.ABSENT,
      grand.HALF_DAY,
      grand.LEAVE,
      grand.HOLIDAY,
    ]);
    totalRow.font = { bold: true, color: { argb: "FF312E81" } };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E7FF" },
    };
    totalRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF818CF8" } },
        bottom: { style: "thin", color: { argb: "FF818CF8" } },
      };
    });

    worksheet.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: 6, column: lastColumn },
    };
    worksheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Attendance_${yearNumber}_${String(monthNumber).padStart(2, "0")}.xlsx`
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
