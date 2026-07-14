"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Navbar from "@/app/components/navbar"
import Sidebar from "@/app/components/sidebar"
import { useToast } from "@/app/components/toast-provider"
import { apiUrl } from "@/lib/api"

type Site = { _id: string; siteName: string; siteCode?: string }
type Labour = { _id: string; labourCode: string; name: string; mobile: string; dailyWage?: number | null; finalDailyWage: number; skillId: { skillName: string } | null; site: Site | null }
type Salary = {
  labourId: string; name: string; mobile: string; month: number; year: number
  presentDays: number; halfDays: number; absentDays: number; leaveDays: number; holidayDays: number
  basicSalary: number; hra: number; otherAllowance: number; bonus: number; incentive: number; overtimeAmount: number; grossSalary: number
  pfEmployee: number; esicEmployee: number; advance: number; otherDeduction: number; netSalary: number
  pfEmployer: number; esicEmployer: number; ctc: number; paidAmount: number; balanceAmount: number
  status: "PENDING" | "PARTIAL" | "PAID"
}
type Setting = {
  pfEmployeePercent: number; pfEmployerPercent: number; esicEmployeePercent: number; esicEmployerPercent: number
  isPFEnabled: boolean; isESICEnabled: boolean; hraType: "PERCENT" | "FIXED"; hraValue: number
  otherAllowanceType: "PERCENT" | "FIXED"; otherAllowanceValue: number; salaryCycle: string; roundOffSalary: boolean
}
type Api<T> = { success: boolean; data?: T; message?: string }

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
const pad = (value: number) => String(value).padStart(2, "0")

export default function PayrollPage() {
  const { showToast } = useToast()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [labours, setLabours] = useState<Labour[]>([])
  const [setting, setSetting] = useState<Setting | null>(null)
  const [query, setQuery] = useState("")
  const [siteId, setSiteId] = useState("")
  const [status, setStatus] = useState("")
  const [selected, setSelected] = useState<Salary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [salaryResponse, settingResponse, labourResponse] = await Promise.all([
        fetch(apiUrl(`/salary/calculate?month=${month}&year=${year}`), { credentials: "include" }),
        fetch(apiUrl("/payroll-settings/get-payrollsetting"), { credentials: "include" }),
        fetch(apiUrl("/labours/get-labours"), { credentials: "include" }),
      ])
      const salaryResult = await salaryResponse.json() as Api<Salary[]>
      const settingResult = await settingResponse.json() as Api<Setting>
      const labourResult = await labourResponse.json() as Api<Labour[]>
      if (!salaryResponse.ok || !salaryResult.success) throw new Error(salaryResult.message || "Salary data could not be loaded.")
      if (!settingResponse.ok || !settingResult.success) throw new Error(settingResult.message || "Payroll settings could not be loaded.")
      setSalaries(salaryResult.data || [])
      setSetting(settingResult.data || null)
      setLabours(labourResult.data || [])
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Payroll could not be loaded.", "error")
    } finally { setLoading(false) }
  }, [month, year, showToast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const labourById = useMemo(() => new Map(labours.map((labour) => [labour._id, labour])), [labours])
  const sites = useMemo(() => {
    const map = new Map<string, Site>()
    labours.forEach((labour) => { if (labour.site) map.set(labour.site._id, labour.site) })
    return [...map.values()]
  }, [labours])
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase()
    return salaries.filter((salary) => {
      const labour = labourById.get(salary.labourId)
      const matchesText = !text || [salary.name, salary.mobile, labour?.labourCode || ""].some((value) => value.toLowerCase().includes(text))
      const matchesSite = !siteId || labour?.site?._id === siteId
      return matchesText && matchesSite && (!status || salary.status === status)
    })
  }, [labourById, query, salaries, siteId, status])

  const sum = (key: keyof Salary) => visible.reduce((total, row) => total + Number(row[key] || 0), 0)
  const employeeDeductions = sum("pfEmployee") + sum("esicEmployee") + sum("advance") + sum("otherDeduction")
  const employerContributions = sum("pfEmployer") + sum("esicEmployer")

  const selectMonth = (value: string) => {
    const [nextYear, nextMonth] = value.split("-").map(Number)
    setYear(nextYear); setMonth(nextMonth)
  }
  const exportSalary = async () => {
    setExporting(true)
    try {
      const response = await fetch(apiUrl(`/export/salary?month=${month}&year=${year}`), { credentials: "include" })
      if (!response.ok) throw new Error("Salary export failed.")
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `Salary_${year}_${pad(month)}.xlsx`; anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) { showToast(error instanceof Error ? error.message : "Salary export failed.", "error") } finally { setExporting(false) }
  }

  return <div className="flex h-screen overflow-hidden bg-[#f7f8fc]"><Sidebar /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Navbar />
    <main className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs text-slate-500">Dashboard / <span className="font-semibold text-indigo-600">Payroll</span></p><h1 className="mt-2 text-2xl font-bold text-slate-950">Salary &amp; Statutory Overview</h1><p className="mt-1 text-sm text-slate-500">Complete earnings, deductions, PF, ESIC, employer contribution and payment status.</p></div><button onClick={exportSalary} disabled={exporting} className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">{exporting ? "Exporting..." : "Export Salary"}</button></header>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[["Gross Salary", sum("grossSalary"), "text-indigo-700"], ["Employee Deductions", employeeDeductions, "text-red-600"], ["Employer Contribution", employerContributions, "text-violet-600"], ["Total CTC", sum("ctc"), "text-sky-700"], ["Net Salary", sum("netSalary"), "text-emerald-700"], ["Balance Payable", sum("balanceAmount"), "text-amber-700"]].map(([label, value, color]) => <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p><strong className={`mt-2 block text-lg ${color}`}>{money.format(Number(value))}</strong></div>)}
      </section>

      {setting && <section className="mt-4 grid gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 text-xs sm:grid-cols-2 lg:grid-cols-6">
        <div><span className="block text-[9px] uppercase text-slate-400">Employee PF</span><strong className="text-indigo-700">{setting.isPFEnabled ? `${setting.pfEmployeePercent}%` : "Disabled"}</strong></div>
        <div><span className="block text-[9px] uppercase text-slate-400">Employer PF</span><strong className="text-indigo-700">{setting.isPFEnabled ? `${setting.pfEmployerPercent}%` : "Disabled"}</strong></div>
        <div><span className="block text-[9px] uppercase text-slate-400">Employee ESIC</span><strong className="text-indigo-700">{setting.isESICEnabled ? `${setting.esicEmployeePercent}%` : "Disabled"}</strong></div>
        <div><span className="block text-[9px] uppercase text-slate-400">Employer ESIC</span><strong className="text-indigo-700">{setting.isESICEnabled ? `${setting.esicEmployerPercent}%` : "Disabled"}</strong></div>
        <div><span className="block text-[9px] uppercase text-slate-400">HRA</span><strong className="text-indigo-700">{setting.hraValue}{setting.hraType === "PERCENT" ? "%" : " INR"}</strong></div>
        <div><span className="block text-[9px] uppercase text-slate-400">Salary Cycle</span><strong className="text-indigo-700">{setting.salaryCycle}</strong></div>
      </section>}

      <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search labour name, code or mobile..." className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500" /><input type="month" value={`${year}-${pad(month)}`} onChange={(e) => selectMonth(e.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm" /><select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">All Sites</option>{sites.map((site) => <option key={site._id} value={site._id}>{site.siteName}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">All Payment Status</option><option value="PENDING">Pending</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option></select></div>
        <div className="max-h-[65vh] overflow-auto"><table className="min-w-[2150px] w-full text-left"><thead className="text-[9px] uppercase text-slate-500"><tr>{["Labour", "Attendance", "Daily Wage", "Wage Basis", "Basic", "HRA", "Allowance", "Bonus", "Incentive", "Overtime", "Gross", "Employee PF", "Employee ESIC", "Advance", "Other Deduction", "Net Salary", "Employer PF", "Employer ESIC", "CTC", "Paid", "Balance", "Status"].map((heading, index) => <th key={heading} className={`sticky top-0 z-20 whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-3 py-3 ${index === 0 ? "left-0 z-30" : ""}`}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map((salary) => { const labour = labourById.get(salary.labourId); return <tr key={salary.labourId} onClick={() => setSelected(salary)} className="cursor-pointer hover:bg-indigo-50/40"><td className="sticky left-0 z-10 min-w-52 border-r bg-white px-3 py-3"><strong className="block text-xs">{salary.name}</strong><span className="text-[9px] text-slate-400">{labour?.labourCode || "-"} / {labour?.site?.siteName || "No site"}</span></td><td className="border-r px-3 text-[10px]"><span className="text-emerald-600">P {salary.presentDays}</span> / <span className="text-amber-600">HD {salary.halfDays}</span> / <span className="text-red-600">A {salary.absentDays}</span> / <span className="text-violet-600">PH {salary.holidayDays}</span></td><td className="whitespace-nowrap border-r px-3 text-xs font-semibold text-indigo-700">{money.format(labour?.finalDailyWage || 0)}</td><td className="whitespace-nowrap border-r px-3 text-[10px]"><span className={`rounded-full px-2 py-1 font-bold ${labour?.dailyWage != null ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>{labour?.dailyWage != null ? "CUSTOM" : "SKILL BASED"}</span><span className="mt-1 block text-[9px] text-slate-400">{labour?.skillId?.skillName || "No skill"}</span></td>{(["basicSalary","hra","otherAllowance","bonus","incentive","overtimeAmount","grossSalary","pfEmployee","esicEmployee","advance","otherDeduction","netSalary","pfEmployer","esicEmployer","ctc","paidAmount","balanceAmount"] as (keyof Salary)[]).map((key) => <td key={key} className={`whitespace-nowrap border-r px-3 text-xs ${key === "netSalary" ? "font-bold text-emerald-700" : key === "balanceAmount" ? "font-bold text-amber-700" : ""}`}>{money.format(Number(salary[key]))}</td>)}<td className="px-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${salary.status === "PAID" ? "bg-emerald-100 text-emerald-700" : salary.status === "PARTIAL" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{salary.status}</span></td></tr> })}</tbody></table></div>
        {loading && <div className="p-12 text-center text-sm text-slate-500">Calculating salary and statutory contributions...</div>}
        {!loading && !visible.length && <div className="p-12 text-center text-sm text-slate-500">No salary records found for these filters.</div>}
        <div className="border-t bg-slate-50 px-4 py-3 text-[10px] text-slate-500">Showing {visible.length} labour salary records. Click any row for the complete salary breakup.</div>
      </section>
    </main>

    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null) }}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs text-indigo-600">Complete Salary Breakup</p><h2 className="mt-1 text-xl font-bold">{selected.name}</h2><p className="text-xs text-slate-400">{labourById.get(selected.labourId)?.labourCode} / {month}-{year}</p></div><button onClick={() => setSelected(null)} className="text-2xl text-slate-400">&times;</button></div>
      <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-lg bg-indigo-50 p-3"><span className="text-[9px] uppercase text-slate-400">Daily Wage</span><strong className="block text-lg text-indigo-700">{money.format(labourById.get(selected.labourId)?.finalDailyWage || 0)}</strong><span className="text-[9px] text-slate-500">{labourById.get(selected.labourId)?.dailyWage != null ? "Custom wage" : `Skill based - ${labourById.get(selected.labourId)?.skillId?.skillName || "No skill"}`}</span></div>{[["Present Days", selected.presentDays], ["Half Days", selected.halfDays], ["Absent Days", selected.absentDays], ["Paid Holidays", selected.holidayDays]].map(([label,value]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-3"><span className="text-[9px] uppercase text-slate-400">{label}</span><strong className="block text-lg">{value}</strong></div>)}</div>
      {[{ title: "Earnings", items: [["Basic Salary",selected.basicSalary],["HRA",selected.hra],["Other Allowance",selected.otherAllowance],["Bonus",selected.bonus],["Incentive",selected.incentive],["Overtime",selected.overtimeAmount],["Gross Salary",selected.grossSalary]] }, { title: "Employee Deductions", items: [["Employee PF",selected.pfEmployee],["Employee ESIC",selected.esicEmployee],["Advance",selected.advance],["Other Deduction",selected.otherDeduction],["Net Salary",selected.netSalary]] }, { title: "Employer Contributions & CTC", items: [["Employer PF",selected.pfEmployer],["Employer ESIC",selected.esicEmployer],["Total CTC",selected.ctc]] }, { title: "Payment", items: [["Paid Amount",selected.paidAmount],["Balance Payable",selected.balanceAmount]] }].map((group) => <section key={group.title} className="mt-5 rounded-lg border border-slate-200 p-4"><h3 className="border-b pb-3 text-sm font-bold">{group.title}</h3><dl className="mt-2 divide-y">{group.items.map(([label,value]) => <div key={String(label)} className="flex justify-between py-2 text-xs"><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{money.format(Number(value))}</dd></div>)}</dl></section>)}
    </aside></div>}
  </div></div>
}
