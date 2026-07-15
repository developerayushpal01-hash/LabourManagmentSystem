const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Labour = require("../models/Labour");
const LabourPayment = require("../models/LabourPayment");
const PayrollSetting = require("../models/PayrollSetting");
const SalaryPayment = require("../models/SalaryPayment");
const SalarySlip = require("../models/SalarySlip");
const { calculateSalary: calculatePayroll, roundMoney } = require("../services/payrollCalculationService");

const getContractorId = (user) => user.role === "CONTRACTOR" ? user._id : user.parentUserId;
const monthRange = (month, year) => ({ start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59, 999) });
const validatePeriod = (month, year) => Number.isInteger(Number(month)) && Number(month) >= 1 && Number(month) <= 12 && Number.isInteger(Number(year));
const cycleDays = (setting, month, year) => setting?.salaryCycle === "FIXED_30_DAYS" ? 30 : new Date(year, month, 0).getDate();
const scope = (req) => ({ companyId: req.user.companyId, contractorId: getContractorId(req.user), isDeleted: false });

const loadInputs = async ({ req, labourId, month, year, session }) => {
  const base = scope(req);
  const labour = await Labour.findOne({ ...base, _id: labourId }).populate("skillId").session(session || null);
  if (!labour) throw Object.assign(new Error("Labour not found"), { statusCode: 404 });
  if (labour.status !== "ACTIVE") throw Object.assign(new Error("Inactive labour salary cannot be calculated"), { statusCode: 400 });
  if (!labour.skillId || labour.skillId.isDeleted || labour.skillId.status !== "ACTIVE") throw Object.assign(new Error("Active skill is required"), { statusCode: 400 });
  const setting = await PayrollSetting.findOne(base).session(session || null);
  const { start, end } = monthRange(month, year);
  const attendanceRecords = await Attendance.find({ ...base, labourId, attendanceDate: { $gte: start, $lte: end } }).session(session || null);
  const advances = await LabourPayment.find({ ...base, labourId, paymentType: "ADVANCE", isAdjusted: { $ne: true }, paymentDate: { $gte: start, $lte: end } }).session(session || null);
  const legacyPayments = await LabourPayment.find({ ...base, labourId, month, year, paymentType: { $in: ["SALARY", "BONUS", "INCENTIVE", "DEDUCTION"] } }).session(session || null);
  const salaryPayments = await SalaryPayment.find({ ...base, labourId, month, year }).session(session || null);
  const total = (records) => roundMoney(records.reduce((sum, item) => sum + Number(item.amount || item.paidAmount || 0), 0));
  return {
    base, labour, skill: labour.skillId, setting: setting || {}, attendanceRecords, advances,
    advance: total(advances), paidAmount: roundMoney(total(salaryPayments) + total(legacyPayments.filter((p) => p.paymentType === "SALARY"))),
    legacyBonus: total(legacyPayments.filter((p) => p.paymentType === "BONUS")),
    legacyIncentive: total(legacyPayments.filter((p) => p.paymentType === "INCENTIVE")),
    legacyDeduction: total(legacyPayments.filter((p) => p.paymentType === "DEDUCTION")),
  };
};

const calculateForLabour = async ({ req, labourId, month, year, body = {}, isFinalized = false, isCancelled = false, session }) => {
  const input = await loadInputs({ req, labourId, month, year, session });
  const result = calculatePayroll({
    ...input, payrollSetting: input.setting,
    bonus: body.bonus ?? input.legacyBonus,
    incentive: body.incentive ?? input.legacyIncentive,
    otherDeductions: body.otherDeductions,
    otherDeduction: body.otherDeduction ?? input.legacyDeduction,
    salaryCycleDays: cycleDays(input.setting, month, year), isFinalized, isCancelled,
  });
  return { input, result, salaryCycleDays: cycleDays(input.setting, month, year) };
};

const previewAllSalaries = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!validatePeriod(month, year)) return res.status(400).json({ success: false, message: "Valid month and year are required" });
    const period = { month: Number(month), year: Number(year) };
    const labours = await Labour.find(scope(req)).sort({ name: 1 });
    const savedSalaries = await SalarySlip.find({ ...scope(req), ...period });
    const savedByLabour = new Map(savedSalaries.map((salary) => [salary.labourId.toString(), salary]));
    const data = [];
    for (const labour of labours) {
      const saved = savedByLabour.get(labour._id.toString());
      if (saved) {
        const salary = saved.toObject();
        const balanceAmount = roundMoney(Math.max(Number(salary.balanceAmount || 0), 0));
        const status = salary.isFinalized ? (balanceAmount <= 0 ? "PAID" : "PENDING") : "DRAFT";
        data.push({ labourId: labour._id, name: labour.name, mobile: labour.mobile, ...period, ...(salary.attendanceSummary || {}), ...salary, labourId: labour._id, name: labour.name, mobile: labour.mobile, balanceAmount, status });
        continue;
      }
      try {
        const { result } = await calculateForLabour({ req, labourId: labour._id, ...period });
        data.push({ labourId: labour._id, name: labour.name, mobile: labour.mobile, ...period, ...result.attendanceSummary, ...result });
      } catch (error) {
        if (error.statusCode !== 400) throw error;
      }
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) { console.error("Salary calculation error:", error); return res.status(500).json({ success: false, message: "Internal server error" }); }
};

const calculateSalary = async (req, res) => {
  try {
    const { labourId, month, year, isFinalized = false } = req.body;
    if (!labourId || !validatePeriod(month, year)) return res.status(400).json({ success: false, message: "Labour, valid month and year are required" });
    if (isFinalized && req.user.role !== "CONTRACTOR") return res.status(403).json({ success: false, message: "Only contractor can finalize salary" });
    const base = scope(req);
    const existing = await SalarySlip.findOne({ ...base, labourId, month: Number(month), year: Number(year) });
    if (existing?.isFinalized) return res.status(409).json({ success: false, message: "Finalized salary cannot be overwritten" });
    const { input, result, salaryCycleDays } = await calculateForLabour({ req, labourId, month: Number(month), year: Number(year), body: req.body, isFinalized: false });
    const salary = await SalarySlip.findOneAndUpdate(
      { ...base, labourId, month: Number(month), year: Number(year) },
      { ...base, labourId, skillId: input.skill._id, month: Number(month), year: Number(year), salaryCycleDays, ...result, advancePaymentIds: input.advances.map((p) => p._id), isFinalized: false, finalizedAt: null, finalizedBy: null, calculatedAt: new Date(), generatedBy: req.user._id, createdBy: existing?.createdBy || req.user._id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    if (isFinalized) { req.params.id = salary._id; return finalizeSalary(req, res); }
    return res.status(200).json({ success: true, message: "Salary calculated successfully", data: salary });
  } catch (error) { console.error("Salary calculation error:", error); return res.status(error.statusCode || 400).json({ success: false, message: error.message || "Salary calculation failed" }); }
};

const getSalaries = async (req, res) => {
  try {
    const { month, year, labourId, status, skillId, search, page = 1, limit = 25 } = req.query;
    const query = { ...scope(req) };
    if (month) query.month = Number(month); if (year) query.year = Number(year); if (labourId) query.labourId = labourId; if (status) query.status = status; if (skillId) query.skillId = skillId;
    if (search) { const ids = await Labour.find({ ...scope(req), $or: [{ name: new RegExp(search, "i") }, { mobile: new RegExp(search, "i") }, { labourCode: new RegExp(search, "i") }] }).distinct("_id"); query.labourId = { $in: ids }; }
    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);
    const [data, total] = await Promise.all([SalarySlip.find(query).populate("labourId", "name mobile labourCode").populate("skillId", "skillName").sort({ year: -1, month: -1 }).skip(skip).limit(Math.min(Number(limit), 100)), SalarySlip.countDocuments(query)]);
    return res.status(200).json({ success: true, count: data.length, total, page: Number(page), data });
  } catch (error) { return res.status(500).json({ success: false, message: "Internal server error" }); }
};

const getSalaryById = async (req, res) => {
  try {
    const salary = await SalarySlip.findOne({ ...scope(req), _id: req.params.id }).populate("labourId", "name mobile labourCode").populate("skillId", "skillName");
    if (!salary) return res.status(404).json({ success: false, message: "Salary not found" });
    const payments = await SalaryPayment.find({ ...scope(req), salaryId: salary._id }).sort({ paymentDate: -1 });
    return res.status(200).json({ success: true, data: { salary, payments } });
  } catch (error) { return res.status(500).json({ success: false, message: "Internal server error" }); }
};

const finalizeSalary = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let salary;
    await session.withTransaction(async () => {
      const existing = await SalarySlip.findOne({ ...scope(req), _id: req.params.id }).session(session);
      if (!existing) throw Object.assign(new Error("Salary not found"), { statusCode: 404 });
      if (existing.isFinalized) throw Object.assign(new Error("Salary is already finalized"), { statusCode: 409 });
      const calculated = await calculateForLabour({ req, labourId: existing.labourId, month: existing.month, year: existing.year, body: existing.toObject(), isFinalized: true, session });
      Object.assign(existing, calculated.result, { salaryCycleDays: calculated.salaryCycleDays, skillId: calculated.input.skill._id, advancePaymentIds: calculated.input.advances.map((p) => p._id), isFinalized: true, finalizedAt: new Date(), finalizedBy: req.user._id, calculatedAt: new Date() });
      existing.status = existing.balanceAmount <= 0 ? "PAID" : "PENDING";
      salary = await existing.save({ session });
      if (calculated.input.advances.length) await LabourPayment.updateMany({ _id: { $in: calculated.input.advances.map((p) => p._id) }, isAdjusted: { $ne: true } }, { $set: { isAdjusted: true, adjustedSalaryId: existing._id, adjustedAt: new Date() } }, { session });
    });
    return res.status(200).json({ success: true, message: "Salary finalized successfully", data: salary });
  } catch (error) { return res.status(error.statusCode || 400).json({ success: false, message: error.message }); } finally { await session.endSession(); }
};

const paySalaryById = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: "Payment amount must be greater than zero" });
    let output;
    await session.withTransaction(async () => {
      const salary = await SalarySlip.findOne({ ...scope(req), _id: req.params.id }).session(session);
      if (!salary) throw Object.assign(new Error("Salary not found"), { statusCode: 404 });
      if (!salary.isFinalized) throw Object.assign(new Error("Draft salary cannot be paid"), { statusCode: 400 });
      const [payment] = await SalaryPayment.create([{ salaryId: salary._id, companyId: salary.companyId, contractorId: salary.contractorId, labourId: salary.labourId, month: salary.month, year: salary.year, payableAmount: salary.finalNetSalary, paidAmount: amount, paymentMode: req.body.paymentMode || "CASH", paymentDate: req.body.paymentDate || new Date(), remarks: req.body.remarks || "", paidBy: req.user._id }], { session });
      const totals = await SalaryPayment.aggregate([{ $match: { salaryId: salary._id, isDeleted: false } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]).session(session);
      salary.paidAmount = roundMoney(totals[0]?.total || 0); salary.balanceAmount = roundMoney(Math.max(salary.finalNetSalary - salary.paidAmount, 0)); salary.excessPaidAmount = roundMoney(Math.max(salary.paidAmount - salary.finalNetSalary, 0)); salary.status = salary.balanceAmount <= 0 ? "PAID" : "PENDING";
      await salary.save({ session }); output = { payment, salary };
    });
    return res.status(201).json({ success: true, message: "Salary payment added successfully", data: output });
  } catch (error) { return res.status(error.statusCode || 400).json({ success: false, message: error.message }); } finally { await session.endSession(); }
};

const getSalarySummary = async (req, res) => {
  try {
    const match = { ...scope(req) }; if (req.query.month) match.month = Number(req.query.month); if (req.query.year) match.year = Number(req.query.year);
    const rows = await SalarySlip.find(match).lean(); const sum = (key) => roundMoney(rows.reduce((n, row) => n + Number(row[key] || 0), 0));
    const statusCounts = { DRAFT: 0, UNPAID: 0, PARTIALLY_PAID: 0, PAID: 0, OVERPAID: 0, CANCELLED: 0 }; rows.forEach((row) => { if (statusCounts[row.status] !== undefined) statusCounts[row.status] += 1; });
    return res.status(200).json({ success: true, data: { totalLabours: rows.length, totalGross: sum("grossSalary"), totalEmployeePF: sum("employeePF"), totalEmployeeESIC: sum("employeeESIC"), totalAdvance: sum("advance"), totalOtherDeduction: sum("otherDeduction"), totalNetSalary: sum("finalNetSalary"), totalEmployerPF: sum("employerPF"), totalEmployerESIC: sum("employerESIC"), totalCTC: sum("ctc"), totalPaid: sum("paidAmount"), totalBalance: sum("balanceAmount"), statusCounts } });
  } catch (error) { return res.status(500).json({ success: false, message: "Internal server error" }); }
};

const calculateLabourSalary = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!validatePeriod(month, year)) return res.status(400).json({ success: false, message: "Valid month and year are required" });
    const { input, result } = await calculateForLabour({ req, labourId: req.params.labourId, month: Number(month), year: Number(year) });
    return res.status(200).json({ success: true, data: { labourId: input.labour._id, name: input.labour.name, mobile: input.labour.mobile, month: Number(month), year: Number(year), ...result.attendanceSummary, ...result, attendance: input.attendanceRecords } });
  } catch (error) { return res.status(error.statusCode || 400).json({ success: false, message: error.message }); }
};
const generateSalarySlip = calculateSalary;
const generateAllSalarySlips = async (req, res) => { req.query = req.body; return previewAllSalaries(req, res); };
const paySalary = async (req, res) => {
  const salary = await SalarySlip.findOne({ ...scope(req), labourId: req.body.labourId, month: Number(req.body.month), year: Number(req.body.year) });
  if (!salary) return res.status(404).json({ success: false, message: "Generate and finalize salary before payment" });
  req.params.id = salary._id; req.body.amount = req.body.amount ?? req.body.paidAmount; return paySalaryById(req, res);
};

module.exports = { previewAllSalaries, calculateSalary, calculateLabourSalary, getSalaries, getSalaryById, finalizeSalary, paySalaryById, getSalarySummary, generateSalarySlip, generateAllSalarySlips, paySalary };
