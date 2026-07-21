const AuditLog = require("../models/AuditLog");
const hidden = new Set(["password", "resetOtp", "token", "authorization"]);
const sanitize = (value) => !value || typeof value !== "object" ? value : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, hidden.has(key) ? "[REDACTED]" : item]));
exports.auditSuperAdminMutation = (req, res, next) => {
  if (req.method === "GET") return next();
  res.on("finish", () => {
    if (res.statusCode >= 400 || !req.user) return;
    const segments = req.path.split("/").filter(Boolean);
    AuditLog.create({ actorId: req.user._id, actorName: req.user.name, action: `${req.method}_${segments[0] || "platform"}`, resource: segments[0] || "platform", resourceId: req.params?.id || segments[1] || null, method: req.method, path: req.originalUrl, statusCode: res.statusCode, changes: sanitize(req.body), ipAddress: req.ip, userAgent: req.get("user-agent") || "" }).catch((error) => console.error("Audit log failed:", error.message));
  });
  next();
};
