"use client"

import { useMemo, useState } from "react"
import PageLoader from "@/app/components/page-loader"
import { BarChart, DonutChart, Filters, money, ReportActions, pad, ReportPage, Stat } from "../_components/report-ui"
import { useReportData } from "../_components/use-report-data"

export default function PfEsicReportPage() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`)
  const [siteId, setSiteId] = useState("")
  const [query, setQuery] = useState("")
  const [scheme, setScheme] = useState("ALL")
  const { salaries, sites, labourMap, loading } = useReportData(month)

  const rows = useMemo(() => salaries.filter((salary) => {
    const labour = labourMap.get(salary.labourId)
    const search = query.trim().toLowerCase()
    const pfApplicable = Boolean(labour?.isPFApplicable)
    const esicApplicable = Boolean(labour?.isESICApplicable)
    return (!siteId || labour?.site?._id === siteId)
      && (!search || [salary.name, salary.mobile, labour?.labourCode, labour?.pfUanNumber, labour?.esicIpNumber].some((value) => String(value || "").toLowerCase().includes(search)))
      && (scheme === "ALL" ? pfApplicable || esicApplicable : scheme === "PF" ? pfApplicable : esicApplicable)
  }), [salaries, labourMap, query, scheme, siteId])

  const sum = (key: "pfWage" | "pfEmployee" | "pfEmployer" | "esicEmployee" | "esicEmployer") => rows.reduce((total, row) => total + Number(row[key] || 0), 0)
  const esicWage = rows.reduce((total, row) => total + Number(row.esicWage ?? row.grossSalary ?? 0), 0)
  const employeeTotal = sum("pfEmployee") + sum("esicEmployee")
  const employerTotal = sum("pfEmployer") + sum("esicEmployer")

  if (loading) return <PageLoader label="Loading PF & ESIC report" fullScreen />

  return <ReportPage title="PF & ESIC Report" description="Monthly employee deductions, employer contributions, UAN aur ESIC IP details.">
    <Filters month={month} setMonth={setMonth} siteId={siteId} setSiteId={setSiteId} sites={sites}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search labour, UAN or ESIC IP..." className="h-10 min-w-56 flex-1 rounded-md border border-slate-300 px-3 text-sm" />
      <select value={scheme} onChange={(event) => setScheme(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="ALL">PF & ESIC</option><option value="PF">PF Only</option><option value="ESIC">ESIC Only</option></select>
      <ReportActions title="PF & ESIC Report" fileName={`PF_ESIC_Report_${month}`} tableId="pf-esic-report-table" />
    </Filters>

    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <Stat label="Covered Labours" value={rows.length} hint="Selected filters" />
      <Stat label="PF Wage" value={money.format(sum("pfWage"))} tone="text-indigo-700" />
      <Stat label="Employee PF" value={money.format(sum("pfEmployee"))} tone="text-blue-700" />
      <Stat label="Employer PF" value={money.format(sum("pfEmployer"))} tone="text-violet-700" />
      <Stat label="Employee ESIC" value={money.format(sum("esicEmployee"))} tone="text-sky-700" />
      <Stat label="Employer ESIC" value={money.format(sum("esicEmployer"))} tone="text-cyan-700" />
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-2">
      <BarChart title="Statutory Contributions" format={money.format} items={[{ label: "Employee PF", value: sum("pfEmployee"), color: "bg-indigo-500" }, { label: "Employer PF", value: sum("pfEmployer"), color: "bg-violet-500" }, { label: "Employee ESIC", value: sum("esicEmployee"), color: "bg-sky-500" }, { label: "Employer ESIC", value: sum("esicEmployer"), color: "bg-cyan-500" }]} />
      <DonutChart title="Employee vs Employer" format={money.format} items={[{ label: "Employee deductions", value: employeeTotal, color: "#4f46e5" }, { label: "Employer contributions", value: employerTotal, color: "#0891b2" }]} />
    </section>

    <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table id="pf-esic-report-table" className="w-full min-w-[1450px] border-collapse text-left"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{["Labour","Site","PF UAN","PF Wage","Employee PF","Employer PF","Total PF","ESIC IP","ESIC Wage","Employee ESIC","Employer ESIC","Total ESIC","Total Contribution"].map((heading) => <th key={heading} className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3">{heading}</th>)}</tr></thead><tbody>{rows.map((salary) => { const labour = labourMap.get(salary.labourId); const totalPf = Number(salary.pfEmployee || 0) + Number(salary.pfEmployer || 0); const totalEsic = Number(salary.esicEmployee || 0) + Number(salary.esicEmployer || 0); return <tr key={salary.labourId} className="hover:bg-slate-50"><td className="border-b px-4 py-3"><strong className="block text-xs">{salary.name}</strong><span className="text-[9px] text-slate-400">{labour?.labourCode || salary.mobile}</span></td><td className="border-b px-4 text-xs">{labour?.site?.siteName || "No site"}</td><td className="border-b px-4 text-xs font-semibold text-indigo-700">{labour?.isPFApplicable ? labour.pfUanNumber || "Not entered" : "N/A"}</td><td className="border-b px-4 text-xs font-semibold">{money.format(salary.pfWage || 0)}</td><td className="border-b px-4 text-xs font-semibold">{money.format(salary.pfEmployee || 0)}</td><td className="border-b px-4 text-xs font-semibold">{money.format(salary.pfEmployer || 0)}</td><td className="border-b px-4 text-xs font-bold text-violet-700">{money.format(totalPf)}</td><td className="border-b px-4 text-xs font-semibold text-sky-700">{labour?.isESICApplicable ? labour.esicIpNumber || "Not entered" : "N/A"}</td><td className="border-b px-4 text-xs font-semibold">{money.format(salary.esicWage ?? salary.grossSalary ?? 0)}</td><td className="border-b px-4 text-xs font-semibold">{money.format(salary.esicEmployee || 0)}</td><td className="border-b px-4 text-xs font-semibold">{money.format(salary.esicEmployer || 0)}</td><td className="border-b px-4 text-xs font-bold text-cyan-700">{money.format(totalEsic)}</td><td className="border-b px-4 text-xs font-bold text-emerald-700">{money.format(totalPf + totalEsic)}</td></tr> })}</tbody></table></div>{!rows.length && <div className="p-12 text-center text-sm text-slate-500">Selected filters ke liye PF/ESIC records nahi mile.</div>}</section>
    <p className="mt-3 text-right text-xs text-slate-400">Total ESIC wage: {money.format(esicWage)} · Total statutory contribution: {money.format(employeeTotal + employerTotal)}</p>
  </ReportPage>
}
