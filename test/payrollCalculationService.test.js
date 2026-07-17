const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateSalary } = require("../src/services/payrollCalculationService");

const base = (overrides = {}) => calculateSalary({
  labour: { dailyWage: 800, isPFApplicable: true, pfUanNumber: "100000000001", isESICApplicable: true, esicIpNumber: "1000000001" },
  skill: { defaultDailyWage: 600, overtimeRate: 120 },
  attendanceRecords: [{ status: "PRESENT", overtimeHours: 0 }],
  payrollSetting: { basicPercentage: 40, hraPercentage: 20, allowanceCalculationMode: "REMAINING", isPFEnabled: false, isESICEnabled: false, roundOffSalary: false },
  salaryCycleDays: 30,
  isFinalized: true,
  ...overrides,
});

test("custom daily wage", () => assert.equal(base().wageBasis, "CUSTOM"));
test("skill based daily wage", () => assert.deepEqual([base({ labour: { dailyWage: null } }).dailyWage, base({ labour: { dailyWage: null } }).wageBasis], [600, "SKILL_BASED"]));
test("present attendance only", () => assert.equal(base({ attendanceRecords: [{ status: "PRESENT" }, { status: "PRESENT" }] }).attendanceEarnings, 1600));
test("present and half-day attendance", () => assert.equal(base({ attendanceRecords: [{ status: "PRESENT" }, { status: "HALF_DAY" }] }).attendanceSummary.payableDays, 1.5));
test("paid leave enabled", () => assert.equal(base({ attendanceRecords: [{ status: "LEAVE" }], payrollSetting: { isPaidLeaveEnabled: true, isPFEnabled: false, isESICEnabled: false, roundOffSalary: false } }).attendanceEarnings, 800));
test("paid holiday enabled", () => assert.equal(base({ attendanceRecords: [{ status: "HOLIDAY" }], payrollSetting: { isPaidHolidayEnabled: true, isPFEnabled: false, isESICEnabled: false, roundOffSalary: false } }).attendanceEarnings, 800));
test("paid weekly off enabled", () => assert.equal(base({ attendanceRecords: [{ status: "WEEKLY_OFF" }], payrollSetting: { isPaidWeeklyOffEnabled: true, isPFEnabled: false, isESICEnabled: false, roundOffSalary: false } }).attendanceEarnings, 800));
test("PF disabled", () => assert.equal(base().employeePF, 0));
test("ESIC disabled", () => assert.equal(base().employeeESIC, 0));
test("PF and ESIC enabled", () => { const value=base({ payrollSetting: { basicPercentage:40,hraPercentage:20,isPFEnabled:true,isESICEnabled:true,employeePFPercentage:12,employeeESICPercentage:0.75,roundOffSalary:false } }); assert.deepEqual([value.employeePF,value.employeeESIC],[38.4,6]); });
test("bonus and incentive", () => assert.equal(base({ bonus: 100, incentive: 50 }).grossSalary, 950));
test("overtime from approved amount", () => assert.equal(base({ attendanceRecords: [{ status:"PRESENT",overtimeHours:2,overtimeAmount:500 }] }).overtime, 500));
test("overtime from hours and rate", () => assert.equal(base({ attendanceRecords: [{ status:"PRESENT",overtimeHours:2 }] }).overtime, 240));
test("advance deduction", () => assert.equal(base({ advance: 100 }).totalDeduction, 100));
test("multiple other deductions", () => assert.equal(base({ otherDeductions: [{title:"Canteen",amount:20},{title:"Uniform",amount:30}] }).otherDeduction, 50));
test("no payment gives UNPAID", () => assert.equal(base().status, "UNPAID"));
test("partial payment gives PARTIALLY_PAID", () => assert.equal(base({ paidAmount: 100 }).status, "PARTIALLY_PAID"));
test("full payment gives PAID", () => assert.equal(base({ paidAmount: 800 }).status, "PAID"));
test("excess payment gives OVERPAID", () => assert.equal(base({ paidAmount: 900 }).status, "OVERPAID"));
test("draft salary gives DRAFT", () => assert.equal(base({ isFinalized: false }).status, "DRAFT"));
test("negative allowance validation", () => assert.throws(() => base({ payrollSetting: { basicPercentage: 100, hraPercentage: 20, isPFEnabled:false,isESICEnabled:false } }), /exceed attendance/));
test("deductions greater than gross validation", () => assert.throws(() => base({ advance: 900 }), /cannot exceed gross/));
test("negative bonus validation", () => assert.throws(() => base({ bonus: -1 }), /Bonus cannot be negative/));
test("negative overtime validation", () => assert.throws(() => base({ attendanceRecords:[{status:"PRESENT",overtimeHours:-1}] }), /Overtime hours cannot be negative/));
test("salary components never double count attendance earnings", () => { const value=base(); assert.equal(value.basic+value.hra+value.allowance,value.attendanceEarnings); assert.equal(value.grossSalary,value.attendanceEarnings); });
test("PF ceiling is respected", () => { const value=base({ attendanceRecords:Array.from({length:30},()=>({status:"PRESENT"})), payrollSetting:{basicPercentage:100,hraPercentage:0,isPFEnabled:true,isESICEnabled:false,pfWageCeilingEnabled:true,pfWageCeiling:15000,employeePFPercentage:12,roundOffSalary:false} }); assert.equal(value.employeePF,1800); });
test("ESIC ceiling controls eligibility", () => { const value=base({ attendanceRecords:Array.from({length:30},()=>({status:"PRESENT"})), payrollSetting:{isPFEnabled:false,isESICEnabled:true,esicWageCeilingEnabled:true,esicWageCeiling:21000,roundOffSalary:false} }); assert.equal(value.employeeESIC,0); });
test("PF requires valid UAN number", () => { const value=base({ labour:{dailyWage:800,isPFApplicable:true,pfUanNumber:"",isESICApplicable:false}, payrollSetting:{isPFEnabled:true,isESICEnabled:false,employeePFPercentage:12,roundOffSalary:false} }); assert.equal(value.employeePF,0); });
test("ESIC requires valid IP number", () => { const value=base({ labour:{dailyWage:800,isPFApplicable:false,isESICApplicable:true,esicIpNumber:""}, payrollSetting:{isPFEnabled:false,isESICEnabled:true,employeeESICPercentage:0.75,roundOffSalary:false} }); assert.equal(value.employeeESIC,0); });
test("final supplied example", () => { const result=calculateSalary({ labour:{dailyWage:800,isPFApplicable:true,pfUanNumber:"100000000001",isESICApplicable:true,esicIpNumber:"1000000001"}, skill:{defaultDailyWage:600,overtimeRate:120}, attendanceRecords:[...Array.from({length:24},()=>({status:"PRESENT"})),{status:"HALF_DAY",overtimeHours:10},{status:"HALF_DAY"}], payrollSetting:{basicPercentage:40,hraPercentage:20,isPFEnabled:true,isESICEnabled:true,employeePFPercentage:12,employerPFPercentage:12,employeeESICPercentage:0.75,employerESICPercentage:3.25,roundOffSalary:false}, bonus:1000,incentive:500,advance:2000,otherDeduction:300,paidAmount:15000,isFinalized:true }); assert.deepEqual({payableDays:result.attendanceSummary.payableDays,attendanceEarnings:result.attendanceEarnings,basic:result.basic,hra:result.hra,allowance:result.allowance,overtime:result.overtime,grossSalary:result.grossSalary,employeePF:result.employeePF,employeeESIC:result.employeeESIC,totalDeduction:result.totalDeduction,netSalary:result.netSalary,employerPF:result.employerPF,employerESIC:result.employerESIC,ctc:result.ctc,balanceAmount:result.balanceAmount,status:result.status},{payableDays:25,attendanceEarnings:20000,basic:8000,hra:1600,allowance:10400,overtime:1200,grossSalary:22700,employeePF:960,employeeESIC:170.25,totalDeduction:3430.25,netSalary:19269.75,employerPF:960,employerESIC:737.75,ctc:24397.75,balanceAmount:4269.75,status:"PARTIALLY_PAID"}); });



