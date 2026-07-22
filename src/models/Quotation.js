const mongoose = require("mongoose");
module.exports = mongoose.model("Quotation", new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  quotationNumber: { type: String, required: true, unique: true, trim: true },
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true, index: true },
  siteName: { type: String, required: true }, siteCode: { type: String, default: "" },
  clientName: { type: String, required: true }, issueDate: { type: Date, default: Date.now },
  validUntil: { type: Date, required: true }, subject: { type: String, required: true, trim: true },
  items: [{ description: { type: String, required: true, trim: true }, unit: { type: String, default: "Nos" }, quantity: { type: Number, required: true, min: 0.01 }, rate: { type: Number, required: true, min: 0 }, amount: { type: Number, required: true, min: 0 } }],
  subtotal: { type: Number, required: true, min: 0 }, discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0 }, taxableAmount: { type: Number, required: true, min: 0 },
  gstPercent: { type: Number, default: 18, min: 0, max: 100 }, gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"], default: "DRAFT" },
  notes: { type: String, default: "", trim: true }, terms: { type: String, default: "Rates are valid until the validity date. Work will begin after written approval.", trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, isDeleted: { type: Boolean, default: false },
}, { timestamps: true }));
