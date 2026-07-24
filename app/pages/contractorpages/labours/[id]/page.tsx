"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import Navbar from "@/app/components/navbar"
import Sidebar from "@/app/components/sidebar"
import { useToast } from "@/app/components/toast-provider"
import { API_BASE_URL, apiUrl } from "@/lib/api"
import PageLoader from "@/app/components/page-loader"

type Site = { _id: string; siteName: string; siteCode?: string; location?: string }
type Labour = { _id:string; companyId?:{companyName?:string;companyCode?:string;logoUrl?:string|null}|null; labourCode:string; qrCode?:string|null; photoUrl?:string|null; name:string; mobile:string; gender:string; dob?:string|null; address?:string; aadhaarNumber?:string|null; panNumber?:string|null; bankAccountNumber?:string|null; ifscCode?:string|null; emergencyContact?:{name?:string;relation?:string;mobile?:string}; joiningDate?:string|null; resignationDate?:string|null; dailyWage?:number|null; finalDailyWage:number; isPFApplicable?:boolean; pfUanNumber?:string|null; isESICApplicable?:boolean; esicIpNumber?:string|null; status:string; skillId:{skillName:string}|null; site:Site|null; createdAt:string }
type Attendance = { labourId: string | { _id: string }; status: string; wageAtThatDay: number; overtimeAmount?: number }
type Payment = { amount: number; paymentType: string; month: number; year: number }
type Api<T> = { success: boolean; data?: T; message?: string }
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" })
const backendOrigin = API_BASE_URL.replace(/\/api$/, "")

export default function LabourDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [labour, setLabour] = useState<Labour | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [isDownloadingCard, setIsDownloadingCard] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const now = new Date()
    Promise.all([
      fetch(apiUrl("/labours/get-labour/" + id), { credentials: "include", signal: controller.signal }),
      fetch(apiUrl("/attendance/monthly?month=" + (now.getMonth() + 1) + "&year=" + now.getFullYear()), { credentials: "include", signal: controller.signal }),
      fetch(apiUrl("/labour-payments/labour/" + id), { credentials: "include", signal: controller.signal }),
    ]).then(async ([labourResponse, attendanceResponse, paymentResponse]) => {
      const labourResult = await labourResponse.json() as Api<Labour>
      const attendanceResult = await attendanceResponse.json() as Api<Attendance[]>
      const paymentResult = await paymentResponse.json() as Api<Payment[]>
      if (!labourResponse.ok || !labourResult.success || !labourResult.data) throw new Error(labourResult.message || "Labour details could not be loaded.")
      setLabour(labourResult.data)
      setAttendance((attendanceResult.data || []).filter((entry) => (typeof entry.labourId === "string" ? entry.labourId : entry.labourId?._id) === id))
      setPayments(paymentResult.data || [])
    }).catch((error) => { if (error.name !== "AbortError") showToast(error.message, "error") }).finally(() => setLoading(false))
    return () => controller.abort()
  }, [id, showToast])
  const present = attendance.filter((entry) => entry.status === "PRESENT").length
  const half = attendance.filter((entry) => entry.status === "HALF_DAY").length
  const rate = attendance.length ? Math.round(((present + half * 0.5) / attendance.length) * 100) : 0
  const currentDate = new Date()
  const currentPayments = payments.filter((item) => item.month === currentDate.getMonth() + 1 && item.year === currentDate.getFullYear())
  const earnings = currentPayments.filter((item) => item.paymentType !== "ADVANCE" && item.paymentType !== "DEDUCTION").reduce((sum, item) => sum + item.amount, 0)
  const advances = currentPayments.filter((item) => item.paymentType === "ADVANCE").reduce((sum, item) => sum + item.amount, 0)

  const downloadIdCard = async () => {
    const card = document.getElementById("labour-id-card")
    if (!card || !labour) return
    setIsDownloadingCard(true)
    try {
      const pdfModule = await import("html2pdf.js")
      await pdfModule.default().set({
        margin: 0,
        filename: `${labour.labourCode}-${labour.name.replace(/\s+/g, "-")}-ID-Card.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: [86, 54], orientation: "landscape" },
      }).from(card).save()
      showToast("Labour ID card downloaded successfully.", "success")
    } catch (error) {
      console.error("ID card download failed", error)
      showToast("ID card could not be downloaded.", "error")
    } finally {
      setIsDownloadingCard(false)
    }
  }

  return <div className="flex min-h-screen bg-[#f7f8fc]"><Sidebar /><div className="min-w-0 flex-1"><Navbar /><main className="mx-auto max-w-6xl p-5 lg:p-7">
    {loading ? <PageLoader label="Loading labour details" /> : !labour ? <div className="rounded-lg border bg-white p-16 text-center text-sm text-slate-500">Labour not found.</div> : <>
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs text-slate-500">Labours / <span className="text-indigo-600">Labour Details</span></p><div className="mt-2 flex items-baseline gap-2"><h1 className="text-2xl font-bold text-slate-950">{labour.name}</h1><span className="text-xs text-slate-400">#{labour.labourCode}</span></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={downloadIdCard} disabled={isDownloadingCard} className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{isDownloadingCard ? "Preparing Card..." : "Download ID Card"}</button><Link href="/pages/contractorpages/labours" className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-600">Back</Link><Link href={"/pages/contractorpages/labours/" + id + "/edit"} className="rounded-md bg-indigo-700 px-5 py-2 text-sm font-semibold text-white">Edit Profile</Link></div></header>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="mx-auto h-24 w-24 overflow-hidden rounded-lg bg-gradient-to-br from-indigo-600 to-sky-400">{labour.photoUrl ? <img src={`${backendOrigin}${labour.photoUrl}`} alt={labour.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-bold text-white">{labour.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase()}</div>}</div><h2 className="mt-3 text-center font-bold">{labour.name}</h2><div className="mt-2 text-center"><span className="rounded-full bg-emerald-100 px-3 py-1 text-[9px] font-bold text-emerald-700">{labour.status}</span></div><dl className="mt-5 divide-y text-xs"><div className="flex justify-between py-3"><dt className="text-slate-400">Joining Date</dt><dd className="font-semibold">{date.format(new Date(labour.joiningDate || labour.createdAt))}</dd></div><div className="flex justify-between py-3"><dt className="text-slate-400">Skill</dt><dd className="font-semibold text-indigo-600">{labour.skillId?.skillName || "-"}</dd></div><div className="flex justify-between gap-3 py-3"><dt className="text-slate-400">Current Site</dt><dd className="text-right font-semibold">{labour.site?.siteName || "Not assigned"}</dd></div></dl></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><h2 className="border-b border-slate-100 pb-4 text-sm font-bold">Worker Information</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="text-[10px] uppercase text-slate-400">Mobile</p><p className="mt-2 text-sm font-semibold">{labour.mobile}</p></div><div><p className="text-[10px] uppercase text-slate-400">Gender</p><p className="mt-2 text-sm font-semibold">{labour.gender}</p></div><div><p className="text-[10px] uppercase text-slate-400">Daily Wage</p><p className="mt-2 text-lg font-bold text-indigo-700">{money.format(labour.finalDailyWage || 0)}</p></div><div><p className="text-[10px] uppercase text-slate-400">Wage Type</p><p className="mt-2 text-sm font-semibold">{labour.dailyWage == null ? "SKILL BASED" : "CUSTOM"}</p></div><div className="sm:col-span-2"><p className="text-[10px] uppercase text-slate-400">Address</p><p className="mt-2 rounded-md bg-slate-50 p-4 text-sm">{labour.address || "Address not added"}</p></div><div className="sm:col-span-2"><p className="text-[10px] uppercase text-slate-400">Work Location</p><p className="mt-2 rounded-md bg-slate-50 p-4 text-sm">{labour.site?.location || "Site location not available"}</p></div></div></section>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Labour ID Card</h2><p className="mt-1 text-xs text-slate-500">Print-ready 86 × 54 mm card with scannable QR.</p></div><button type="button" onClick={downloadIdCard} disabled={isDownloadingCard} className="rounded-md bg-indigo-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isDownloadingCard ? "Preparing..." : "Download PDF"}</button></div><div className="overflow-x-auto rounded-xl bg-slate-100 p-4"><div id="labour-id-card" className="relative h-[340px] w-[540px] overflow-hidden bg-white text-slate-900 shadow-xl"><div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-[#111b46] via-indigo-800 to-violet-700"/><div className="absolute -right-16 -top-20 h-52 w-52 rounded-full border-[28px] border-white/10"/><div className="relative flex h-20 items-center justify-between px-6 text-white"><div className="flex items-center gap-3">{labour.companyId?.logoUrl ? <img crossOrigin="anonymous" src={`${backendOrigin}${labour.companyId.logoUrl}`} alt="Company logo" className="h-11 w-11 rounded-xl bg-white object-contain p-1" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-black text-indigo-800">{(labour.companyId?.companyName || "KL").split(/\s+/).map(word=>word[0]).slice(0,2).join("").toUpperCase()}</div>}<div><strong className="block max-w-[285px] truncate text-xl tracking-tight">{labour.companyId?.companyName || "Kinetic LMS"}</strong><span className="text-[9px] uppercase tracking-[.18em] text-indigo-100">Labour Identity Card</span></div></div><span className={`rounded-full border px-3 py-1 text-[9px] font-bold ${labour.status === "ACTIVE" ? "border-emerald-300 bg-emerald-400/20 text-emerald-100" : "border-amber-300 bg-amber-400/20 text-amber-100"}`}>{labour.status}</span></div><div className="relative grid grid-cols-[125px_1fr_105px] gap-4 px-6 pt-6"><div>{labour.photoUrl ? <img crossOrigin="anonymous" src={`${backendOrigin}${labour.photoUrl}`} alt={labour.name} className="h-36 w-28 rounded-xl border-4 border-white object-cover shadow-lg ring-1 ring-slate-200"/> : <div className="flex h-36 w-28 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-3xl font-black text-white shadow-lg">{labour.name.split(/\s+/).map(word=>word[0]).slice(0,2).join("").toUpperCase()}</div>}<p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">Employee Photo</p></div><div className="pt-1"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-indigo-600">Employee</p><h3 className="mt-1 max-w-[220px] truncate text-2xl font-black tracking-tight text-slate-950">{labour.name}</h3><p className="mt-1 text-sm font-bold text-indigo-700">{labour.labourCode}</p><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[10px]"><div><dt className="uppercase text-slate-400">Skill</dt><dd className="mt-0.5 truncate font-bold text-slate-700">{labour.skillId?.skillName||"-"}</dd></div><div><dt className="uppercase text-slate-400">Mobile</dt><dd className="mt-0.5 font-bold text-slate-700">{labour.mobile}</dd></div><div><dt className="uppercase text-slate-400">Joining</dt><dd className="mt-0.5 font-bold text-slate-700">{date.format(new Date(labour.joiningDate||labour.createdAt))}</dd></div><div><dt className="uppercase text-slate-400">Site</dt><dd className="mt-0.5 truncate font-bold text-slate-700">{labour.site?.siteName||"Unassigned"}</dd></div></dl></div><div className="pt-1 text-center">{labour.qrCode ? <img src={labour.qrCode} alt="Employee QR" className="mx-auto h-24 w-24 rounded-lg border bg-white p-1"/> : <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-[9px]">No QR</div>}<p className="mt-2 text-[8px] font-bold uppercase tracking-wider text-slate-400">Scan to verify</p></div></div><div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-between bg-slate-950 px-6 text-white"><span className="text-[9px] text-slate-300">This card is the property of {labour.companyId?.companyName || "Kinetic LMS"}.</span><span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300">Authorized Personnel</span></div></div></div></section>        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3"><h2 className="border-b border-slate-100 pb-4 text-sm font-bold">Employee Identity & QR Code</h2><div className="mt-4 grid gap-5 sm:grid-cols-[160px_1fr]">{labour.qrCode ? <img src={labour.qrCode} alt={`QR code for ${labour.labourCode}`} className="h-36 w-36 rounded-md border p-2" /> : <div className="flex h-36 w-36 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">QR unavailable</div>}<dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[10px] uppercase text-slate-400">Employee Code</dt><dd className="mt-1 font-bold text-indigo-700">{labour.labourCode}</dd></div><div><dt className="text-[10px] uppercase text-slate-400">Skill</dt><dd className="mt-1 font-semibold">{labour.skillId?.skillName || "-"}</dd></div><div><dt className="text-[10px] uppercase text-slate-400">Aadhaar</dt><dd className="mt-1 font-semibold">{labour.aadhaarNumber || "-"}</dd></div><div><dt className="text-[10px] uppercase text-slate-400">PAN</dt><dd className="mt-1 font-semibold">{labour.panNumber || "-"}</dd></div><div><dt className="text-[10px] uppercase text-slate-400">Date of Birth</dt><dd className="mt-1 font-semibold">{labour.dob ? date.format(new Date(labour.dob)) : "-"}</dd></div><div><dt className="text-[10px] uppercase text-slate-400">Resignation Date</dt><dd className="mt-1 font-semibold">{labour.resignationDate ? date.format(new Date(labour.resignationDate)) : "-"}</dd></div></dl></div></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3"><h2 className="border-b border-slate-100 pb-4 text-sm font-bold">Bank & Emergency Contact</h2><dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-[10px] uppercase text-slate-400">Bank Account</dt><dd className="mt-1 font-semibold">{labour.bankAccountNumber || "-"}</dd></div><div><dt className="text-[10px] uppercase text-slate-400">IFSC</dt><dd className="mt-1 font-semibold">{labour.ifscCode || "-"}</dd></div><div><dt className="text-[10px] uppercase text-slate-400">Emergency Contact</dt><dd className="mt-1 font-semibold">{labour.emergencyContact?.name || "-"} {labour.emergencyContact?.relation ? `(${labour.emergencyContact.relation})` : ""}</dd></div><div><dt className="text-[10px] uppercase text-slate-400">Emergency Mobile</dt><dd className="mt-1 font-semibold">{labour.emergencyContact?.mobile || "-"}</dd></div></dl></section>        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3"><h2 className="border-b border-slate-100 pb-4 text-sm font-bold">Statutory Details</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className={`rounded-lg border p-4 ${labour.isPFApplicable && labour.pfUanNumber ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"}`}><p className="text-[10px] font-bold uppercase text-slate-400">Provident Fund (PF)</p><strong className={`mt-2 block text-sm ${labour.isPFApplicable && labour.pfUanNumber ? "text-indigo-700" : "text-slate-500"}`}>{labour.isPFApplicable && labour.pfUanNumber ? "Applicable" : "Not Applicable"}</strong><span className="mt-1 block text-xs text-slate-600">UAN: {labour.pfUanNumber || "-"}</span></div><div className={`rounded-lg border p-4 ${labour.isESICApplicable && labour.esicIpNumber ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-slate-50"}`}><p className="text-[10px] font-bold uppercase text-slate-400">ESIC</p><strong className={`mt-2 block text-sm ${labour.isESICApplicable && labour.esicIpNumber ? "text-sky-700" : "text-slate-500"}`}>{labour.isESICApplicable && labour.esicIpNumber ? "Applicable" : "Not Applicable"}</strong><span className="mt-1 block text-xs text-slate-600">IP Number: {labour.esicIpNumber || "-"}</span></div></div></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] uppercase text-slate-400">Attendance This Month</p><strong className="mt-3 block text-3xl text-emerald-600">{rate}%</strong><p className="mt-2 text-xs text-slate-500">{present} present records</p></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] uppercase text-slate-400">Earnings This Month</p><strong className="mt-3 block text-2xl text-indigo-700">{money.format(earnings)}</strong><p className="mt-2 text-xs text-slate-500">Live payment API data</p></section>
        <section className="rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-sm"><p className="text-[10px] uppercase text-indigo-100">Advance This Month</p><strong className="mt-3 block text-2xl">{money.format(advances)}</strong><p className="mt-2 text-xs text-indigo-100">{currentPayments.filter((item) => item.paymentType === "ADVANCE").length} entries</p></section>
      </div>
    </>}
  </main></div></div>
}





