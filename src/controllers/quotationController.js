const Quotation = require("../models/Quotation");
const Site = require("../models/Site");
const Company = require("../models/Company");
const contractorId = (user) => user.role === "CONTRACTOR" ? user._id : user.parentUserId;
const scope = (req) => ({ companyId: req.user.companyId, contractorId: contractorId(req.user), isDeleted: false });
const round = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const companyInitials = (name) => {
  const words = String(name || "").match(/[A-Za-z0-9]+/g) || [];
  return words.map((word, index) => index === 0 && word.length <= 6 && word === word.toUpperCase() ? word : word[0]).join("").toUpperCase() || "CMP";
};
const number = async (req) => {
  const company = await Company.findById(req.user.companyId).select("companyName").lean();
  const prefix = `${companyInitials(company?.companyName)}-${new Date().getFullYear()}-`;
  const existing = await Quotation.find({ ...scope(req), quotationNumber: { $regex: "^" + prefix } }).select("quotationNumber").lean();
  const sequence = existing.reduce((highest, quotation) => {
    const value = Number(quotation.quotationNumber.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
  return prefix + String(sequence + 1).padStart(3, "0");
  const last = await Quotation.findOne({ ...scope(req), quotationNumber: { $regex: `^${prefix}\\\\d+$` } }).sort({ quotationNumber: -1 }).lean();
  return prefix + String(last ? Number(last.quotationNumber.slice(prefix.length)) + 1 : 1).padStart(3, "0");
};
exports.list = async (req, res) => {
  try { const filter = scope(req); if (req.query.status) filter.status = req.query.status; res.json({ success: true, data: await Quotation.find(filter).sort({ createdAt: -1 }) }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
exports.get = async (req, res) => {
  try { const data = await Quotation.findOne({ ...scope(req), _id: req.params.id }); return data ? res.json({ success: true, data }) : res.status(404).json({ success: false, message: "Quotation not found" }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
exports.create = async (req, res) => {
  try {
    const site = await Site.findOne({ ...scope(req), _id: req.body.siteId });
    if (!site) return res.status(404).json({ success: false, message: "Site not found" });
    const subject = String(req.body.subject || "").trim(), rows = Array.isArray(req.body.items) ? req.body.items : [];
    if (!subject) return res.status(400).json({ success: false, message: "Quotation subject is required" });
    if (!rows.length || rows.length > 100) return res.status(400).json({ success: false, message: "Add between 1 and 100 work items" });
    const items = rows.map((row) => {
      const description = String(row.description || "").trim(), quantity = Number(row.quantity), rate = Number(row.rate);
      if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rate) || rate < 0) throw Object.assign(new Error("Every item needs a description, valid quantity and rate"), { statusCode: 400 });
      return { description: description.slice(0, 250), unit: String(row.unit || "Nos").slice(0, 30), quantity: round(quantity), rate: round(rate), amount: round(quantity * rate), remark: String(row.remark || "").trim().slice(0, 120) };
    });
    const discountPercent = Number(req.body.discountPercent || 0), gstPercent = Number(req.body.gstPercent || 0);
    if (![discountPercent, gstPercent].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return res.status(400).json({ success: false, message: "Discount and GST must be between 0 and 100" });
    const validUntil = new Date(req.body.validUntil);
    if (Number.isNaN(validUntil.getTime())) return res.status(400).json({ success: false, message: "Valid until date is required" });
    const subtotal = round(items.reduce((sum, item) => sum + item.amount, 0)), discountAmount = round(subtotal * discountPercent / 100), taxableAmount = round(subtotal - discountAmount), gstAmount = round(taxableAmount * gstPercent / 100);
    const clientAddress = [site.addressLine, site.city, site.district, site.state, site.pincode].filter(Boolean).join(", ") || site.location || "";
    const data = await Quotation.create({ ...scope(req), quotationNumber: await number(req), siteId: site._id, siteName: site.siteName, siteCode: site.siteCode || "", clientName: site.clientName || "Client", clientAddress, issueDate: req.body.issueDate || new Date(), validUntil, subject: subject.slice(0, 250), items, subtotal, discountPercent, discountAmount, taxableAmount, gstPercent, gstAmount, totalAmount: round(taxableAmount + gstAmount), status: req.body.status === "SENT" ? "SENT" : "DRAFT", notes: req.body.notes || "", terms: req.body.terms || undefined, createdBy: req.user._id, isDeleted: false });
    res.status(201).json({ success: true, message: "Quotation created successfully", data });
  } catch (error) { res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({ success: false, message: error.code === 11000 ? "Quotation number conflict, please try again" : error.message }); }
};
exports.status = async (req, res) => {
  try {
    if (!["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid status" });
    const data = await Quotation.findOneAndUpdate({ ...scope(req), _id: req.params.id }, { status: req.body.status }, { new: true });
    return data ? res.json({ success: true, message: "Quotation status updated", data }) : res.status(404).json({ success: false, message: "Quotation not found" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
