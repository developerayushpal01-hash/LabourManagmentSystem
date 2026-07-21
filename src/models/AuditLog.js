const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  actorName: { type: String, required: true }, action: { type: String, required: true, index: true },
  resource: { type: String, required: true, index: true }, resourceId: { type: String, default: null },
  method: { type: String, required: true }, path: { type: String, required: true },
  statusCode: { type: Number, required: true }, changes: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: "" }, userAgent: { type: String, default: "" },
}, { timestamps: true });
schema.index({ createdAt: -1 });
module.exports = mongoose.model("AuditLog", schema);
