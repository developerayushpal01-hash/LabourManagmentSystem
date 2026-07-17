const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toPaise = (value) => Math.round(Number(value || 0) * 100);

const calculateSalaryStatus = ({ isFinalized, isCancelled, netSalary, paidAmount }) => {
  if (isCancelled) return "CANCELLED";
  if (!isFinalized) return "DRAFT";
  const net = toPaise(netSalary);
  const paid = toPaise(paidAmount);
  if (paid <= 0) return "UNPAID";
  if (paid < net) return "PARTIALLY_PAID";
  if (paid === net) return "PAID";
  return "OVERPAID";
};

const nonNegative = (value, label) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} cannot be negative`);
  return number;
};

const calculateSalary = ({
  labour,
  skill,
  attendanceRecords = [],
  payrollSetting = {},
  bonus = 0,
  incentive = 0,
  otherDeductions = [],
  otherDeduction = 0,
  advance = 0,
  paidAmount = 0,
  salaryCycleDays = 30,
  isFinalized = false,
  isCancelled = false,
}) => {
  const customWage = labour?.dailyWage !== null && labour?.dailyWage !== undefined;
  const dailyWage = nonNegative(customWage ? labour.dailyWage : skill?.defaultDailyWage, "Daily wage");
  if (!dailyWage) throw new Error("Daily wage must be available");

  const attendanceSummary = {
    presentDays: 0, halfDays: 0, absentDays: 0, leaveDays: 0, holidayDays: 0,
    weeklyOffDays: 0, paidLeaveDays: 0, paidHolidayDays: 0, paidWeeklyOffDays: 0, payableDays: 0,
  };
  let overtimeHours = 0;
  let overtime = 0;
  const defaultOvertimeRate = nonNegative(
    labour?.overtimeRate ?? skill?.overtimeRate ?? skill?.otRatePerHour ?? payrollSetting.overtimeRate ?? 0,
    "Overtime rate"
  );

  attendanceRecords.forEach((record) => {
    if (record.status === "PRESENT") attendanceSummary.presentDays += 1;
    else if (record.status === "HALF_DAY") attendanceSummary.halfDays += 1;
    else if (record.status === "ABSENT") attendanceSummary.absentDays += 1;
    else if (record.status === "LEAVE") attendanceSummary.leaveDays += 1;
    else if (record.status === "HOLIDAY") attendanceSummary.holidayDays += 1;
    else if (record.status === "WEEKLY_OFF") attendanceSummary.weeklyOffDays += 1;

    const hours = nonNegative(record.overtimeHours, "Overtime hours");
    overtimeHours += hours;
    if (record.overtimeAmount !== null && record.overtimeAmount !== undefined) {
      overtime += nonNegative(record.overtimeAmount, "Overtime amount");
    } else {
      overtime += hours * nonNegative(record.overtimeRate ?? defaultOvertimeRate, "Overtime rate");
    }
  });

  attendanceSummary.paidLeaveDays = payrollSetting.isPaidLeaveEnabled ? attendanceSummary.leaveDays : 0;
  attendanceSummary.paidHolidayDays = payrollSetting.isPaidHolidayEnabled ? attendanceSummary.holidayDays : 0;
  attendanceSummary.paidWeeklyOffDays = payrollSetting.isPaidWeeklyOffEnabled ? attendanceSummary.weeklyOffDays : 0;
  attendanceSummary.payableDays = roundMoney(
    attendanceSummary.presentDays + attendanceSummary.halfDays * 0.5 + attendanceSummary.paidLeaveDays +
    attendanceSummary.paidHolidayDays + attendanceSummary.paidWeeklyOffDays
  );

  const attendanceEarnings = roundMoney(dailyWage * attendanceSummary.payableDays);
  const basicPercentage = nonNegative(payrollSetting.basicPercentage ?? 40, "Basic percentage");
  const hraPercentage = nonNegative(payrollSetting.hraPercentage ?? payrollSetting.hraValue ?? 20, "HRA percentage");
  if (basicPercentage > 100 || hraPercentage > 100) throw new Error("Basic and HRA percentages cannot exceed 100");
  const basic = roundMoney(attendanceEarnings * basicPercentage / 100);
  const hra = roundMoney(basic * hraPercentage / 100);
  const allowanceMode = payrollSetting.allowanceCalculationMode ?? "REMAINING";
  let allowance;
  if (allowanceMode === "FIXED") allowance = roundMoney(nonNegative(payrollSetting.allowanceValue ?? payrollSetting.otherAllowanceValue, "Allowance") * (attendanceSummary.payableDays / Math.max(Number(salaryCycleDays), 1)));
  else if (allowanceMode === "PERCENTAGE") allowance = roundMoney(attendanceEarnings * nonNegative(payrollSetting.allowanceValue ?? payrollSetting.otherAllowanceValue, "Allowance percentage") / 100);
  else allowance = roundMoney(attendanceEarnings - basic - hra);
  if (allowance < 0) throw new Error("Basic and HRA cannot exceed attendance earnings");
  if (toPaise(basic + hra + allowance) !== toPaise(attendanceEarnings)) {
    throw new Error("Configured Basic, HRA and Allowance must equal attendance earnings");
  }

  bonus = roundMoney(nonNegative(bonus, "Bonus"));
  incentive = roundMoney(nonNegative(incentive, "Incentive"));
  overtime = roundMoney(overtime);
  overtimeHours = roundMoney(overtimeHours);
  const grossSalary = roundMoney(attendanceEarnings + bonus + incentive + overtime);

  const pfEnabled = payrollSetting.isPFEnabled !== false && labour?.isPFApplicable === true && /^\d{12}$/.test(String(labour?.pfUanNumber || ""));
  const pfWage = roundMoney(payrollSetting.pfWageCeilingEnabled ? Math.min(basic, nonNegative(payrollSetting.pfWageCeiling ?? 15000, "PF wage ceiling")) : basic);
  const employeePF = roundMoney(pfEnabled ? pfWage * nonNegative(payrollSetting.employeePFPercentage ?? payrollSetting.pfEmployeePercent ?? 12, "Employee PF percentage") / 100 : 0);
  const employerPF = roundMoney(pfEnabled ? pfWage * nonNegative(payrollSetting.employerPFPercentage ?? payrollSetting.pfEmployerPercent ?? 12, "Employer PF percentage") / 100 : 0);

  const esicWage = grossSalary;
  const esicLimit = !payrollSetting.esicWageCeilingEnabled || esicWage <= nonNegative(payrollSetting.esicWageCeiling ?? 21000, "ESIC wage ceiling");
  const esicEnabled = payrollSetting.isESICEnabled !== false && labour?.isESICApplicable === true && /^\d{10}$/.test(String(labour?.esicIpNumber || "")) && esicLimit;
  const employeeESIC = roundMoney(esicEnabled ? esicWage * nonNegative(payrollSetting.employeeESICPercentage ?? payrollSetting.esicEmployeePercent ?? 0.75, "Employee ESIC percentage") / 100 : 0);
  const employerESIC = roundMoney(esicEnabled ? esicWage * nonNegative(payrollSetting.employerESICPercentage ?? payrollSetting.esicEmployerPercent ?? 3.25, "Employer ESIC percentage") / 100 : 0);

  const normalizedDeductions = Array.isArray(otherDeductions) ? otherDeductions.map((item) => {
    if (!item?.title?.trim()) throw new Error("Other deduction title is required");
    return { title: item.title.trim(), amount: roundMoney(nonNegative(item.amount, "Other deduction")), remarks: item.remarks?.trim() || "" };
  }) : [];
  const itemDeduction = normalizedDeductions.reduce((sum, item) => sum + item.amount, 0);
  otherDeduction = roundMoney(itemDeduction || nonNegative(otherDeduction, "Other deduction"));
  advance = roundMoney(nonNegative(advance, "Advance"));
  paidAmount = roundMoney(nonNegative(paidAmount, "Paid amount"));
  const totalDeduction = roundMoney(employeePF + employeeESIC + advance + otherDeduction);
  const unroundedNetSalary = roundMoney(grossSalary - totalDeduction);
  if (unroundedNetSalary < 0 && payrollSetting.allowNegativeSalary !== true) throw new Error("Total deductions cannot exceed gross salary");
  const finalNetSalary = payrollSetting.roundOffSalary !== false ? Math.round(unroundedNetSalary) : unroundedNetSalary;
  const roundOffAmount = roundMoney(finalNetSalary - unroundedNetSalary);
  const balanceAmount = roundMoney(Math.max(finalNetSalary - paidAmount, 0));
  const excessPaidAmount = roundMoney(Math.max(paidAmount - finalNetSalary, 0));
  const ctc = roundMoney(grossSalary + employerPF + employerESIC);

  return {
    dailyWage, wageBasis: customWage ? "CUSTOM" : "SKILL_BASED", attendanceSummary, attendanceEarnings,
    basic, basicSalary: basic, hra, allowance, otherAllowance: allowance, bonus, incentive,
    overtimeHours, overtimeRate: defaultOvertimeRate, overtime, overtimeAmount: overtime, grossSalary,
    pfWage, employeePF, pfEmployee: employeePF, esicWage, employeeESIC, esicEmployee: employeeESIC,
    advance, otherDeductions: normalizedDeductions, otherDeduction, totalDeduction,
    netSalary: finalNetSalary, roundOffAmount, finalNetSalary,
    employerPF, pfEmployer: employerPF, employerESIC, esicEmployer: employerESIC, ctc,
    paidAmount, balanceAmount, excessPaidAmount,
    status: calculateSalaryStatus({ isFinalized, isCancelled, netSalary: finalNetSalary, paidAmount }),
  };
};

module.exports = { calculateSalary, calculateSalaryStatus, roundMoney, toPaise };


