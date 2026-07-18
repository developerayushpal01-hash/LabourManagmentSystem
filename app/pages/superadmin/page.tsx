"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import PageLoader from "@/app/components/page-loader"
import { money, superAdminApi } from "@/lib/super-admin"

type Dashboard = { companies: { total: number; active: number; inactive: number; blocked: number }; users: number; labours: number; sites: number; currentMonth: { attendance: number; payments: { count: number; amount: number }; invoices: { billed: number; received: number; outstanding: number } } }

const Card = ({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: string }) => <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className={`h-1 ${tone}`} /><div className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 text-3xl font-black text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{hint}</p></div></article>

export default function SuperAdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { superAdminApi<Dashboard>("/dashboard").then((r) => setData(r.data)).catch((e) => setError(e.message)) }, [])
  if (!data && !error) return <PageLoader label="Loading platform dashboard" />
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>
  if (!data) return null
  const cards = [
    ["Companies", data.companies.total, `${data.companies.active} active companies`, "bg-violet-600"],
    ["Platform Users", data.users, "Contractors, supervisors & accountants", "bg-indigo-600"],
    ["Labours", data.labours, "Across every company", "bg-sky-500"],
    ["Sites", data.sites, "All registered project sites", "bg-emerald-500"],
  ] as const
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-violet-600">Overview</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Platform Dashboard</h1><p className="mt-2 text-sm text-slate-500">Live cross-company totals and current month financial activity.</p></div><Link href="/pages/superadmin/companies" className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700">+ Add Company</Link></div>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, hint, tone]) => <Card key={label} label={label} value={value} hint={hint} tone={tone} />)}</section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.5fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-bold text-slate-900">Company Health</h2><div className="mt-5 space-y-4">{[["Active", data.companies.active, "bg-emerald-500"], ["Inactive", data.companies.inactive, "bg-amber-500"], ["Blocked", data.companies.blocked, "bg-red-500"]].map(([label, value, color]) => <div key={String(label)}><div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><strong>{value}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${color}`} style={{ width: `${data.companies.total ? (Number(value) / data.companies.total) * 100 : 0}%` }} /></div></div>)}</div></article>
      <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white shadow-sm"><p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Current Month</p><h2 className="mt-2 text-xl font-bold">Platform Activity</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Attendance", data.currentMonth.attendance], ["Payments", money(data.currentMonth.payments.amount)], ["Billed", money(data.currentMonth.invoices.billed)], ["Outstanding", money(data.currentMonth.invoices.outstanding)]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">{label}</p><strong className="mt-2 block text-xl">{value}</strong></div>)}</div></article>
    </section>
  </div>
}
