const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const SalarySlip = require("../models/SalarySlip");

const getContractorId = (user) => {
  return user.role === "CONTRACTOR" ? user._id : user.parentUserId;
};

const downloadSalarySlipPdf = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);

    const slip = await SalarySlip.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      contractorId,
      isDeleted: false,
    })
      .populate("labourId", "labourCode name mobile")
      .populate("generatedBy", "name role");

    if (!slip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    const fileName = `SalarySlip_${slip.labourId?.labourCode || slip._id}_${slip.month}_${slip.year}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    doc.pipe(res);

    doc.fontSize(18).text("LABOUR MANAGEMENT SYSTEM", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).text("SALARY SLIP", { align: "center" });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Month: ${slip.month}`);
    doc.text(`Year: ${slip.year}`);
    doc.text(`Labour Code: ${slip.labourId?.labourCode || ""}`);
    doc.text(`Name: ${slip.labourId?.name || ""}`);
    doc.text(`Mobile: ${slip.labourId?.mobile || ""}`);
    doc.moveDown();

    doc.fontSize(12).text("Earnings", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Basic Salary: Rs. ${slip.basicSalary}`);
    doc.text(`HRA: Rs. ${slip.hra}`);
    doc.text(`Other Allowance: Rs. ${slip.otherAllowance}`);
    doc.text(`Bonus: Rs. ${slip.bonus}`);
    doc.text(`Incentive: Rs. ${slip.incentive}`);
    doc.text(`Overtime Amount: Rs. ${slip.overtimeAmount}`);
    doc.text(`Gross Salary: Rs. ${slip.grossSalary}`);
    doc.moveDown();

    doc.fontSize(12).text("Deductions", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`PF Employee: Rs. ${slip.pfEmployee}`);
    doc.text(`ESIC Employee: Rs. ${slip.esicEmployee}`);
    doc.text(`Advance: Rs. ${slip.advance}`);
    doc.text(`Other Deduction: Rs. ${slip.otherDeduction}`);
    doc.text(`Net Salary: Rs. ${slip.netSalary}`);
    doc.moveDown();

    doc.fontSize(12).text("Company Contribution", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`PF Employer: Rs. ${slip.pfEmployer}`);
    doc.text(`ESIC Employer: Rs. ${slip.esicEmployer}`);
    doc.text(`CTC: Rs. ${slip.ctc}`);
    doc.moveDown();

    doc.fontSize(12).text("Payment Status", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Paid Amount: Rs. ${slip.paidAmount}`);
    doc.text(`Balance Amount: Rs. ${slip.balanceAmount}`);
    doc.text(`Status: ${slip.status}`);

    doc.moveDown(2);
    doc.fontSize(9).text("This is a system-generated salary slip.", {
      align: "center",
    });

    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const downloadSalarySlipExcel = async (req, res) => {
  try {
    const contractorId = getContractorId(req.user);
    const slip = await SalarySlip.findOne({ _id: req.params.id, companyId: req.user.companyId, contractorId, isDeleted: false }).populate("labourId", "labourCode name mobile");
    if (!slip) return res.status(404).json({ success: false, message: "Salary slip not found" });
    const workbook = new ExcelJS.Workbook(); workbook.creator = "Kinetic LMS";
    const sheet = workbook.addWorksheet("Salary Slip", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1 } });
    sheet.columns = [{ width: 28 }, { width: 20 }, { width: 28 }, { width: 20 }];
    sheet.mergeCells("A1:D1"); const title = sheet.getCell("A1"); title.value = "SALARY SLIP"; title.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } }; title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } }; title.alignment = { horizontal: "center", vertical: "middle" }; sheet.getRow(1).height = 32;
    sheet.addRow(["Labour Code", slip.labourId?.labourCode || "", "Salary Month", `${String(slip.month).padStart(2, "0")}/${slip.year}`]);
    sheet.addRow(["Labour Name", slip.labourId?.name || "", "Mobile", slip.labourId?.mobile || ""]); sheet.addRow([]);
    const addSection = (name, rows) => { const rowNumber = sheet.rowCount + 1; sheet.mergeCells(rowNumber, 1, rowNumber, 4); const heading = sheet.getCell(rowNumber, 1); heading.value = name; heading.font = { bold: true, color: { argb: "FFFFFFFF" } }; heading.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } }; rows.forEach(([label, value]) => sheet.addRow([label, Number(value || 0), "", ""])); };
    addSection("EARNINGS", [["Basic Salary", slip.basicSalary], ["HRA", slip.hra], ["Other Allowance", slip.otherAllowance], ["Bonus", slip.bonus], ["Incentive", slip.incentive], ["Overtime", slip.overtimeAmount], ["Gross Salary", slip.grossSalary]]);
    addSection("DEDUCTIONS", [["Employee PF", slip.pfEmployee], ["Employee ESIC", slip.esicEmployee], ["Advance", slip.advance], ["Other Deduction", slip.otherDeduction], ["Total Deduction", slip.totalDeduction], ["Net Salary", slip.finalNetSalary ?? slip.netSalary]]);
    addSection("EMPLOYER CONTRIBUTIONS", [["Employer PF", slip.pfEmployer], ["Employer ESIC", slip.esicEmployer], ["CTC", slip.ctc]]);
    addSection("PAYMENT", [["Paid Amount", slip.paidAmount], ["Balance Amount", slip.balanceAmount]]); sheet.addRow(["Status", slip.status, "", ""]);
    sheet.eachRow((row, rowNumber) => row.eachCell((cell, column) => { cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } }, left: { style: "thin", color: { argb: "FFE2E8F0" } }, bottom: { style: "thin", color: { argb: "FFE2E8F0" } }, right: { style: "thin", color: { argb: "FFE2E8F0" } } }; if (rowNumber > 1 && column === 1) cell.font = { bold: true }; if (column === 2 && typeof cell.value === "number") cell.numFmt = '₹#,##0.00'; }));
    const fileName = `SalarySlip_${slip.labourId?.labourCode || slip._id}_${slip.month}_${slip.year}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", `attachment; filename=${fileName}`); await workbook.xlsx.write(res); res.end();
  } catch (error) { if (!res.headersSent) res.status(500).json({ success: false, message: error.message }); }
};

module.exports = {
  downloadSalarySlipPdf,
  downloadSalarySlipExcel,
};
