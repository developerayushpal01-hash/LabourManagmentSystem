const mongoose = require("mongoose");
const subscriptionSchema = new mongoose.Schema({
companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", default: null, index: true },
  planName: { type: String, required: true, trim: true }, planCode: { type: String, required: true, trim: true, uppercase: true },
  billingCycle: { type: String, enum: ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"], default: "MONTHLY" }, amount: { type: Number, default: 0, min: 0 }, currency: { type: String, default: "INR", uppercase: true },
  startDate: { type: Date, required: true }, endDate: { type: Date, required: true }, trialEndsAt: { type: Date, default: null },
  status: { type: String, enum: ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "EXPIRED", "CANCELLED"], default: "ACTIVE" }, paymentStatus: { type: String, enum: ["PENDING", "PAID", "PARTIAL", "FAILED", "REFUNDED", "NOT_REQUIRED"], default: "PENDING" },
  paymentReference: { type: String, trim: true, default: "" },
  paymentProofPath: { type: String, default: "" }, paymentProofOriginalName: { type: String, default: "" }, paymentProofMimeType: { type: String, default: "" },
  verificationStatus: { type: String, enum: ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"], default: "NOT_SUBMITTED", index: true },
  submittedAt: { type: Date, default: null }, verifiedAt: { type: Date, default: null }, verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, rejectionReason: { type: String, trim: true, default: "" },
  autoRenew: { type: Boolean, default: false },
  limits: { users: { type: Number, default: 10 }, labours: { type: Number, default: 100 }, sites: { type: Number, default: 10 }, storageMb: { type: Number, default: 1024 } },
  features: { payroll: { type: Boolean, default: true }, invoices: { type: Boolean, default: true }, reports: { type: Boolean, default: true }, exports: { type: Boolean, default: true }, apiAccess: { type: Boolean, default: false } },
  notes: { type: String, trim: true, default: "" }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model("Subscription", subscriptionSchema);


