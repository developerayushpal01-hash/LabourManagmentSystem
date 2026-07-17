"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useToast } from "@/app/components/toast-provider"
import { apiUrl } from "@/lib/api"

type DashboardData = {
  totalLabour: number
  activeLabour: number
  activeSites: number
  todayPresent: number
  todayAbsent: number
  todayHalfDay: number
  monthlyPayable: number
  advance: number
  bonus: number
  incentive: number
  deduction: number
  salaryPaid: number
  pendingSalary: number
}

type NamedValue = { name: string; value: number }
type SalaryPoint = {
  month: string
  netSalary: number
  paidSalary: number
  pendingSalary: number
}
type SiteLabourPoint = { siteName: string; labourCount: number }
type ApiResponse<T> = { success: boolean; data?: T; message?: string }

type StatCardProps = {
  title: string
  value: string
  subtitle: string
  icon: string
  accent: string
  badge?: string
  progress?: number
}

const numberFormatter = new Intl.NumberFormat("en-IN")
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})
const compactCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
})

const CHART_COLORS = ["bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-sky-500", "bg-violet-500"]

async function fetchDashboardApi<T>(endpoint: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(endpoint), { credentials: "include", signal })
  const result = (await response.json()) as ApiResponse<T>
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Dashboard data could not be loaded.")
  }
  return result.data
}

const StatCard = ({ title, value, subtitle, icon, accent, badge, progress }: StatCardProps) => (
  <article className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    {badge && <span className="absolute right-4 top-4 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{badge}</span>}
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
      <Image src={icon} alt="" width={23} height={23} className="h-[23px] w-[23px] object-contain" />
    </div>
    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    {typeof progress === "number" && (
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    )}
  </article>
)

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="font-bold text-slate-900">{title}</h2>
    <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    <div className="mt-5">{children}</div>
  </article>
)

const EmptyChart = ({ message = "No data available." }: { message?: string }) => (
  <div className="flex min-h-36 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500">{message}</div>
)

const NamedValueChart = ({ data, currency = false }: { data: NamedValue[]; currency?: boolean }) => {
  const max = Math.max(...data.map((item) => item.value), 1)
  if (!data.some((item) => item.value > 0)) return <EmptyChart />

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">{item.name}</span>
            <span className="font-bold text-slate-900">{currency ? currencyFormatter.format(item.value) : numberFormatter.format(item.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${CHART_COLORS[index % CHART_COLORS.length]}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ContractorDashboard() {
  const { showToast } = useToast()
  const now = useMemo(() => new Date(), [])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [attendance, setAttendance] = useState<NamedValue[]>([])
  const [salary, setSalary] = useState<SalaryPoint[]>([])
  const [payments, setPayments] = useState<NamedValue[]>([])
  const [siteLabour, setSiteLabour] = useState<SiteLabourPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [overviewError, setOverviewError] = useState("")
  const [partialErrors, setPartialErrors] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()

    const loadDashboard = async () => {
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const requests = await Promise.allSettled([
        fetchDashboardApi<DashboardData>("/dashboard/contractor", controller.signal),
        fetchDashboardApi<NamedValue[]>("/dashboard/attendance-chart", controller.signal),
        fetchDashboardApi<SalaryPoint[]>(`/dashboard/salary-chart?year=${year}`, controller.signal),
        fetchDashboardApi<NamedValue[]>(`/dashboard/payment-chart?month=${month}&year=${year}`, controller.signal),
        fetchDashboardApi<SiteLabourPoint[]>("/dashboard/site-labour-chart", controller.signal),
      ])

      if (controller.signal.aborted) return

      const [overviewResult, attendanceResult, salaryResult, paymentResult, siteResult] = requests
      const errors: string[] = []

      if (overviewResult.status === "fulfilled") setDashboard(overviewResult.value)
      else {
        const message = overviewResult.reason instanceof Error ? overviewResult.reason.message : "Dashboard overview could not be loaded."
        setOverviewError(message)
        showToast(message, "error")
      }

      if (attendanceResult.status === "fulfilled") setAttendance(attendanceResult.value)
      else errors.push("attendance")

      if (salaryResult.status === "fulfilled") setSalary(salaryResult.value)
      else errors.push("salary")

      if (paymentResult.status === "fulfilled") setPayments(paymentResult.value)
      else errors.push("payments")

      if (siteResult.status === "fulfilled") setSiteLabour(siteResult.value)
      else errors.push("site labour")

      setPartialErrors(errors)
      setLoading(false)
    }

    void loadDashboard()
    return () => controller.abort()
  }, [now, showToast])

  const attendanceTotal = dashboard
    ? dashboard.todayPresent + dashboard.todayAbsent + dashboard.todayHalfDay
    : 0
  const attendanceRate = attendanceTotal && dashboard
    ? Math.round((dashboard.todayPresent / attendanceTotal) * 100)
    : 0
  const salaryMax = Math.max(...salary.flatMap((item) => [item.netSalary, item.paidSalary, item.pendingSalary]), 1)
  const siteData = siteLabour.map((item) => ({ name: item.siteName, value: item.labourCount }))

  return (
    <div className="px-1 py-1 sm:px-2">
      <header className="mb-6">
        <p className="text-xs text-slate-500">Dashboard / <span className="font-semibold text-indigo-600">Overview</span></p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Company Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Live workforce, attendance, payroll, payments and site distribution.</p>
      </header>

      {partialErrors.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some charts are unavailable for this account: {partialErrors.join(", ")}.
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((card) => <div key={card} className="h-48 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : dashboard ? (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Labour" value={numberFormatter.format(dashboard.totalLabour)} subtitle={`${numberFormatter.format(dashboard.activeLabour)} active personnel`} icon="/assets/users.png" accent="bg-purple-50" />
            <StatCard title="Active Sites" value={numberFormatter.format(dashboard.activeSites)} subtitle="Currently active project sites" icon="/assets/sites.png" accent="bg-blue-50" badge="Active" />
            <StatCard title="Present Today" value={numberFormatter.format(dashboard.todayPresent)} subtitle={`${dashboard.todayAbsent} absent · ${dashboard.todayHalfDay} half day`} icon="/assets/present_today.png" accent="bg-sky-50" progress={attendanceRate} />
            <StatCard title="Pending Salary" value={currencyFormatter.format(dashboard.pendingSalary)} subtitle={`Paid this month: ${currencyFormatter.format(dashboard.salaryPaid)}`} icon="/assets/payroll.png" accent="bg-pink-50" />
          </section>

          <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Monthly Payable" value={currencyFormatter.format(dashboard.monthlyPayable)} subtitle="Attendance and overtime earnings" icon="/assets/payroll.png" accent="bg-indigo-50" />
            <StatCard title="Advance" value={currencyFormatter.format(dashboard.advance)} subtitle="Advance paid this month" icon="/assets/advance.png" accent="bg-amber-50" />
            <StatCard title="Bonus & Incentive" value={currencyFormatter.format(dashboard.bonus + dashboard.incentive)} subtitle={`Bonus ${currencyFormatter.format(dashboard.bonus)} · Incentive ${currencyFormatter.format(dashboard.incentive)}`} icon="/assets/notification.png" accent="bg-emerald-50" />
            <StatCard title="Deductions" value={currencyFormatter.format(dashboard.deduction)} subtitle="Total deductions this month" icon="/assets/reports.png" accent="bg-rose-50" />
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{overviewError || "Dashboard overview could not be loaded."}</div>
      )}

      {!loading && (
        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <ChartCard title="Today's Attendance" subtitle="Live attendance status distribution">
            <NamedValueChart data={attendance} />
          </ChartCard>

          <ChartCard title="Payments This Month" subtitle={now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}>
            <NamedValueChart data={payments} currency />
          </ChartCard>

          <ChartCard title="Site-wise Labour" subtitle="Active labour assigned to each site">
            <NamedValueChart data={siteData} />
          </ChartCard>

          <ChartCard title="Yearly Salary Trend" subtitle={`Net, paid and pending salary for ${now.getFullYear()}`}>
            {salary.some((item) => item.netSalary || item.paidSalary || item.pendingSalary) ? (
              <div className="overflow-x-auto">
                <div className="min-w-[620px]">
                  <div className="mb-4 flex gap-5 text-xs text-slate-600">
                    <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500" />Net</span>
                    <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />Paid</span>
                    <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />Pending</span>
                  </div>
                  <div className="grid h-52 grid-cols-12 items-end gap-2 border-b border-slate-200">
                    {salary.map((item) => (
                      <div key={item.month} className="flex h-full flex-col justify-end">
                        <div className="flex h-[170px] items-end justify-center gap-0.5" title={`Net ${compactCurrencyFormatter.format(item.netSalary)}, Paid ${compactCurrencyFormatter.format(item.paidSalary)}, Pending ${compactCurrencyFormatter.format(item.pendingSalary)}`}>
                          <div className="w-2 rounded-t bg-indigo-500" style={{ height: `${Math.max(item.netSalary ? 3 : 0, (item.netSalary / salaryMax) * 100)}%` }} />
                          <div className="w-2 rounded-t bg-emerald-500" style={{ height: `${Math.max(item.paidSalary ? 3 : 0, (item.paidSalary / salaryMax) * 100)}%` }} />
                          <div className="w-2 rounded-t bg-amber-500" style={{ height: `${Math.max(item.pendingSalary ? 3 : 0, (item.pendingSalary / salaryMax) * 100)}%` }} />
                        </div>
                        <span className="mt-2 text-center text-[10px] text-slate-500">{item.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : <EmptyChart />}
          </ChartCard>
        </section>
      )}
    </div>
  )
}
