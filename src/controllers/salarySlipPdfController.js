const PDFDocument = require("pdfkit");
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
      .populate("labourId", "employeeCode name mobile")
      .populate("generatedBy", "name role");

    if (!slip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    const fileName = `SalarySlip_${slip.labourId?.employeeCode || slip._id}_${slip.month}_${slip.year}.pdf`;

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
    doc.text(`Employee Code: ${slip.labourId?.employeeCode || ""}`);
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

module.exports = {
  downloadSalarySlipPdf,
};