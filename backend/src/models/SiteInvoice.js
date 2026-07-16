const mongoose = require("mongoose");

const invoiceLineSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  hsnSacCode: { type: String, default: "", trim: true },
  quantity: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
}, { _id: false });

const siteInvoiceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  invoiceNumber: { type: String, required: true, unique: true, trim: true },
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true, index: true },
  siteName: { type: String, required: true },
  siteCode: { type: String, default: "" },
  clientName: { type: String, required: true },
  billingFrom: { type: Date, required: true },
  billingTo: { type: Date, required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  lines: { type: [invoiceLineSchema], default: [] },
  baseAmount: { type: Number, default: 0, min: 0 },
  serviceChargePercent: { type: Number, default: 0, min: 0, max: 100 },
  serviceChargeAmount: { type: Number, default: 0, min: 0 },
  adjustmentAmount: { type: Number, default: 0 },
  taxableAmount: { type: Number, default: 0, min: 0 },
  gstPercent: { type: Number, default: 18, min: 0, max: 100 },
  gstAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  balanceAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"], default: "ISSUED" },
  notes: { type: String, default: "", trim: true },
  supplierGstNumber: { type: String, trim: true, uppercase: true, default: "" },
  buyerGstNumber: { type: String, trim: true, uppercase: true, default: "" },
  companyName: { type: String, default: "" },
  companyAddress: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

siteInvoiceSchema.index({ companyId: 1, contractorId: 1, siteId: 1, billingFrom: 1, billingTo: 1 });
module.exports = mongoose.model("SiteInvoice", siteInvoiceSchema);
