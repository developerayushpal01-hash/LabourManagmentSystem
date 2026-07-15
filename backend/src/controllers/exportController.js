const ExcelJS = require("exceljs");
const Attendance = require("../models/Attendance");
const Labour = require("../models/Labour");
const LabourPayment = require("../models/LabourPayment");
const LabourSite = require("../models/LabourSite");
const SalarySlip = require("../models/SalarySlip");

const PayrollSetting = require("../models/PayrollSetting");
const SalaryPayment = require("../models/SalaryPayment");
const { calculateSalary } = require("../services/payrollCalculationService");

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
    const { month, year, siteId, status, search = "" } = req.query;
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12 || !Number.isInteger(yearNumber)) return res.status(400).json({ success: false, message: "Valid month and year are required" });
    const contractorId = getContractorId(req.user);
    const baseScope = { companyId: req.user.companyId, contractorId, isDeleted: false };
    const labourFilter = { ...baseScope };
    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      const expression = new RegExp(escapeRegex(normalizedSearch), "i");
      labourFilter.$or = [{ labourCode: expression }, { name: expression }, { mobile: expression }];
    }
    if (siteId) {
      const assignments = await LabourSite.find({ ...baseScope, siteId, status: "ACTIVE" }).select("labourId");
      labourFilter._id = { $in: assignments.map((assignment) => assignment.labourId) };
    }
    const labourIds = await Labour.find(labourFilter).distinct("_id");
    const salaryFilter = { ...baseScope, month: monthNumber, year: yearNumber, labourId: { $in: labourIds } };
    if (status) salaryFilter.status = status;
    let salaries = await SalarySlip.find(salaryFilter)
      .populate("labourId", "labourCode name mobile").populate("skillId", "skillName").sort({ createdAt: 1 }).lean();
    if (!status || status === "DRAFT") {
      const exportedIds = new Set(salaries.map((salary) => salary.labourId?._id?.toString() || salary.labourId?.toString()));
      const missingLabours = await Labour.find({ ...labourFilter, _id: { $in: labourIds.filter((id) => !exportedIds.has(id.toString())) } }).populate("skillId").lean();
      const setting = await PayrollSetting.findOne(baseScope).lean() || {};
      const startDate = new Date(yearNumber, monthNumber - 1, 1);
      const endDate = new Date(yearNumber, monthNumber, 0, 23, 59, 59, 999);
      for (const labour of missingLabours) {
        if (!labour.skillId || labour.status !== "ACTIVE") continue;
        const [attendanceRecords, labourPayments, salaryPayments] = await Promise.all([
          Attendance.find({ ...baseScope, labourId: labour._id, attendanceDate: { $gte: startDate, $lte: endDate } }).lean(),
          LabourPayment.find({ ...baseScope, labourId: labour._id, month: monthNumber, year: yearNumber }).lean(),
          SalaryPayment.find({ ...baseScope, labourId: labour._id, month: monthNumber, year: yearNumber }).lean(),
        ]);
        const total = (records, field = "amount") => records.reduce((sum, item) => sum + Number(item[field] || 0), 0);
        const result = calculateSalary({
          labour, skill: labour.skillId, attendanceRecords, payrollSetting: setting,
          bonus: total(labourPayments.filter((item) => item.paymentType === "BONUS")),
          incentive: total(labourPayments.filter((item) => item.paymentType === "INCENTIVE")),
          advance: total(labourPayments.filter((item) => item.paymentType === "ADVANCE" && item.isAdjusted !== true)),
          otherDeduction: total(labourPayments.filter((item) => item.paymentType === "DEDUCTION")),
          paidAmount: total(labourPayments.filter((item) => item.paymentType === "SALARY")) + total(salaryPayments, "paidAmount"),
          salaryCycleDays: setting.salaryCycle === "FIXED_30_DAYS" ? 30 : new Date(yearNumber, monthNumber, 0).getDate(),
          isFinalized: false,
        });
        salaries.push({ labourId: labour, skillId: labour.skillId, month: monthNumber, year: yearNumber, ...result });
      }
    }
    if (!salaries.length) return res.status(404).json({ success: false, message: "No salary records found for the selected filters." });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Salary Report");
    const headers = ["SR. NO.", "Labour Code", "Labour Name", "Mobile", "Skill", "Month", "Year", "Present Days", "Half Days", "Absent Days", "Leave Days", "Holiday Days", "Weekly Off", "Payable Days", "Daily Wage", "Wage Basis", "Basic", "HRA", "Allowance", "Bonus", "Incentive", "Overtime Hours", "Overtime Rate", "Overtime", "Gross", "Employee PF", "Employee ESIC", "Advance", "Other Deduction", "Total Deduction", "Net Salary", "Employer PF", "Employer ESIC", "CTC", "Paid", "Balance", "Excess Paid", "Status"];
    worksheet.addRow(headers);
    const header = worksheet.getRow(1); header.height = 30; header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } }; header.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    salaries.forEach((salary, index) => { const a=salary.attendanceSummary || {}; worksheet.addRow([index+1, salary.labourId?.labourCode || "", salary.labourId?.name || "", salary.labourId?.mobile || "", salary.skillId?.skillName || "", salary.month, salary.year, a.presentDays||0, a.halfDays||0, a.absentDays||0, a.leaveDays||0, a.holidayDays||0, a.weeklyOffDays||0, a.payableDays||0, salary.dailyWage||0, salary.wageBasis, salary.basic??salary.basicSalary??0, salary.hra||0, salary.allowance??salary.otherAllowance??0, salary.bonus||0, salary.incentive||0, salary.overtimeHours||0, salary.overtimeRate||0, salary.overtime??salary.overtimeAmount??0, salary.grossSalary||0, salary.employeePF??salary.pfEmployee??0, salary.employeeESIC??salary.esicEmployee??0, salary.advance||0, salary.otherDeduction||0, salary.totalDeduction||0, salary.finalNetSalary??salary.netSalary??0, salary.employerPF??salary.pfEmployer??0, salary.employerESIC??salary.esicEmployer??0, salary.ctc||0, salary.paidAmount||0, salary.balanceAmount||0, salary.excessPaidAmount||0, salary.status]); });
    worksheet.columns.forEach((column, index) => { column.width = index >= 1 && index <= 4 ? 20 : 14; });
    worksheet.eachRow((row, rowNumber) => { if(rowNumber > 1) row.eachCell((cell, columnNumber) => { if(columnNumber !== 2 && columnNumber !== 3 && columnNumber !== 4 && columnNumber !== 5 && columnNumber !== 16 && columnNumber !== 38 && typeof cell.value === "number") cell.numFmt = "0.00"; }); });
    worksheet.views = [{ state: "frozen", ySplit: 1 }]; worksheet.autoFilter = { from: "A1", to: "AL1" };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", `attachment; filename=Salary_${yearNumber}_${String(monthNumber).padStart(2,"0")}_Filtered.xlsx`); await workbook.xlsx.write(res); res.end();
  } catch (error) { console.error("Salary export error:", error); res.status(500).json({ success: false, message: "Internal server error" }); }
};
const exportFilteredReport = async (req, res) => {
  try {
    const { format } = req.params;
    const { title = "LMS Report", fileName = "Report", columns = [], rows = [] } = req.body || {};
    if (!["xlsx", "pdf"].includes(format)) return res.status(400).json({ success: false, message: "Invalid export format." });
    if (!Array.isArray(columns) || !columns.length || columns.length > 30 || !Array.isArray(rows) || rows.length > 5000) return res.status(400).json({ success: false, message: "Invalid report export data." });
    const safeColumns = columns.map((column, index) => ({ key: String(column.key || `column${index}`).slice(0, 60), label: String(column.label || column.key || `Column ${index + 1}`).slice(0, 80) }));
    const safeRows = rows.map((row) => safeColumns.map((column) => { const value = row && typeof row === "object" ? row[column.key] : ""; return typeof value === "number" ? value : String(value ?? "").slice(0, 500); }));
    const safeName = String(fileName).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "Report";
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook(); workbook.creator = "Kinetic LMS";
      const worksheet = workbook.addWorksheet("Report"); worksheet.mergeCells(1, 1, 1, safeColumns.length);
      const titleCell = worksheet.getCell(1, 1); titleCell.value = String(title).slice(0, 150); titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } }; titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } }; titleCell.alignment = { horizontal: "center", vertical: "middle" }; worksheet.getRow(1).height = 28;
      worksheet.addRow(safeColumns.map((column) => column.label)); const header = worksheet.getRow(2); header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      safeRows.forEach((row) => worksheet.addRow(row)); worksheet.columns.forEach((column) => { column.width = 18; }); worksheet.views = [{ state: "frozen", ySplit: 2 }];
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", `attachment; filename=${safeName}.xlsx`); await workbook.xlsx.write(res); return res.end();
    }
    const PDFDocument = require("pdfkit"); const doc = new PDFDocument({ size: "A3", layout: "landscape", margin: 28 });
    res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename=${safeName}.pdf`); doc.pipe(res);
    doc.fontSize(18).fillColor("#312e81").text(String(title).slice(0, 150)); doc.moveDown(0.3).fontSize(8).fillColor("#64748b").text(`Generated: ${new Date().toLocaleString("en-IN")} | Records: ${safeRows.length}`); doc.moveDown(0.7);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right, cellWidth = pageWidth / safeColumns.length, rowHeight = 22;
    const drawRow = (values, header = false) => { if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) doc.addPage(); const y = doc.y; values.forEach((value, index) => { const x = doc.page.margins.left + index * cellWidth; doc.rect(x, y, cellWidth, rowHeight).fillAndStroke(header ? "#1e293b" : "#ffffff", "#cbd5e1"); doc.fillColor(header ? "#ffffff" : "#334155").font(header ? "Helvetica-Bold" : "Helvetica").fontSize(7).text(String(value), x + 3, y + 6, { width: cellWidth - 6, height: rowHeight - 8, ellipsis: true }); }); doc.y = y + rowHeight; };
    drawRow(safeColumns.map((column) => column.label), true); safeRows.forEach((row) => drawRow(row)); doc.end();
  } catch (error) { console.error("Filtered report export error:", error); if (!res.headersSent) res.status(500).json({ success: false, message: "Report export failed." }); }
};

module.exports = {
  exportLabours,
  exportMonthlyAttendance,
  exportSalaryReport,
  exportFilteredReport
};

