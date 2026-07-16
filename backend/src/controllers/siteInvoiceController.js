const Attendance = require("../models/Attendance");
const Site = require("../models/Site");
const SiteInvoice = require("../models/SiteInvoice");
const PayrollSetting = require("../models/PayrollSetting");
const Company = require("../models/Company");

const contractorIdOf = (user) => user.role === "CONTRACTOR" ? user._id : user.parentUserId;
const round = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const scope = (req) => ({ companyId: req.user.companyId, contractorId: contractorIdOf(req.user), isDeleted: false });
const validDate = (value) => value && !Number.isNaN(new Date(value).getTime());
const nextInvoiceNumber = async (req) => {
  const now = new Date();
  const financialYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const financialYearEnd = String(financialYearStart + 1).slice(-2);
  const prefix = `INV-${financialYearStart}-${financialYearEnd}-`;
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

const buildPreview = async (req, { siteId, billingFrom, billingTo, hsnSacCode, quantity }) => {
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
  attendance.forEach((entry) => {
    const id = entry.labourId?._id?.toString() || entry.labourId?.toString() || "deleted";
    if (!map.has(id)) map.set(id, { labourId: entry.labourId?._id || null, labourName: entry.labourId?.name || "Deleted Labour", labourCode: entry.labourId?.labourCode || "", presentDays: 0, halfDays: 0, holidayDays: 0, overtimeHours: 0, labourAmount: 0, overtimeAmount: 0, totalAmount: 0 });
    const line = map.get(id);
    const wage = Number(entry.wageAtThatDay || 0);
    if (entry.status === "PRESENT") { line.presentDays += 1; line.labourAmount += wage; }
    if (entry.status === "HALF_DAY") { line.halfDays += 1; line.labourAmount += wage * 0.5; }
    if (entry.status === "HOLIDAY") { line.holidayDays += 1; line.labourAmount += wage; }
    const hours = Number(entry.overtimeHours || 0);
    line.overtimeHours += hours;
    line.overtimeAmount += entry.overtimeAmount == null ? hours * Number(entry.overtimeRate ?? overtimeRate) : Number(entry.overtimeAmount || 0);
  });
  const labourDetails = [...map.values()].map((line) => ({ ...line, labourAmount: round(line.labourAmount), overtimeHours: round(line.overtimeHours), overtimeAmount: round(line.overtimeAmount), totalAmount: round(line.labourAmount + line.overtimeAmount) }));
  const baseAmount = round(labourDetails.reduce((sum, line) => sum + line.totalAmount, 0));
  
  // Create single line item for Man power supply
  const lines = [{
    description: "Man power supply",
    hsnSacCode: hsnSacCode || "",
    quantity: Number(quantity || 0),
    rate: baseAmount,
    amount: baseAmount,
  }];
  
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
    const preview = await buildPreview(req, {
      siteId: req.body.siteId,
      billingFrom: req.body.billingFrom,
      billingTo: req.body.billingTo,
      hsnSacCode: req.body.hsnSacCode,
      quantity: req.body.quantity,
    });
    if (!preview.labourDetails.length) return res.status(400).json({ success: false, message: "No attendance records found for this site and period" });
    
    // Fetch company details to get GST
    const company = await Company.findOne({ _id: req.user.companyId });
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });
    
    const supplierGst = company.gstNumber || "";
    const buyerGst = preview.site.clientGstNumber || "";
    const companyName = company.companyName || "";
    const companyAddress = `${company.address?.street || ""}, ${company.address?.city || ""}, ${company.address?.state || ""} ${company.address?.pincode || ""}`.trim();
    
    // Use company GST rate as default, allow override in request body
    const gstPercent = Number(req.body.gstPercent != null ? req.body.gstPercent : 18);
    const serviceChargePercent = Number(req.body.serviceChargePercent || 0);
    const adjustmentAmount = Number(req.body.adjustmentAmount || 0);
    
    if (![serviceChargePercent, gstPercent, adjustmentAmount].every(Number.isFinite) || serviceChargePercent < 0 || serviceChargePercent > 100 || gstPercent < 0 || gstPercent > 100) {
      return res.status(400).json({ success: false, message: "Invalid service charge, GST or adjustment" });
    }
    
    const serviceChargeAmount = round(preview.baseAmount * serviceChargePercent / 100);
    const taxableAmount = round(Math.max(preview.baseAmount + serviceChargeAmount + adjustmentAmount, 0));
    const gstAmount = round(taxableAmount * gstPercent / 100);
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
      lines: preview.lines,
      baseAmount: preview.baseAmount,
      serviceChargePercent,
      serviceChargeAmount,
      adjustmentAmount: round(adjustmentAmount),
      taxableAmount,
      gstPercent,
      gstAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: req.body.status === "DRAFT" ? "DRAFT" : "ISSUED",
      notes: req.body.notes || "",
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
    const invoices = await SiteInvoice.find(filter).populate("siteId", "siteName siteCode clientName").sort({ issueDate: -1 });
    return res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
const getInvoiceById = async (req, res) => {
  try { const invoice = await SiteInvoice.findOne({ ...scope(req), _id: req.params.id }).populate("siteId", "siteName siteCode clientName location contactPerson contactEmail contactMobile").populate("companyId", "companyName gstNumber address"); if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" }); return res.json({ success: true, data: invoice }); }
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
module.exports = { previewInvoice, createInvoice, getInvoices, getInvoiceById, updateInvoicePayment };
