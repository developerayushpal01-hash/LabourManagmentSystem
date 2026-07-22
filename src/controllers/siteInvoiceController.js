const Attendance = require("../models/Attendance");
const Site = require("../models/Site");
const SiteInvoice = require("../models/SiteInvoice");
const PayrollSetting = require("../models/PayrollSetting");
const Company = require("../models/Company");
const ExcelJS = require("exceljs");

const contractorIdOf = (user) => user.role === "CONTRACTOR" ? user._id : user.parentUserId;
const round = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const scope = (req) => ({ companyId: req.user.companyId, contractorId: contractorIdOf(req.user), isDeleted: false });
const validDate = (value) => value && !Number.isNaN(new Date(value).getTime());
const companyInitials = (name) => {
  const words = String(name || "").match(/[A-Za-z0-9]+/g) || [];
  return words.map((word, index) => index === 0 && word.length <= 6 && word === word.toUpperCase() ? word : word[0]).join("").toUpperCase() || "CMP";
};
const nextInvoiceNumber = async (req) => {
  const now = new Date();
  const financialYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const financialYearEnd = String(financialYearStart + 1).slice(-2);
  const company = await Company.findById(req.user.companyId).select("companyName").lean();
  const prefix = `${companyInitials(company?.companyName)}-${financialYearStart}-${financialYearEnd}-`;
  const invoices = await SiteInvoice.find({
    companyId: req.user.companyId,
    contractorId: contractorIdOf(req.user),
    invoiceNumber: { $regex: `^${prefix}\\d+$` },
  }).select("invoiceNumber").lean();
  const lastSequence = invoices.reduce((highest, invoice) => {
    const sequence = Number(invoice.invoiceNumber.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  return `${prefix}${String(lastSequence + 1).padStart(2, "0")}`;
};

const buildPreview = async (req, { siteId, billingFrom, billingTo, hsnSacCode }) => {
  if (!siteId || !validDate(billingFrom) || !validDate(billingTo)) throw Object.assign(new Error("Site, billing from and billing to dates are required"), { statusCode: 400 });
  const start = new Date(billingFrom); start.setHours(0, 0, 0, 0);
  const end = new Date(billingTo); end.setHours(23, 59, 59, 999);
  if (start > end) throw Object.assign(new Error("Billing from date cannot be after billing to date"), { statusCode: 400 });
  const site = await Site.findOne({ ...scope(req), _id: siteId });
  if (!site) throw Object.assign(new Error("Site not found"), { statusCode: 404 });
  const [attendance, setting] = await Promise.all([
    Attendance.find({ ...scope(req), siteId, attendanceDate: { $gte: start, $lte: end } }).populate("labourId", "name labourCode").sort({ attendanceDate: 1 }),
    PayrollSetting.findOne(scope(req)),
  ]);
  const overtimeRate = Number(setting?.overtimeRate || 0);
  const map = new Map();
  const lineMap = new Map();
  const addLine = (description, rate, quantity) => {
    const cleanRate = round(rate), cleanQuantity = round(quantity);
    if (cleanQuantity <= 0) return;
    const key = `${description}|${cleanRate}`;
    const current = lineMap.get(key) || { description, hsnSacCode: hsnSacCode || "", quantity: 0, rate: cleanRate, amount: 0 };
    current.quantity = round(current.quantity + cleanQuantity);
    current.amount = round(current.quantity * current.rate);
    lineMap.set(key, current);
  };
  attendance.forEach((entry) => {
    const id = entry.labourId?._id?.toString() || entry.labourId?.toString() || "deleted";
    if (!map.has(id)) map.set(id, { labourId: entry.labourId?._id || null, labourName: entry.labourId?.name || "Deleted Labour", labourCode: entry.labourId?.labourCode || "", presentDays: 0, halfDays: 0, holidayDays: 0, overtimeHours: 0, labourAmount: 0, overtimeAmount: 0, totalAmount: 0 });
    const line = map.get(id);
    const wage = Number(entry.wageAtThatDay || 0);
    if (entry.status === "PRESENT") { line.presentDays += 1; line.labourAmount += wage; addLine("Present labour charge", wage, 1); }
    if (entry.status === "HALF_DAY") { line.halfDays += 1; line.labourAmount += wage * 0.5; addLine("Half day labour charge", wage, 0.5); }
    if (entry.status === "HOLIDAY") { line.holidayDays += 1; line.labourAmount += wage; addLine("Holiday labour charge", wage, 1); }
    const hours = Number(entry.overtimeHours || 0);
    line.overtimeHours += hours;
    const otAmount = entry.overtimeAmount == null ? hours * Number(entry.overtimeRate ?? overtimeRate) : Number(entry.overtimeAmount || 0);
    line.overtimeAmount += otAmount;
    addLine("Overtime (OT)", hours > 0 ? otAmount / hours : 0, hours);
  });
  const labourDetails = [...map.values()].map((line) => ({ ...line, labourAmount: round(line.labourAmount), overtimeHours: round(line.overtimeHours), overtimeAmount: round(line.overtimeAmount), totalAmount: round(line.labourAmount + line.overtimeAmount) }));
  const baseAmount = round(labourDetails.reduce((sum, line) => sum + line.totalAmount, 0));
  
  const lines = [...lineMap.values()].sort((a, b) => a.description.localeCompare(b.description) || a.rate - b.rate);
    return { site, billingFrom: start, billingTo: end, attendanceCount: attendance.length, labourCount: labourDetails.length, labourDetails, lines, baseAmount };
};

const previewInvoice = async (req, res) => {
  try {
    const [preview, invoiceNumber, company] = await Promise.all([
      buildPreview(req, req.query),
      nextInvoiceNumber(req),
      Company.findOne({ _id: req.user.companyId }),
    ]);
    
    const supplierGst = company?.gstNumber || "";
    const buyerGst = preview.site.clientGstNumber || "";
    const defaultGstPercent = Number(req.query.gstPercent != null ? req.query.gstPercent : 18);
    
    return res.json({
      success: true,
      data: {
        site: preview.site,
        billingFrom: preview.billingFrom,
        billingTo: preview.billingTo,
        invoiceNumber,
        attendanceCount: preview.attendanceCount,
        labourCount: preview.labourCount,
        labourDetails: preview.labourDetails,
        lines: preview.lines,
        baseAmount: preview.baseAmount,
        supplierGstNumber: supplierGst,
        buyerGstNumber: buyerGst,
        defaultGstPercent,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const createInvoice = async (req, res) => {
  try {
    const isCustom = req.body.invoiceType === "CUSTOM";
    const preview = await buildPreview(req, {
      siteId: req.body.siteId,
      billingFrom: req.body.billingFrom,
      billingTo: req.body.billingTo,
      hsnSacCode: req.body.hsnSacCode,
    });
    if (!isCustom && !preview.labourDetails.length) return res.status(400).json({ success: false, message: "No attendance records found for this site and period" });

    let invoiceLines;
    if (isCustom) {
      const requestedLines = Array.isArray(req.body.customLines) ? req.body.customLines : [];
      if (!requestedLines.length || requestedLines.length > 100) return res.status(400).json({ success: false, message: "Add between 1 and 100 custom invoice rows" });
      invoiceLines = requestedLines.map((line) => {
        const description = String(line?.description || "").trim().slice(0, 250);
        const hsnSacCode = String(line?.hsnSacCode || "").trim().slice(0, 30);
        const quantity = Number(line?.quantity), rate = Number(line?.rate);
        if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rate) || rate < 0) throw Object.assign(new Error("Every row needs a description, quantity above zero and a valid rate"), { statusCode: 400 });
        return { description, hsnSacCode, quantity: round(quantity), rate: round(rate), amount: round(quantity * rate) };
      });
    }
    
    // Fetch company details to get GST
    const company = await Company.findOne({ _id: req.user.companyId });
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });
    
    const supplierGst = company.gstNumber || "";
    const buyerGst = preview.site.clientGstNumber || "";
    const companyName = company.companyName || "";
    const companyAddress = `${company.address?.street || ""}, ${company.address?.city || ""}, ${company.address?.state || ""} ${company.address?.pincode || ""}`.trim();
    
    const serviceChargeEnabled = req.body.serviceChargeEnabled === true;
    const adjustmentEnabled = req.body.adjustmentEnabled === true;
    const cgstEnabled = req.body.cgstEnabled !== false;
    const sgstEnabled = req.body.sgstEnabled !== false;
    const cgstPercent = Number(req.body.cgstPercent ?? 9);
    const sgstPercent = Number(req.body.sgstPercent ?? 9);
    const gstPercent = round((cgstEnabled ? cgstPercent : 0) + (sgstEnabled ? sgstPercent : 0));
    const serviceChargePercent = Number(req.body.serviceChargePercent || 0);
    const adjustmentAmount = Number(req.body.adjustmentAmount || 0);
    if (![serviceChargePercent, cgstPercent, sgstPercent, adjustmentAmount].every(Number.isFinite) || serviceChargePercent < 0 || serviceChargePercent > 100 || cgstPercent < 0 || cgstPercent > 100 || sgstPercent < 0 || sgstPercent > 100) {
      return res.status(400).json({ success: false, message: "Invalid service charge, tax or adjustment" });
    }
    const requestedDescriptions = Array.isArray(req.body.lineDescriptions) ? req.body.lineDescriptions : [];
    if (!isCustom) invoiceLines = preview.lines.map((line, index) => ({ ...line, description: String(requestedDescriptions[index] || line.description).trim().slice(0, 250) || line.description }));
    const baseAmount = round(invoiceLines.reduce((sum, line) => sum + line.amount, 0));
    const serviceChargeAmount = serviceChargeEnabled ? round(baseAmount * serviceChargePercent / 100) : 0;
    const appliedAdjustment = adjustmentEnabled ? adjustmentAmount : 0;
    const taxableAmount = round(Math.max(baseAmount + serviceChargeAmount + appliedAdjustment, 0));
    const cgstAmount = cgstEnabled ? round(taxableAmount * cgstPercent / 100) : 0;
    const sgstAmount = sgstEnabled ? round(taxableAmount * sgstPercent / 100) : 0;
    const gstAmount = round(cgstAmount + sgstAmount);
    const totalAmount = round(taxableAmount + gstAmount);
    const invoiceNumber = await nextInvoiceNumber(req);
    const dueDate = validDate(req.body.dueDate) ? new Date(req.body.dueDate) : new Date(Date.now() + 15 * 86400000);
    
    const invoice = await SiteInvoice.create({
      ...scope(req),
      isDeleted: false,
      invoiceNumber,
      siteId: preview.site._id,
      siteName: preview.site.siteName,
      siteCode: preview.site.siteCode,
      clientName: preview.site.clientName,
      billingFrom: preview.billingFrom,
      billingTo: preview.billingTo,
      dueDate,
      invoiceType: isCustom ? "CUSTOM" : "ATTENDANCE",
      lines: invoiceLines,
      baseAmount,
      serviceChargePercent,
      serviceChargeAmount,
      serviceChargeEnabled,
      adjustmentEnabled,
      adjustmentAmount: round(appliedAdjustment),
      taxableAmount,
      gstPercent,
      gstAmount,
      cgstEnabled, cgstPercent, cgstAmount,
      sgstEnabled, sgstPercent, sgstAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: req.body.status === "DRAFT" ? "DRAFT" : "ISSUED",
      notes: req.body.notes || "",
      declarationEnabled: req.body.declarationEnabled !== false,
      declarationText: String(req.body.declarationText || "").trim(),
      supplierGstNumber: supplierGst,
      buyerGstNumber: buyerGst,
      companyName,
      companyAddress,
      createdBy: req.user._id,
    });
    
    return res.status(201).json({ success: true, message: "Site invoice created successfully", data: invoice });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Invoice number conflict, please try again" });
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const getInvoices = async (req, res) => {
  try {
    const filter = scope(req);
    if (req.query.siteId) filter.siteId = req.query.siteId;
    if (req.query.status) filter.status = req.query.status;
    const invoices = await SiteInvoice.find(filter).populate("siteId", "siteName siteCode clientName location addressLine city district state pincode").sort({ issueDate: -1 });
    return res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
const getInvoiceById = async (req, res) => {
  try { const invoice = await SiteInvoice.findOne({ ...scope(req), _id: req.params.id }).populate("siteId", "siteName siteCode clientName location addressLine city district state pincode contactPerson contactEmail contactMobile").populate("companyId", "companyName gstNumber address"); if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" }); return res.json({ success: true, data: invoice }); }
  catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
const updateInvoicePayment = async (req, res) => {
  try {
    const invoice = await SiteInvoice.findOne({ ...scope(req), _id: req.params.id });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status === "CANCELLED") return res.status(400).json({ success: false, message: "Cancelled invoice cannot receive payment" });
    const paidAmount = Number(req.body.paidAmount);
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > invoice.totalAmount) return res.status(400).json({ success: false, message: "Paid amount must be between zero and invoice total" });
    invoice.paidAmount = round(paidAmount); invoice.balanceAmount = round(invoice.totalAmount - paidAmount); invoice.status = paidAmount <= 0 ? "ISSUED" : paidAmount < invoice.totalAmount ? "PARTIALLY_PAID" : "PAID"; await invoice.save();
    return res.json({ success: true, message: "Invoice payment updated", data: invoice });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
const invoiceAmountWords = (value) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const under100 = (n) => n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  const under1000 = (n) => n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${under100(n % 100)}` : ""}` : under100(n);
  const integerWords = (number) => { if (!number) return "Zero"; const parts = []; let n = number; for (const [label, size] of [["Crore", 10000000], ["Lakh", 100000], ["Thousand", 1000]]) { const count = Math.floor(n / size); if (count) { parts.push(`${under100(count)} ${label}`); n %= size; } } if (n) parts.push(under1000(n)); return parts.join(" "); };
  const rupees = Math.floor(Math.abs(value)); const paise = Math.round((Math.abs(value) - rupees) * 100);
  return `${value < 0 ? "Minus " : ""}${integerWords(rupees)} Rupees${paise ? ` and ${integerWords(paise)} Paise` : ""} Only`;
};

const exportInvoiceExcel = async (req, res) => {
  try {
    const invoice = await SiteInvoice.findOne({ ...scope(req), _id: req.params.id }).populate("siteId", "siteName siteCode clientName location addressLine city district state pincode");
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    invoice.clientName = "";
    const workbook = new ExcelJS.Workbook(); workbook.creator = "Kinetic LMS";
    const ws = workbook.addWorksheet("Invoice", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.25, right: 0.25, top: 0.7, bottom: 0.25, header: 0, footer: 0 } }, views: [{ showGridLines: false }] });
    [7, 27, 14, 15, 13, 11, 16].forEach((width, index) => { ws.getColumn(index + 1).width = width; });
    const thin = { style: "thin", color: { argb: "FF000000" } }; const border = { top: thin, left: thin, bottom: thin, right: thin };
    const set = (cell, value, options = {}) => { const c = ws.getCell(cell); c.value = value; c.font = { name: "Arial", size: options.size || 10, bold: Boolean(options.bold), underline: Boolean(options.underline) }; c.alignment = { vertical: "middle", horizontal: options.align || "left", wrapText: options.wrap !== false }; return c; };
    const merge = (range, value, options = {}) => { ws.mergeCells(range); const c = set(range.split(":")[0], value, options); return c; };
    const compact = String(invoice.invoiceNumber).replace(/^INV-\d{2}(\d{2})-(\d{2})-(.+)$/, "$1-$2/$3");
    const displayNumber = String(invoice.invoiceNumber).startsWith("INV-") ? `${companyInitials(invoice.companyName)}/${compact}` : compact.replace(/^[A-Z0-9]+(?=-\\d{4}-\\d{2}-)/, companyInitials(invoice.companyName));
    const d = (value) => new Date(value).toLocaleDateString("en-GB"); const month = new Date(invoice.billingFrom).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    merge("A1:G1", "Invoice", { bold: true, size: 16, align: "center" }); ws.getRow(1).height = 26;
    merge("A2:D2", `Bill Month :- ${month}`, { bold: true }); merge("E2:G2", `Bill Period : ${d(invoice.billingFrom)} to ${d(invoice.billingTo)}`, { bold: true }); ws.getRow(2).height = 20;
    merge("A3:C8", `AL Gosar Enterprises\nBairagi Colony , Ward No.10 , Pithampur\nDist : Dhar ( M.P.) 454775\nGST No. ${invoice.supplierGstNumber || "23CFVPG6126B1ZN"}\nPAN No: CFVPG6126B\nState : Madhya Pradesh\nE- Mail : gosarenterprises8@gmail.com`, { bold: false });
    [[3, `Invoice No. ${displayNumber}`, `Date : ${d(invoice.issueDate)}`], [4, "Deliver Note", "Mode / Terms of Payment"], [5, "Supplier's Ref.", "Dated"], [6, "Vender Code", "422045"], [7, "Buyer's order No.", "Destination : PITHAMPUR"], [8, "LUT No.", "AD230425013203T"]].forEach(([row, label, value]) => { merge(`D${row}:E${row}`, label, { bold: row === 3 }); merge(`F${row}:G${row}`, value); ws.getRow(row).height = 19; });
    merge("A9:C12", `Buyers & Consignee\n${invoice.clientName}\n${invoice.siteName}\nGSTIN : ${invoice.buyerGstNumber || "N/A"}`, { bold: false }); merge("D9:G12", "Terms Of Delivery :- 10 days after invoice"); [9,10,11,12].forEach(r => ws.getRow(r).height = 18);
    const headers = ["S.No.", "Description of Goods", "HSN / SAC", "Quantity", "Rate", "Per", "Amount"]; headers.forEach((value, i) => set(`${String.fromCharCode(65+i)}13`, value, { bold: true, align: "center" })); ws.getRow(13).height = 22;
    let row = 14; invoice.lines.forEach((line, index) => { [index+1, line.description, line.hsnSacCode || "-", line.quantity, line.rate, "-", line.amount].forEach((value, i) => set(`${String.fromCharCode(65+i)}${row}`, value, { align: i === 1 ? "left" : "center" })); ws.getCell(`G${row}`).numFmt = '#,##0.00'; ws.getRow(row).height = 21; row++; });
    const totalRow = (label, value, bold = false) => { merge(`A${row}:F${row}`, label, { bold, align: "right" }); set(`G${row}`, Number(value), { bold, align: "right" }).numFmt = '#,##0.00'; ws.getRow(row).height = 20; row++; };
    totalRow("AMOUNT", invoice.baseAmount, true); if (invoice.serviceChargeAmount > 0) totalRow(`Service Charges ${invoice.serviceChargePercent}%`, invoice.serviceChargeAmount, true); if (invoice.adjustmentAmount !== 0) totalRow("Adjustment", invoice.adjustmentAmount); totalRow("Total Amount", invoice.taxableAmount, true); if (invoice.cgstAmount > 0) totalRow(`CGST ${invoice.cgstPercent}%`, invoice.cgstAmount, true); if (invoice.sgstAmount > 0) totalRow(`SGST ${invoice.sgstPercent}%`, invoice.sgstAmount, true); totalRow("NET PAYABLE AMOUNT", invoice.totalAmount, true);
    merge(`A${row}:G${row}`, `Amount Chargeble in ( Words )\n${invoiceAmountWords(invoice.totalAmount)}`, { bold: true }); ws.getRow(row).height = 35; row++;
    if (invoice.declarationEnabled !== false) { merge(`A${row}:G${row}`, `Declaration\n${invoice.declarationText || "Supply & service MEANT for Export/Supply to SEZ Developer for authorised operations under bond or letter undertaking without payment of IGST AD230425013203T Dated :-22/04/2025 Valid till :-31/03/2026"}`, { bold: false, align: "center" }); ws.getCell(`A${row}`).font = { name: "Arial", size: 10 }; ws.getRow(row).height = 48; row++; }
    merge(`A${row}:D${row}`, "Remarks\nAL Gosar Enterprises\nBank Details :-\nAccount Name : A.L Gosar Enterprises\nAccount No : 5020004929512\nIFSC Code : HDFC0001291\nBranch : Pithampur"); merge(`E${row}:G${row}`, "For :- AL Gosar Enterprises\n\n\nAuthorised Signatory", { bold: false, align: "right" }); ws.getRow(row).height = 100;
    for (let r = 1; r <= row; r++) for (let c = 1; c <= 7; c++) ws.getCell(r, c).border = border;
    ws.pageSetup.printArea = `A1:G${row}`; ws.headerFooter.oddHeader = ""; ws.headerFooter.oddFooter = "";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", `attachment; filename=Invoice-${invoice.invoiceNumber}.xlsx`); await workbook.xlsx.write(res); return res.end();
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
module.exports = { previewInvoice, createInvoice, getInvoices, getInvoiceById, updateInvoicePayment, exportInvoiceExcel };

