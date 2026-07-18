const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true }, message: { type: String, required: true, trim: true }, type: { type: String, enum: ["INFO", "SUCCESS", "WARNING", "CRITICAL", "MAINTENANCE", "BILLING"], default: "INFO" },
  targetType: { type: String, enum: ["ALL", "COMPANY", "ROLE", "USER"], default: "ALL" }, companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null }, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, role: { type: String, enum: ["CONTRACTOR", "SUPERVISOR", "ACCOUNTANT", null], default: null },
  actionLabel: { type: String, trim: true, default: "" }, actionUrl: { type: String, trim: true, default: "" }, scheduledAt: { type: Date, default: Date.now }, expiresAt: { type: Date, default: null }, status: { type: String, enum: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"], default: "PUBLISHED" },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model("PlatformNotification", schema);
